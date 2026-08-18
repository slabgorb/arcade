# Demo Script — ml13-3

**Total run time: ~4 minutes.** This is a live-browser demo with one fallback path if the dev server is unavailable.

---

**Scene 1 — 0:00–0:20 (Slide 1: Title)**
Open on the title slide. One line: *"Closing the loop: DDT bomb verified safe, live."* No action needed — just framing while the audience settles.

**Scene 2 — 0:20–1:00 (Slide 2: Problem)**
Talk through the problem statement above. Key line to say out loud: *"We had proof this worked in the test suite. We didn't have proof it worked on a screen a real player would see — and specifically, proof it doesn't flash."*

**Scene 3 — 1:00–2:30 (Slide 3: What We Built) — LIVE DEMO**
Switch to terminal and browser.

1. In the terminal, from the repo root, run:
   ```
   just serve
   ```
2. Before trusting the screen, confirm *your* checkout is actually the one answering the dev port (a known risk when multiple project checkouts share a machine):
   ```
   lsof -ti tcp:5270 | head -1
   ```
   then confirm that PID's working directory matches this checkout.
3. Open a browser to:
   ```
   http://127.0.0.1:5270/millipede/
   ```
4. Play until a DDT bomb is deployed and the enemy segment train drives into its blast radius. Narrate what the audience should watch for: *"Watch the train — it should die right here in the blast, and the background should stay black the whole time."*
5. Point out the exact result recorded during the real check: the whole train died on contact with the exploding cloud, and the screen background stayed black throughout — no full-screen flash at any point.

**Fallback if the live demo fails (port conflict, server won't start, etc.):** Skip straight to **Slide 3a (Before/After)** and show the two pieces of recorded evidence instead: the written observation ("owner drove the train into an exploding DDT; the whole train died, no flash") and the four full-canvas draw calls in the game's render code, each of which is either a plain black clear or a static background — none of them reacts to the bomb going off.

**Scene 4 — 2:30–3:10 (Slide 4: Why This Approach)**
Explain the "two independent checks" reasoning from above: live play plus a line-by-line read of every place the screen gets redrawn. Key line: *"We didn't just watch it once and call it done — we also traced the code to make sure there's no hidden flash path we didn't happen to trigger."*

**Scene 5 — 3:10–3:35 (Before/After slide)**
Before: an open safety commitment with no visual evidence behind it. After: owner-confirmed live kill, zero full-screen-flash draw calls found anywhere in the render path, full test suite still green (1,488 of 1,488 Millipede tests, 505 of 505 orchestrator tests, zero lint errors) — meaning nothing else was disturbed to get this evidence.

**Scene 6 — 3:35–3:50 (Roadmap)**
See below.

**Scene 7 — 3:50–4:00 (Questions)**
Open floor.
