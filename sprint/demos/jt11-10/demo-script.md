# Demo Script — jt11-10

**Total runtime: ~5 minutes**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Open on the title slide: "Joust Cleanup: Closing the Gaps a Code Review Found." One sentence of framing: "This is what happens after a thorough review — eight small loose ends, closed before they could compound."

**Scene 2 — Slide 2: Problem (0:20–1:15)**
Explain the core risk in plain terms: "One of our automated tests for the game's on-screen scoreboard had a blind spot. It was supposed to check a specific piece of the game's code, but the way it was written meant it would keep checking a shrinking, and eventually wrong, piece of the file as the code around it changed. It hadn't failed yet — but it was one future code change away from silently checking nothing." Show the specific mechanism: the test used to take "everything from this line to the end of the file" as its search area, which only stayed correct because a particular function happened to be the last one in the file.

**Scene 3 — Slide 3: What We Built (1:15–2:30)**
"We replaced the 'search to end of file' approach with a precise boundary." Show the concrete before/after:
- Before: the test grabbed source text using `.slice(loopStart)` — everything from the loop function's start to the literal end of the file.
- After: a new helper (`frame-loop.ts`) uses TypeScript's own code parser to find exactly where that function's closing brace is, and hands back only that function's body — nothing before, nothing after, no matter what gets added to the file later.

Live demo (optional, if time and environment allow):
```bash
npx vitest run --project joust -t "frame-loop"
```
Show it passing. If this fails to run live (e.g., environment not set up), fall back to Slide 3 and narrate the before/after code snippet already on the slide — the outcome (bounded vs. unbounded slice) is the point, not the terminal output itself.

Also mention on this slide: three test files were updated so their comments and descriptions call the scoreboard element "HUD" — its real, current name — instead of "dev bar," a name retired months ago. The actual pass/fail checks were untouched; only the English describing them was corrected.

**Scene 4 — Slide 4: Why This Approach (2:30–3:30)**
"We didn't write a new automated check for every one of the eight items — only for the two where a check could be built cheaply and proven to actually catch the problem. We wrote a failing version first, confirmed it failed for the right reason, then fixed it. For the other five — like a stray screenshot file left in the wrong folder, or a variable renamed for clarity — verifying by hand and showing the exact diff was the more honest signal, because writing a fake test for those would create a false sense of extra rigor."

**Scene 5 — Before/After (3:30–4:15)**
Show a two-column slide:
| | Before | After |
|---|---|---|
| Test boundary | Slices "loop start → end of file" | Slices "loop start → loop's actual closing brace," found by a code parser |
| Scoreboard naming in tests | Comments say "dev bar" / "dev overlay" (retired name) | Comments say "HUD" (current name); checks unchanged |
| Repo hygiene | Stray screenshot at repo root, two wrong historical source-line citations | Screenshot removed, citations point at the correct lines |

**Scene 6 — Roadmap (4:15–4:45)**
Transition to the roadmap slide (see below).

**Scene 7 — Slide: Questions (4:45–5:00)**
Open the floor.
