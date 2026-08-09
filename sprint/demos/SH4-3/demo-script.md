# Demo Script — SH4-3

**Total runtime: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Presenter opens on the title slide ("SH4-3: One Screen-Sizing Rule for Three Games"). Say: "This is a behind-the-scenes cleanup story — no visible change for players, but it removes a real maintenance risk across three of our seven games."

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show the problem slide with the "four copies, one job" framing. Say: "Centipede, Pac-Man, and Joust each had their own private copy of the code that decides how big to draw the game and how to center it. Two of those copies — Centipede's and Pac-Man's — were literally identical, character for character. That's a warning sign: if we fix a bug in one, we have to remember to fix it in the other three, or the games drift apart."

*Live demo (optional, if terminal is available):*
```
git show 1a65c0ed --stat
```
This shows the actual file list touched: `plugins/centipede/src/shell/layout.ts`, `plugins/pac-man/src/shell/layout.ts`, `plugins/joust/src/shell/render.ts`, and the new shared `src/shared/view.ts` — one shared file, three consumers.
*Fallback if the terminal isn't available or the repo isn't checked out: skip straight to Slide 3 and describe the file list verbally from the numbers below (8 files changed, 466 lines added, 53 removed).*

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Say: "We moved the shared logic into one place — `fitIntegerScale`, living in the shared library every game already imports from — and pointed all three games at it instead of their own copies."

*Live demo:*
```
npx vitest run --project centipede --project pac-man --project joust
```
Narrate while it runs: "Centipede's 1,270 tests, Pac-Man's 277, and Joust's full suite all still pass — exactly as they did before this change, because we didn't touch the math, only where it lives." Point out the new test file specifically: `src/shared/tests/view-integer-scale.test.ts` — 17 new tests added purely to pin the shared behavior down.
*Fallback: if the live run is slow or flaky, show the pre-captured results instead — "shared 578/578, centipede 1270, pac-man 277, joust green, lint clean" — from the PR description on Slide 3.*

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
Say: "We only moved plumbing, never touched the math — that's why every existing test still passes unchanged, and it's why there's zero visible change for a player sitting at any of these three games today." Mention Joust's one preserved quirk: it still refuses to let the screen offset go negative on a tiny window, layered on top of the shared function, unchanged from before.

**Scene 5 — Before/After (3:00–3:30)**
Show a simple two-column slide: "Before" — 4 near-duplicate copies of the same 15–20 lines of math, scattered across 3 games. "After" — 1 shared function, 3 thin one-line call sites. No screenshot needed since there's no visual difference — the "after" picture is identical to the "before" picture, which is the point.

**Scene 6 — Roadmap (3:30–3:50)**
Say: "This unblocks Pac-Man's next milestone directly — Pac-Man needs this exact whole-number pixel-scaling approach, not the fractional-zoom approach our vector games like Tempest use. An earlier story had assumed otherwise; this one corrects that and clears the path."

**Scene 7 — Slide: Questions (3:50–4:00)**
Open the floor.
