# mc7-4

## Problem

Problem: ROM-faithful ladder display + seeded default table: seed the initial ladder from the cited W3DSUP INIT HI SCORE defaults and render the ladder on the attract high-score screen (the mc6-5 slot). Pin default names/scores at RED. REV-01 W3DSUP.MAC:3724 INIT HI SCORE. Why it matters: users needed a better interface.

## What Changed

We implemented: ROM-faithful ladder display + seeded default table: seed the initial ladder from the cited W3DSUP INIT HI SCORE defaults and render the ladder on the attract high-score screen (the mc6-5 slot). Pin default names/scores at RED. REV-01 W3DSUP.MAC:3724 INIT HI SCORE.
Key changes made:
  - feat(mc7-4): render the high-score ladder into the attract slot
  - GREEN — draw the five seeded rungs into the highScoreSlot region during
attract: a SCORE column (left) beside an INITIALS column (right),
best-first, read from state.highScores VERBATIM in array order (entry 0
= BEST; @shared/highscore keeps it sorted descending). Capped at
slot.rows (the authentic five) and iterated (not indexed [0..4]), so a
shorter table paints fewer rungs and a longer/corrupted one can't
overspill the slot. The seeded defaults and depth stay core's (mc7-1);
no re-seed, no new claim.
  - Ground truth (REV-01): CDLADR 'DISPLAY 5 HI LADDER' (W3COMN.MAC:97);
score ladder + initials ladder (SCLDRV/SCLDRH/INTLV, :163/165/169).
  - createGame boots into 'attract' (INITIAL_PHASE), so the new mid-field
ladder collided with two sibling render tests that use a bare
createGame(1) as a PLAY-field proxy (render-hud-layout: high-score
readout is top-band; render-battle: ICBM head on an empty field). Pinned
both to phase 'play' — a context fix, not an assertion change; the HUD
and ICBMs draw every phase, only the attract overlay is suppressed.
  - Folds in the two non-blocking reviewer nits: retire the stale slot
comment and slice the render to slot.rows (unbounded-loop guard +
enforces the ROM's exactly-5-rung ladder).
  - All 12 mc7-4 tests GREEN; full mc suite 1297 pass; tsc --noEmit clean.
  - Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  - test(mc7-4): add failing tests for ROM-faithful ladder display
  - RED phase for mc7-4 — render the five seeded high-score rungs INTO the
attract high-score slot (the container mc6-5 reserved but left empty).
Render-only: the table, depth and seeded defaults already live in core
(mc7-1) and are re-pinned here only as green-on-arrival locks.
  - Ground truth (REV-01): CDLADR 'DISPLAY 5 HI LADDER' (W3COMN.MAC:97);
each rung is a score column + initials column (SCLDRV/SCLDRH/INTLV,
W3COMN.MAC:163/165/169); best-first, from DEFAULT_HIGH_SCORES.
  - Retires the mc6-5 AC3 container-only lock, which mc7-4 overturns by
design (mc6-5's own comment: 'mc7-4 fills the slot'). AC1's swapped-
lower-rungs test is the direct inverse of the removed assertion.
  - 6 driver tests RED (ladder not yet drawn); 6 locks green. Full mc suite
otherwise green (1291 pass); tsc --noEmit clean.
  - Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  - Merge pull request #219 from slabgorb/feat/pm4-6-start-coin-ready-play
  - feat(pm4-6): START/coin -> READY -> PLAY (core+shell)
feat(pm4-6): wire START/coin -> READY -> PLAY (core+shell)
  - createGameState boots into 'attract'; stepGame freezes the whole sim (Pac,
ghosts incl. released Blinky, dots) in attract/ready and drives the pure pm4-5
advancePhase machine: a start/coin reseeds a fresh board (keeping the high-score
table) and enters the READY! hold (READY_HOLD_FRAMES=256, the start-intro
length), which runs the intro before releasing the sim into 'playing'. The shell
binds a start/coin key (Space/1/5) and feeds it into the sim input.
  - Ripple: existing sim-mechanic tests (game/ghost-eyes/eyes-render) now begin from
a 'playing' board; overlays self-heal broadened to un-latch on game-over -> any
(a restart boots to attract now).
  - GREEN: pac-man 339/339, full fleet 14370, orchestrator 457/457, lint clean.
  - Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  - test: add failing tests for pm4-6 (START/coin -> READY -> PLAY wiring)
  - Core lifecycle suite (tests/core/lifecycle.test.ts) and the shell start-key
seam (tests/shell/main-lifecycle.test.ts), written before game.ts is wired:
attract boot, attract/ready sim-gate (Blinky frozen), start->ready, the READY
freeze + hand-off to playing, and the createGameState reseed preserving the
high-score table. Green guards pin the corrected AC1 reading (a start press is
inert during play and at game-over; pm4-10 owns game-over->attract).
  - RED: 7 vitest failures + tsc excess-property on GameInput.start.
  - Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

## Why This Approach

This approach prioritizes user experience and accessibility.
