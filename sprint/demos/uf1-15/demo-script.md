# Demo Script — uf1-15

**Total run time: ~5 minutes**

**Slide 1: Title — 0:00–0:20**
Say: "Today I'm walking through a fidelity fix to our Star Wars arcade clone — how TIE fighters decide when you're in their sights."

**Slide 2: Problem — 0:20–1:00**
Show the offending code comment on screen (have this pre-captured as a screenshot in case live terminal access is flaky):
```bash
git show bde9358baf5d8b17f132199e1f570fe91d8c5c16^:plugins/star-wars/src/core/tie-status.ts | grep -n "FIRE_CONE_COS\|TODO"
```
Point out the line: `FIRE_CONE_COS = Math.cos(deg2rad(12))  // TODO(playtest): this 12° is INFERRED`.
Say: "That's a guess, sitting inside the flight AI, with a comment admitting it's a guess."
*Fallback: if the terminal command doesn't render cleanly, skip straight to the pre-captured screenshot slide.*

**Slide 3: What We Built — 1:00–2:30**
Live demo: launch the dev server and show TIE fighters in action.
```bash
just serve
```
Open `http://127.0.0.1:5270/star-wars/` in a browser, start a game, and let TIE fighters engage — call out the moment fighters break from tracking into an attack pass.
Then switch to the terminal and run the verification suite to show the fix is proven, not asserted:
```bash
npx vitest run --project star-wars
```
Call out the result on screen: `Test Files 197 passed (197)`, `Tests 2113 passed (2113)`. Say: "Every one of those 2,113 checks — including 12 new ones written specifically to pin this rule — is green."
*Fallback: if the dev server won't start or the browser demo stalls, skip to Slide 3a (a 15-second screen recording of the same dogfight, captured in advance) and go straight into the terminal command, which does not depend on the browser.*

**Slide 4: Why This Approach — 2:30–3:30**
Show the cross-validation table (build this as a simple 3-row table on the slide):
| In-game distance | Original value | Converted result |
|---|---|---|
| "Player middle distance" | 0x900 | 12,288 (an exact round number) |
| "Player near" | 0x100 | 4,096 (an exact round number) |
| **"In alien's sights" (this fix)** | **0x20** | **1,448.15 world units** |

Say: "We ran our new formula against two distances we already knew the right answer to, and both landed exactly on round numbers. That's the proof the formula is correct — not just plausible."

**Before/After — 3:30–4:30**
Show a simple before/after slide:
- **Before:** invisible 12° cone in front of the fighter, guessed value, marked TODO
- **After:** a fixed-width tube along the fighter's flight path (1,448 units wide, cut off at a max range), taken directly from the arcade machine's own program

If time and rendering allow, show two short side-by-side clips of the same TIE fighter engagement recorded before and after the change. *Fallback: if clips aren't ready, present the before/after as text only — the terminal test-pass evidence from Slide 3 already carries the proof.*

**Roadmap — 4:30–5:00**
See Roadmap & Integration section below for talking points.

**Questions — 5:00+**
Open the floor.
