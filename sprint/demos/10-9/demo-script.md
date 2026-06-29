**Pre-demo setup:** Run `just serve` from the arcade root. Navigate to `http://localhost:5273/tempest/`. Have a second tab open with the pull request diff as a fallback.

---

**Scene 1 — Slide 2 (Problem): The Missing Banners**

Open the game and navigate directly to the level-select screen (press any key to dismiss the attract screen). Point out that without this story's changes, you'd see a plain numeric level chooser — no framing, no skill vocabulary, no "RATE YOURSELF" heading. Ask the audience: "Does this feel like an arcade cabinet from 1981?" The answer should be no.

*Fallback: Show the screenshot of the bare level-select from the PR diff's before/after.*

---

**Scene 2 — Slide 3 (What We Built): The RATE YOURSELF Ladder**

On the current build, navigate to the level-select screen. Show the audience:
- Green "RATE YOURSELF" header at the top of the chooser
- Red "RANK" subheading
- Red "NOVICE" and "EXPERT" labels flanking the level number (e.g., "NOVICE — START LEVEL 01 — EXPERT")

Say: "This is the exact text the 1981 ROM displayed. Colors match the original — green for 'RATE YOURSELF,' red for the rank labels. Nothing was invented; every value came from the ROM source study."

*Fallback: Show the PR diff for `render.ts` showing the `drawSelect` additions.*

---

**Scene 3 — Slide 3 (What We Built): The SUPERZAPPER RECHARGE Flash**

Start a game (press Start, choose any level). When the level loads, watch for the blue "SUPERZAPPER RECHARGE" flash in the center of the screen — it appears for approximately 2 seconds while the Superzapper is armed. Point out the color: bright blue (#1f8fff), matching the "BLULET" color family from the ROM's message table.

Say: "Before this change, players had no idea their Superzapper had refreshed. Now there's a 2-second blue flash on every level entry."

*Fallback: Show the test file at `tests/shell/render.banners.test.ts` — the test description `'SUPERZAPPER RECHARGE shown via drawGlowText and gated on superzapper full'` makes it readable to a non-technical audience.*

---

**Scene 4 — Slide 3 (What We Built): The Between-Wave Banners**

Complete a wave (destroy all enemies on any level). As the warp dive begins — the animation where the well collapses and you fly to the next level — watch for the green "BONUS" and "TIME" labels flashing during the dive. These are the markers the original cabinet used to signal the scoring summary moment.

Say: "The numeric values behind these labels — how much bonus you actually earned — are a follow-up story. What we've established here is the visual rhythm: the player knows something scored."

*Fallback: Show the PR diff with the warp-mode gate condition `s.mode === 'warp'` highlighted.*

---

**Scene 5 — Slide 4 (Why This Approach): Tests First**

Open `tests/shell/render.banners.test.ts`. Show the 15 test names — they read like acceptance criteria:
- `SUPERZAPPER RECHARGE shown via drawGlowText and gated on superzapper full`
- `RATE YOURSELF drawn inside drawSelect body`
- `BONUS gated on warp mode`

Say: "Every banner was described by a failing test before a single line of display code was written. The Reviewer caught two tests that could never fail — the team fixed those before shipping. The final suite of 639 passing tests includes these 15 banner-specific checks."

*Fallback: Show the terminal output: `Test Files 1 passed | Tests 639 passed`.*

---