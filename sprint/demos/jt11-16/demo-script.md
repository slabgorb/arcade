# Demo Script — jt11-16

**Total time: ~3 minutes**

- **Slide 1: Title (0:00–0:15)** — Open on the title slide. One-liner: "Fixing Joust's broken boot sequence — the title screen is back."

- **Slide 2: Problem (0:15–0:45)** — Walk through the problem statement above. Say plainly: "If you turned on this Joust cabinet yesterday, you'd see the game playing itself immediately — no logo, no copyright screen, nothing to tell you what game you're even looking at." Show the "before" behavior if you have a recording; otherwise describe it.

- **Slide 3: What We Built (0:45–1:15)** — Explain the fix in plain terms (per "What Changed" above): "We flipped one switch so the cabinet shows its title card first, waits about 18 and a half seconds — matching the original 1982 machine exactly — then moves on to the demo."

- **Live Demo (1:15–2:30) — references Slide 3:**
  1. In terminal, from the repo root, run:
     ```
     just serve
     ```
  2. Open a browser to `http://127.0.0.1:5270/joust/`
  3. **Point out immediately:** the screen should show the vector-drawn JOUST wordmark and the text "(C) 1982 WILLIAMS ELECTRONICS INC." with the color cycling — this is the fix. Narrate: "This title screen is what a real Joust cabinet shows the instant you power it on."
  4. Let it sit for a few seconds to show the color-cycling effect, then either:
     - Press the **Start** key to show it jumps straight into game setup (proving the "skip" path still works), **or**
     - Wait out the ~18.5 second dwell to show it auto-transitions into the self-play attract demo (the screen you'd have seen immediately before this fix).
  5. **Fallback if `just serve` fails or the browser doesn't load:** skip to **Slide 6 (Before/After)** and show the static before/after screenshots instead — do not troubleshoot the dev server live.

- **Slide 4: Why This Approach (2:30–2:50)** — One line: "The title screen already existed in the code — it just wasn't switched on. This was a one-setting fix, not a rebuild, which is why it was low-risk and shipped fast."

- **Slide 6: Before/After (2:50–3:00, optional if time allows)** — Side-by-side screenshot: "Before" (demo plays immediately on load) vs. "After" (JOUST title card shown first, then demo).

- **Roadmap (if time allows)** — One line, see Roadmap section below.

- **Questions** — Open floor.
