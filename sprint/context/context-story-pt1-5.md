# Story pt1-5 Context

## Title
tempest: attract mode needs a 'play example' (auto-play demo) instead of just the wordmark

## Metadata
- **Story ID:** pt1-5
- **Type:** bug
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: tempest's attract shows only the wordmark.

**Architect research (2026-08-19) — REFRAME: the demo already exists and runs; the
RENDERER hides it.** Story 10-3 shipped a full self-play demo in core — it steps
every idle frame — but `render()` early-returns to the framing-screen path whenever
`mode === 'attract'`. This is mostly a shell/render story plus attract-cycle
sequencing, NOT a new AI.

## Findings

**The demo core (already present, pure, in the purity sweep):**
- `plugins/tempest/src/core/sim.ts:1077-1093` `demoInput(s)` — steers toward the
  nearest-rim enemy, fires when within `DEMO_FIRE_LANES = 2` (`:1057`, strict <2
  per audit finding B-009). `seedDemo` (`:1097-1103`) draws the ONLY rng —
  `nextInt(s.rng, DEMO_MAX_LEVEL=8)` → `startGameAtLevel`, forces mode 'attract',
  `DEMO_LIVES = 1` (`:1058`, finding B-008). Attract arm at `sim.ts:1127-1143`;
  `resetDemoToTitle` `:1108`; `hasRealInput` `:1116`.
- **Gate quirk:** `checkLevelClear` is a no-op while `mode === 'attract'`
  (`sim.ts:1052`) — the demo can never clear a wave; it only dies out. A
  wave-clearing demo means touching that gate (core change).

**The suppression (the actual bug):** `render.ts:1041-1047` — attract/select/
highscore modes draw `drawFrame` only and return. That early-return is itself the
4-2 F1 ghost-tube fix (comment `:1039-1040`): don't regress it — draw the scene
only when `s.demoActive`, never on a stale board. `drawAttract` at
`render.ts:777-812` additionally opens with `drawScrim` (opaque 55% black — a
second occluder). The scene draw the demo needs lives at `render.ts:1109-1131`
inside the phosphor scratch (`phosphor.beginScene` transform,
`src/shell/phosphor.ts:84-101`) — a demo scene must render there, NOT from
`drawFrame` (CSS-pixel space, source-over).

**The AUTHENTIC attract is a three-page rotation** (high-score ladder → logo
rainbow → self-playing 1-life game on a random level 1-8):
`ALEXEC.MAC:428-450` (ENDGAM→CDLADR), `:452-470` (DLADR → CLOGO),
`ALSCOR.MAC:1263-1275` (LOGINI); demo brain `AUTOCU` `ALWELG.MAC:977-1005`
(min-INVAY target, ±9 spinner/frame); auto-fire `ALWELG.MAC:2629-2655`; 1 life +
`RANDOM AND 7` level `ALWELG.MAC:239-244`; attract skips the rate screen
`ALWELG.MAC:181,201-213`. Our permanent wordmark ≈ the "logo" page shown forever.

**Reuse template — joust jt13-13:** `plugins/joust/src/core/demo-ai.ts` (pure
`demoInput(game)`, tuning constants documented as AI-owned NOT ROM-cited,
`:36-59`); page scheduler `plugins/joust/src/core/attract-scheduler.ts`
(`AttractPage`/`PAGE_ORDER`/`dwellFor`/`stepAttract`) — the right shape for
tempest's 3-page ROM cycle; wiring `plugins/joust/src/main.ts:622-648`; fixed
demo seed constant. Fingerprint tests `plugins/joust/tests/demo-ai.test.ts:62-157`
(2-run identical fingerprint incl. rng cursor; purity via scanner `violations()`).

## Technical Approach
1. **Render the demo scene** during attract when `s.demoActive` (phosphor scene
   path), with the attract chrome (logo/scores/PRESS START) as pages or overlay —
   an attract page scheduler in core (joust `attract-scheduler` shape) sequencing
   ladder → logo → demo per the ROM cycle.
2. Keep `drawAttract`'s required internals intact (tests below pin
   `titleLogoPasses`, `logoGlyph`, `drawHighScoreTable`, `'PRESS START'`,
   `'CLICK OR ENTER TO START'` inside its body).
3. Decide the wave-clear question consciously: authentic demo dies on 1 life
   (fine to keep the `sim.ts:1052` gate); document either way.
4. No strobe (Decision B) — the logo rainbow already passes; the demo scene is
   normal gameplay rendering.
5. Citation gate: `ours` is frozen at audit commit `4232ed4`, so code edits don't
   redden it. Stamp `remediated_by: "pt1-5"` ONLY on findings genuinely fixed
   (candidates: B-021 logo passes, V-037 missing `(c) MCMLXXX ATARI` line
   `ALLANG.MAC:86` — if the chrome is reworked). Cite `ALSCOR.MAC`/`ALDISP.MAC`,
   NEVER the `*2` twins (`linked-modules.mjs` rejects them).

## Scope
- In scope: attract-page sequencing (core, pure), demo-scene rendering (shell),
  finding stamps as fixed.
- Out of scope: new demo AI (exists); changing demo constants (B-008/B-009 cited);
  the select screen (pt1-9's surface).

## Tests affected
- `tests/core/sim.attract-demo.test.ts` — the 10-3 contract: "mode never leaves
  attract" (every frame of 1800), 600-frame bit-identical replay, demo death →
  title. **Re-negotiate if the mode/page model changes.**
- `tests/shell/render.title-rainbow.test.ts:17-66` + `tests/shell/tp1-19.shapes.test.ts:462-470`
  — slice `drawAttract`'s body; keep its required calls/literals inside it.
- `tests/purity-scanner.test.ts` + `tests/rom-clock-sources.test.ts` — any new
  `src/core` file is auto-swept; add a joust-style direct AC-P assertion.
- `tests/audit/citations.test.ts` + a story-scoped `pt1-5.citations.test.ts`
  (the tp1-7/tp1-8 pattern) if findings are stamped.

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 idle attract visibly plays the demo (scene
pixels differ from the wordmark page over a dwell); AC2 the page rotation follows
the ROM cycle (ladder → logo → demo), each page dwell pinned; AC3 demo determinism
fingerprint (2-run identity incl. rng cursor); AC4 real input exits to title
instantly from any page; AC5 no ghost-tube regression (the 4-2 F1 case re-pinned);
AC6 purity sweep green._

---
_Generated by `pf context create story pt1-5`; researched and expanded by Architect 2026-08-19._
