# Demo Script — SH4-6

Because this story hardens an internal testing tool rather than changing anything players see, the "demo" is a terminal walkthrough proving the guard now catches what it used to miss. Total runtime: ~4 minutes.

**Slide 1: Title (0:00–0:20)**
Say: "Today's story is a guardrail hardening — no player-facing change, but it closes two ways our sound-code safety checker could be quietly fooled."

**Slide 2: Problem (0:20–1:00)**
Say: "Our seven games each have their own audio dispatcher. Last sprint we built an automated checker to make sure they all follow the same safe pattern. This sprint's review found the checker could be dodged two ways: renaming an import, or moving a safety check to the wrong spot in the code."
No terminal action yet — stay on the slide.

**Slide 3: What We Built (1:00–2:30)**
Switch to the terminal for the live portion.
1. Run the full guard suite and show it green:
   ```
   node --test tests/audio-dispatch-convention.test.mjs
   ```
   Point out the pass count in the output — all `SH4-5` and `SH4-6` tests, including the new `AC-5a`, `AC-5b`, `AC-5c`, `AC-6`, and `AC-7` cases, report passing.
2. Narrate the specific proof points as they scroll by:
   - `SH4-6 AC-5a: the AC-2 predicate REJECTS an aliased full engine (type Engine = AudioEngine)` — say: "This is the renamed-badge case — it's now caught."
   - `SH4-6 AC-6: the AC-3 predicate REJECTS a never binding that is not inside a switch` — say: "This is the safety-switch-in-the-wrong-place case — also now caught."
   - `SH4-6 AC-7: the real AC-2 program resolves each dispatch audio param to a narrowed Pick, not any` — say: "And this new check proves the guard is really looking at the code, not silently doing nothing."

**Fallback if the live command fails or the terminal isn't available:** Skip straight to a static screenshot of the same test output (capture ahead of time) and narrate the same three lines from the screenshot instead of live output.

**Slide 4: Why This Approach (2:30–3:15)**
Say: "We upgraded the checker from 'read the text and guess' to 'ask the compiler what this code actually resolves to.' That's the difference between checking the name on a badge and checking what it actually authorizes — a name can be forged, the underlying type can't."

**Roadmap (3:15–3:45)**
Say: "This closes out SH4-6, the last hardening follow-up from SH4-5's review. The checker itself is done — future sprint work in this epic goes back to feature work across the games, with this guardrail now running quietly in the background on every commit."

**Questions (3:45–4:00)**
Open the floor.
