# Demo Script — ml9-1

**Total time: ~4 minutes**

**Slide 1: Title (0:00–0:15)**
Open on the title slide. One sentence: "We built the arcade's missing attract screen — the one that shows off the cast and the price of admission."

**Slide 2: Problem (0:15–0:45)**
State the problem plainly: the cabinet's idle-mode loop only ever showed the self-playing demo. The screen that names all 10 bugs, shows the high-score table, and prints "1 COIN 1 PLAY" was completely absent — never built, not a bug in existing code.

**Slide 3: What We Built (0:45–2:15)**
Live demo. In a terminal, run:
```
just serve
```
Wait for the server to report it's listening on `http://127.0.0.1:5270/`. Open a browser to:
```
http://127.0.0.1:5270/millipede/
```
Let the page sit idle without touching it — the self-playing demo will run first. After roughly 15–20 seconds it will switch to the new showcase screen. Point out on screen, in order: the solid blue background, the "HIGH SCORES" table with all 8 rows (top row `89175 BBM`), all 10 creature name labels (call out DDT BOMB, MILLIPEDE, and GROWTH by name), and the footer reading "1 COIN 1 PLAY," "BONUS EVERY 15000," "COPYRIGHT ATARI 1982."

*Fallback:* if the idle timing doesn't cooperate live, switch to Slide 3a and show the saved reference capture at `sprint/planning/ml9-playthrough-refs/ml9-1-ours-showcase.png` side-by-side with the original-cabinet reference `sprint/planning/ml9-playthrough-refs/attract-mame-reference.png` — they should look structurally identical (content and layout match; only the text color is a known, separately-tracked follow-up).

**Slide 4: Why This Approach (2:15–3:00)**
Explain the "trust the original data, not the label someone typed" story: the 44-year-old source code had a comment that misspelled "GROWTH" as "GROWTHS," but the actual game data — and the real screenshot — said "GROWTH." Building against the real bytes instead of the comment avoided shipping a wrong label.

**Slide (Before/After) (3:00–3:30)**
Before: idle cabinet shows only the self-playing demo, forever. After: idle cabinet alternates demo → showcase screen → demo, matching the original 1982 cabinet's behavior.

**Slide: Roadmap (3:30–3:50)**
One line: colors (white scores / red names, matching the original exactly) are next, tracked as a follow-up to the existing color-fidelity work already underway for this game.

**Slide: Questions (3:50–4:00)**
Open floor.
