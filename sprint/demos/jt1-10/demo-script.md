**Total runtime: ~4 minutes.** This is a documentation-correctness story with no visual application change, so the "demo" is: show the corrected document, then prove it's backed by an automated safety net that runs in our build pipeline.

**Scene 1 — Slide 1: Title (0:00–0:15)**
Say: "Today's fix is a quiet one — no new screen, no new gameplay — but it closes a trap door under a feature we're about to build." Advance to Slide 2.

**Scene 2 — Slide 2: Problem (0:15–1:00)**
Show the two numbers side by side: "Old documented size: 51 bytes per game character. Actual size, verified from source: 56 bytes." Explain the 5-byte gap is not rounding error — it's two entire missing fields (the X and Y position of the character). Say: "The upcoming movement feature reads exactly this document to know where to find a character's position. Wrong size, wrong position."

**Scene 3 — Slide 3: What We Built (1:00–2:15)**
Live terminal demo. Run:
```bash
cd joust
npx vitest run tests/dossier-process-block.test.ts
```
Narrate as it runs: "13 tests here — three of them re-derive the byte math straight from the original source file, live, every time this runs, so nobody can ever hardcode the wrong number again. The other ten check that our documentation and its citations agree with that math." Point out the summary line reading `13 passed`.

Then run the second check:
```bash
node tools/audit/check-citations.mjs
```
Narrate: "This is our citation auditor — it confirms every reference in the corrected document points to a real line in the original source, quoted exactly. It reports `checked 240 claim(s) / all claims verified`."

*Fallback:* If either command fails to run live (missing dependencies, no vendored source tree on the demo machine), skip to **Slide 5 (Before/After)** and show the pre-captured terminal output pasted into the slide instead — the same two result lines (`13 passed`, `all claims verified`) are included there verbatim.

**Scene 4 — Slide 4: Why This Approach (2:15–3:15)**
Show the corrected document side-by-side with the old note still visible but struck through/labeled "outdated — kept for context." Say: "We didn't erase the mistake, we explained it. That's what let three different reviewers independently re-check the math and agree, and it's what stops the next person from making the same mistake."

**Scene 5 — Slide 5: Before/After (3:15–3:45, optional)**
Table: Before — "51 bytes, 8 bytes overhead, 2 fields undocumented." After — "56 bytes, 7 bytes overhead, all fields documented and cross-checked."

**Scene 6 — Slide 6: Roadmap (3:45–4:00)**
"This unblocks jt1-5 — flight and ground movement — which starts from a correct blueprint instead of a broken one."

**Scene 7 — Slide 7: Questions**
Open floor.