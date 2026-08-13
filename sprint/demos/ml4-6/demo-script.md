# Demo Script — ml4-6

**Total run time: ~4 minutes**

**Scene 1 — Slide 1: Title (0:00–0:15)**
Say: "Today's story is a small housekeeping change to Millipede's bee-family creatures — no gameplay changes, just cleaner code underneath." Advance to Slide 2.

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Say: "Four creatures — bee, dragonfly, mosquito, and earwig — each had their own copy-pasted version of the same three rules: when a bee should appear, where it lands, and how it gets cleared off screen. That's four places to keep in sync every time we touch this logic." Show the specific detail: "For example, the 'landing spot' rule appeared three separate times, in `bee.ts`, `dragonfly.ts`, and `mosquito.ts` — identical, byte for byte." Advance to Slide 3.

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Say: "We created one shared file — `bee-family.ts` — with the four pieces of shared logic, and pointed all four creatures at it instead of their own copies."
*Live demo command:*
```bash
npx vitest run --project millipede -t "bee-family"
```
Narrate while it runs: "This is the exact suite that pins the behavior — watch the pass count." Point out the result: "201 lines of test, all green — same output as before the change, just less code duplicated."
*Fallback if the live demo fails or the environment isn't available:* Show Slide 3 with the before/after file-count callout (4 copies → 1 shared file) instead, and narrate the same numbers from the deck.

**Scene 4 — Slide 4: Why This Approach (2:15–3:00)**
Say: "We didn't do this the moment we noticed duplication — we waited until a fourth creature proved the pattern was real and stable, per our team's 'third-consumer' rule for combining code. And we deliberately left three other creatures — spider, beetle, inchworm — untouched, because folding those in wasn't part of this request." Advance to Before/After slide.

**Scene 5 — Before/After (3:00–3:30)**
Show the specific before/after: "Before: 4 files, ~90 lines of duplicated logic across them. After: 1 shared file (66 lines), 4 files each ~15-20 lines shorter, zero behavior change — confirmed by an automated 'no more duplicate copies' check plus the full 826-test regression suite, both green."

**Scene 6 — Roadmap (3:30–3:50)**
Say: "This closes out a follow-up item from an earlier review, and sets a template for the next cleanup — three more creatures (spider, beetle, inchworm) share a smaller piece of this same logic and are flagged as a candidate for the same treatment down the road."

**Scene 7 — Questions (3:50–4:00)**
Open floor.
