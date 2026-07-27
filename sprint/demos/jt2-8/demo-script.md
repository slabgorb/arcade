**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:20)**
Open on the title slide ("Fixing the Rule Book: OSTBO Prose Correction — jt2-8"). One line: "A documentation-only fix that keeps our fidelity dossier honest with the game it describes."

**Scene 2 — Slide 2: Problem (0:20–1:00)**
State the problem plainly: our internal "rule book" for how two jousting knights collide said something the original 1982 game doesn't actually do. Show the specific wrong sentence on screen as a quote: *"fraction included"* vs. what the machine's code actually does: compares whole pixel positions only. Emphasize this was already caught twice by independent review before this story existed.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Live terminal demo. Run:
```
git -C /Users/slabgorb/Projects/a-3/joust log --oneline -3 chore/jt2-8-rom-prose-corrections
```
to show the two correction commits. Then show the corrected paragraph directly:
```
sed -n '137,141p' /Users/slabgorb/Projects/a-3/joust/docs/rom-study/subsystems.md
```
Read the corrected line aloud: *"compare `(PLANTZ + PPOSY)` on whole pixels, the fraction EXCLUDED... strictly lower wins, exact tie = both bounce."* Point out the specific citation to the original 1982 source code line numbers sitting right next to the claim — that's how every sentence in this dossier is held accountable.
**Fallback:** if the terminal isn't cooperating, skip straight to the Before/After slide and read the two versions side by side.

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
Explain: the game itself was already correct — proven by an automated test suite. Run:
```
cd /Users/slabgorb/Projects/a-3/joust && npm test
```
and call out the final line, all 1,551 tests passing across 63 files. The message: we fixed the description, not the game, because the game was never broken — only the notes about it were.
**Fallback:** if the live test run is slow or flaky in the room, show a screenshot of the last known-good run instead (1551/1551 passing) rather than waiting live.

**Scene 5 — Before/After slide (3:00–3:30)**
Walk through the Before/After comparison slide (below). Highlight the one detail that matters most to a technical reviewer but is easy for anyone to grasp: "included" became "excluded" — a one-word flip that determines whether a tie in a jousting match is decided by a hidden fraction or not.

**Scene 6 — Roadmap slide (3:30–3:50)**
One sentence: this keeps the "Joust" fidelity dossier trustworthy for every story built on top of it going forward.

**Scene 7 — Questions (3:50–4:00)**
Open the floor.