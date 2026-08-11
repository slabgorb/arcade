# Demo Script — pm4-11

**Total runtime: ~4 minutes**

**Slide 1: Title (0:00–0:20)**
Presenter says: "Today's update: Pac-Man's bottom status bar now looks like the real arcade cabinet — lives and level are icons, not text."

**Slide 2: Problem (0:20–0:50)**
Show a static image or the running game at level 1 with 3 lives. Point out: "Until this change, this row said 'LIVES 3' and 'LEVEL 1' in plain text — functional, but not what Pac-Man players remember."

**Slide 3: What We Built (0:50–2:30)** — live demo
Run the game locally and show the new icon-based HUD in action.

Terminal commands (run from repo root before the meeting, or live if comfortable):
```bash
just serve
```
Then open a browser to:
```
http://127.0.0.1:5270/pac-man/
```
On screen, narrate:
1. Point to the **bottom-left**: "These three small Pac-Man heads are your remaining lives — no more text label."
2. Play briefly, lose a life (or use a training key if available) so the crowd sees a life icon disappear in real time.
3. Point to the **bottom-right**: "This cherry icon shows we're on level 1. As the level advances, this becomes a strawberry, then an orange, following the exact same order the original 1980 game used."
4. Point to the **top of the screen**: "SCORE and HIGH SCORE up here are untouched — this change was scoped only to the bottom band."

**Fallback if the live demo fails:** Show `sprint/context/context-story-pm4-11.md` rendered as a doc, or a pre-recorded screenshot/GIF of the bottom HUD with lives and fruit icons visible, and narrate the same two points (lives row, fruit row) from the static image.

**Slide 4: Why This Approach (2:30–3:10)**
"We didn't draw new art for this — we reused the exact same drawing code the game already uses to render Pac-Man and the fruit bonus item during play. That's why these icons match perfectly: it's literally the same sprite, just placed in the corner."

**Roadmap (3:10–3:40)**
"This closes out the bottom HUD work for Pac-Man — a follow-on to last sprint's first pass, which got the text-based version working. It also carries forward our accessibility rule from earlier this quarter: no full-screen flashing, verified again here."

**Questions (3:40–4:00)**
