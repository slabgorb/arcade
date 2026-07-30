# Centipede clone — design spec

2026-07-18. Brainstormed and approved section-by-section; this document is the
validated design. Ground truth for every ROM fact: [`docs/rom-study/`](../../rom-study/)
(brief, subsystems, glossary, open questions) — this spec cites it rather than
re-deriving it.

## Rulings (user, 2026-07-18)

1. **Deliverable:** whole-game roadmap + fully-storied first epic.
2. **Visual identity: faithful raster.** Transcribe the rev-2 picture ROMs and
   render authentic pixels + original colors. No glow treatment, no vector
   restyle. The arcade gains a deliberately different-looking cabinet.
3. **Controls: pointer-lock mouse primary** (trackball analog, clamped by the
   ROM's own `TBLMT` limit), arrow/WASD keys as capped fallback, click/space fire.
4. **Scope: 1-player game + attract mode.** No 2P alternating (`SWAP` is out),
   no operator timer options, no self-test screens. (Matches MAME's tag for the
   rev-4 set: "1 Player Only".) No coin-mechanism emulation: free-play start
   like the siblings; `COIN65` is not ported.
5. **Build strategy: playable slices** — every epic ends demoable.

## Architecture

Repo shape mirrors the siblings: `src/core/` pure deterministic sim, `src/shell/`
render/input/audio/storage. Vite 8 + TypeScript + Vitest 4. Port **5278**
`strictPort`, `base: '/'`. Deploys to R2 bucket `arcade-centipede` →
`centipede.slabgorb.com`.

**Timebase.** One sim step per video frame, integer frame counting like the ROM
(mainloop gates on `SYNC`; brief §3). Single named constant:

```ts
// Exact VSYNC per MAME (centiped.cpp:22-25): HSYNC 15.75 kHz / 263 lines.
// MAME itself hedges 262 vs 263 (rom-study open question 1); if that is ever
// resolved the correction is this one line.
export const FRAME_HZ = 15750 / 263; // 59.88593…
```

The shell accumulates wall time and steps the sim in whole frames; core never
reads a clock.

**Core model stays ROM-shaped.** The 30×32 playfield grid (`PLYFLD`,
`CENDE4.MAC:61`) and the ROM's 16 motion-object slots: 0–11 centipede segments
(`NCENT=12.`), 12 flea, 13 spider, 14 the single player shot, 15 the player gun
(glossary). One shot on screen at a time is authentic behavior, not a
simplification. RNG is `@arcade/shared/rng`, seeded by the shell — red-baron's
determinism ruling (rb4-3) applied from day one; no `Date.now`/`Math.random`
anywhere in core or the sim-step path.

**Rendering.** Rev-2 picture ROMs (`136001.201/202` — what rev 4 shipped with;
brief §0) are decoded into a committed data module. The transcription is gated
**byte-exact against the vendored chip binaries**, not eyeballed — a test
re-derives every tile from the ROM bytes. Drawing goes through an offscreen
tile atlas onto a portrait 240×256 logical canvas (visible area per
`centiped.cpp:1800`, cabinet ROT270), integer-scaled. Color handling follows
`CLRCH` init + the IRQ's color cycling. Text renders from the ROM's own
character tiles — the shared vector `/font` is not used. `/glow` is not used.

**Shared library** (version-pinned git-URL, house rules): `/rng`, `/loop`,
`/highscore` (lobby contract), `/pause`. Not used: `/math3d`, `/font`, `/glow`,
`/view`.

**Audio** is deferred to epic cp5 with both in-fleet paths recorded: runtime
web-POKEY (star-wars lineage) vs baked register-event streams (tempest
lineage). Either way the orchestrator's `extract-audio` audit rig is the
fidelity gate. Deciding now would be premature — the choice needs the SOUNDS
routine read in depth first.

## Roadmap

| Epic | Slice | ~Pts | Demo at the end |
|---|---|---|---|
| cp1 | Foundation: scaffold, citation checker, picture ROMs, playfield+mushrooms, player+shot, render shell | 23 | Glide and shoot mushrooms in an authentic field |
| cp2 | The centipede train: `MOTION`, `OBSTAC`, `NEWHD`, `EXPLOD`, poisoned dives | 15 | Full wave 1 vs the centipede |
| cp3 | Menagerie: spider, flea, scorpion, player death + `RESTOR` | 13 | The complete ecosystem |
| cp4 | Game structure: waves, scoring/BCD thresholds, bonus lives (cap 6), high scores + initials, attract mode | 10 | Full loop, start to game-over |
| cp5 | Sound: POKEY path decision + all `SOUNDS` cues, extract-audio gated | 8 | The game sounds like a Centipede |
| cp6 | Ship: lobby tile, R2 + domain, release pipeline, closing `rom-fidelity-audit` | 5 | Live at centipede.slabgorb.com |

Dependencies: cp2 → cp3 (shared segment/collision machinery); cp4 needs cp3;
cp5 and cp6 are independent after cp4. Rom-study open questions ride along:
VSYNC divisor pinned in cp1 (above); every constant taken from `CENTIP.DOC`
prose is diffed against rev-4 code in the story that transcribes it (open
question 4).

## Epic cp1 — Foundation slice (stories)

All `tdd` workflow, PRs → `develop`. cp1-2 and cp1-3 parallel after cp1-1;
cp1-4/5 need 1+2; cp1-6 needs 3+5.

- **cp1-1 · Scaffold** (2, chore). Vite/TS/Vitest mirroring red-baron's config;
  port 5278 strictPort; core/shell boundary guard (source-text scan for
  forbidden globals in `src/core/`, worded to avoid the comment-scanner trap);
  CI deploy caller for `arcade-centipede`; orchestrator registration
  (`justfile` games/subrepos lists, serve table, CLAUDE.md port row un-reserved).
  AC: build, test, dev server green from fresh checkout.
- **cp1-2 · Citation checker + claims** (3). Tempest audit checker ported with
  the `ours` side dropped; dossier citations become `docs/rom-study/claims/*.json`;
  `npm test -- citations` re-opens every cited line byte-for-byte against the
  vendored tree, degrading gracefully when the tree is absent (CI). Lands
  before any constant is transcribed. AC: a deliberately drifted line number
  fails; all real claims pass.
- **cp1-3 · Picture-ROM transcription** (5). Decode `136001.201/202` into
  `src/core/pictures.ts` + a baked contact-sheet artifact; a test re-derives
  every tile from the vendored ROM bytes byte-exactly; names cross-referenced
  to `CENPIC.MAC` labels. AC: byte-equality green; contact sheet committed; no
  hand-authored pixels.
- **cp1-4 · Playfield + mushrooms** (5). 30×32 grid semantics (score rows
  respected), initial mushroom seeding, per-hit damage states and hit count *as
  transcribed from rev-4 code* (scoring prose from `CENTIP.DOC` verified
  against code per open question 4), `RESTOR` sweep. Every constant carries a
  radix-cited comment (rb4-1 discipline). AC: seeded-RNG determinism test;
  citations suite covers every transcribed constant.
- **cp1-5 · Player + shot** (5). Bottom-zone movement rectangle, `TBLMT`
  clamp, slot-14 single-shot fire (`CHECK FIRE SWITCH`), shot flight +
  mushroom collision on grid cells as the ROM does it. Input shell:
  pointer-lock counts + key-synthesized counts at the clamp rate. AC: one shot
  in flight max; collision cell math cited.
- **cp1-6 · Render shell** (3). Atlas from cp1-3, portrait integer scaling,
  `CLRCH` color init, score/level text from ROM tiles, wired demo page. AC:
  screenshotable playable slice; render source-wiring test (`?raw` idiom).

## Testing posture (standing rule for all epics)

Every ROM-derived constant: radix-cited comment + membership in the citations
suite. Sim tests: seeded RNG only, whole-frame stepping, determinism pinned.
Purity: source-text guards on `src/core/`. Fidelity: picture data byte-gated
against chips; audio (cp5) gated by `extract-audio`; the project closes (cp6)
with a `rom-fidelity-audit` run against the same `docs/rom-study/` ground truth
it was built from.

## Out of scope

Two-player alternating and screen swap, operator timer options, self-test
screens, `COIN65`/coin-mechanism emulation, EAROM operator accounting. High
scores persist via the lobby `/highscore` contract instead of EAROM emulation.
