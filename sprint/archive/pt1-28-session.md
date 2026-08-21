---
story_id: "pt1-28"
jira_key: "pt1-28"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-28: Defender ship draws no thrust exhaust (port THOUT)

## Story Details
- **ID:** pt1-28
- **Jira Key:** pt1-28
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** fix/pt1-28-exhaust-flame
- **PR:** (none yet - recorded when the PR is created)
- **Stack Parent:** none

## Background

**Defect (owner playtest):** holding thrust accelerates the ship but draws NO exhaust
flame — thrust was audio-only (df6-2 thrust-start/stop cues); no render code read the
thrust bit.

**ROM ground truth (TEA, .session/pt1-28-handoff-red.md):** THOUT (DEFA7.SRC:2214-2239,
called from PRDSP2 right after POUT) paints a horizontal plume trailing BEHIND the ship
in Williams column-major VRAM — the first byte-column (-$100, rows 1-5) unconditionally
(the idle stub), the -$200/-$300 rows 2-4 and -$400 row 3 taper only while PIA21 bit $02
is held. THOUT1 (:2243-2260) mirrors the taper right of a left-facing ship (+$801..+$B02)
— exactly pt1-26's flip. The 13 bytes come from THTAB, RAND-filled by THINIT (:2203-2210),
window slid by THPROC (:3282-3288) one byte per NAP-4, wrapping past THTAB+32; raw stores
mean zero nibbles paint black — that IS the flicker.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/defender/tests/pt1-28-thrust-exhaust.test.ts` — 7 tests (4 RED / 3 guard),
  committed a5623005. Envelope/liveness/flip/flicker/determinism, never exact pixels.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/sim.ts` - `ShipView.thrust` (this tick's PIA21 level, set
  from `input.thrust` in stepSim, false at createSim); THINIT port — `_thtab` seeded from
  the injected `rand` at createSim (33 draws, each byte stored at i AND i+32 in the ROM's
  exact `STA 32,X / STA ,X+` order), drawn AFTER `initStars` so star layouts keep their
  pre-pt1-28 seeds; THPROC port — `_thx` +1 every 4 ticks (`_thnap` countdown), wrapping
  past position 32 (the ROM's `CMPX #THTAB+32 / BLS` gives 33 window stops). All state on
  SimState — no Math.random, no module state; composeFrame stays pure.
- `plugins/defender/src/core/scene.ts` - `drawThrustExhaust` called right after the ship
  blit (as PRDSP2 calls THOUT after POUT). Store tables transcribed per-instruction from
  THOUT: stub offsets {0,1,5,9,12} → dx -2..-1 rows 1-5 always; extension {3,6,10} →
  dx -4..-3 rows 2-4, {4,7,11} → dx -6..-5 rows 2-4, {8} → dx -8..-7 row 3 only while
  `ship.thrust`. Bytes stored RAW (high nibble = left pixel; zero nibble paints index 0 —
  the flicker). Facing left runs each pixel through the pt1-26 mirror (px → span-1-px,
  rows unchanged — THOUT1's layout). Clips at framebuffer edges.
- `plugins/defender/tests/df6-1-audio-events.test.ts` - fingerprint RE-BASELINED per its
  documented idiom (see Design Deviations).
- `plugins/defender/tests/df5-7-visual-playtest.test.ts` - kill-award staging RE-STAGED
  seed 7 → 10 (see Design Deviations).
- `plugins/defender/tests/df5-9-world-scroll.test.ts` - bare ship literal gains the new
  required field via `...base.ship` (type-only; same values).

**Tests:** 1195/1195 passing (GREEN) — all 7 pt1-28 tests (4 former RED + 3 guards) plus
the full defender suite. `npm run lint` clean.
**Branch:** fix/pt1-28-exhaust-flame (pushed, commit 271ac4ec)

**Handoff:** To review phase

## Design Deviations

### Dev (implementation)
- **df6-1 seed-42 cue fingerprint re-baselined (e80467cdef87c1e5 → c8b2fd6ddca739c3,
  287 → 289 cues):** THINIT's 33 rand draws at createSim shift every subsequent draw, so
  which enemies roam/shoot/collide where over that scripted run shifts, and the cue order
  with it. Re-baselined per that test's own documented idiom (its comment block records
  df6-2/pt1-18/pt1-19/pt1-27 precedents); the replay + seed-divergence tests beside it
  still pass, so the stream is healthy, not leaking entropy. NOT a blanket snapshot
  update — the one fingerprint, with an in-file justification comment.
- **df5-7 kill-award staging re-staged (seed 7 → 10):** the same draw shift moved seed 7
  out of the set of seeds whose roam/abduction run meets that test's predicate. Measured
  against the RED baseline (a5623005) in a throwaway worktree: at baseline only seeds
  7/5/21 of 8 probed ever met it; after the shift a fresh sweep found 10 (fastest,
  tick 431) among many working. The pt1-19 "RE-STAGED" precedent in the same test;
  assertions untouched.
- **THTAB modeled with 33 window stops, 65-byte table:** the ROM's THPROC wrap is
  `CMPX #THTAB+32 / BLS` (positions 0..32 inclusive, not 0..31), and THINIT's loop runs
  33 stores with the final `,X+` store overwriting THTAB[32] — ported byte-exactly rather
  than rounding to a 32-entry window.
- **THOUT1 byte-source mapping: THOUT's, mirrored (documented in review round 1):** ROM
  THOUT1 (DEFA7.SRC:2243-2260) pulls THTAB sequentially via `PULU D,Y` (stub = offsets
  0-4; +$900 = 5,6,7; +$A00 = 10,11,8; +$B00 = 9; offset 12 never read); the port reuses
  THOUT's scattered mapping (0,1,5,9,12 / 3,6,10 / 4,7,11 / 8) mirrored for both facings.
  Envelope, taper and rows mirror the ROM exactly; only which random THTAB byte lands in
  which cell differs — a visually-indistinguishable flicker texture. Kept deliberately;
  the in-source comments were corrected in the review-fix commit to claim the envelope
  mirror only, not byte-exact store mapping.

### Reviewer (audit)
- **df6-1 re-baseline: ACCEPTED.** Verified the diff is the hash literal plus the
  justification comment only; the delta (287 → 289 cues, content shift) is fully explained
  by THINIT's 33 init-time rand draws, and the sibling replay + seed-divergence tests
  still pass — the stream is deterministic, no entropy leak.
- **df5-7 seed 7 → 10 re-stage: ACCEPTED.** Reproduced independently in a scratch
  worktree at HEAD: seed 7 genuinely fails the untouched `score >= scoreBefore + 150`
  assertion (kill staging no longer lands), seed 10 passes it for the right reason (a
  real kill award). The THPROC port in stepSim consumes NO rand — pure counters — so
  per-tick gameplay is unchanged; the only behavioral shift is the init-time stream
  displacement. Not a masked regression.
- **THTAB 33/65 modeling: ACCEPTED.** Matches `CMPX #THTAB+32 / BLS` and THINIT's store
  order exactly, including the ROM's own overwrite of THTAB[32] (the `tab[i]===tab[i+32]`
  identity fails at i=0 on the real machine too — the port replicates it).
- **UNDOCUMENTED — THOUT1 byte-offset mapping simplified to THOUT's, mirrored** [MEDIUM]:
  ROM THOUT1 (DEFA7.SRC:2243-2260) pulls THTAB **sequentially** via `PULU D,Y` (stub =
  offsets 0-4; +$900 = 5,6,7; +$A00 = 10,11,8; +$B00 = 9; offset 12 never read), while
  the port reuses THOUT's scattered mapping (0,1,5,9,12 / 3,6,10 / 4,7,11 / 8) mirrored
  for both facings. The geometric envelope/taper/rows mirror exactly (verified); only the
  per-cell random-byte source differs, which is visually indistinguishable flicker
  texture. The in-source comments however overclaim it ("identical taper... exactly
  pt1-26's mirror" at scene.ts:261-263 and scene.ts:299; echoed in the test header
  27-32 and mirrorCell at 108) — the session handoff's own hedge ("envelope-identical")
  is the accurate claim. Fix the comments to say position/envelope mirror only, or port
  THOUT1's actual store table (a second 13-entry table).
  **RESOLVED (Dev, review round 1):** took the comment correction, not the table port —
  the mirrored-THOUT byte sourcing stays as a deliberate, documented modeling choice
  (envelope-identical, flicker texture indistinguishable; porting THOUT1's sequential
  table would change left-facing byte values for no test-visible gain). scene.ts header
  + inline comment and the test header / mirrorCell / AC2 comments now state the
  envelope-only mirror explicitly, with the DEFA7.SRC:2243-2260 cite and THOUT1's real
  `PULU D,Y` order (stub 0-4; then 5,6,7 / 10,11,8 / 9; offset 12 never read) spelled
  out. Deviation is now documented under Dev below.

## Delivery Findings

### Dev (implementation)
- **Improvement** (non-blocking): the df5-7 kill-award staging (`stepUntil` racing a
  20k-tick budget against seed luck) is fragile — most seeds never meet it, so ANY future
  change to rand draw order re-breaks it. Affects
  `plugins/defender/tests/df5-7-visual-playtest.test.ts` (a staging that pins the lander
  kill deterministically — e.g. parking the bait in a cleared field — would survive draw
  shifts). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the pt1-28 envelope tests assert containment +
  non-emptiness but not coverage — a future regression that truncates the plume to a
  single extension pixel would still pass AC1/AC2/AC3. Affects
  `plugins/defender/tests/pt1-28-thrust-exhaust.test.ts` (add a minimum-coverage floor,
  e.g. the diff must touch every extension byte-column, without pinning random values).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `drawThrustExhaust` silently clips a NaN coordinate
  (both bounds checks are false for NaN) where the sibling `blitObject`
  (objects.ts:57-58) throws loud on non-finite x/y. Unreachable today; align the
  conventions when next touched. Affects `plugins/defender/src/core/scene.ts`
  (drawThrustExhaust). *Found by Reviewer during code review.*

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** `input.thrust` → stepSim (same-tick level onto `ShipView.thrust`,
sim.ts:685) → SimState → composeFrame → `drawThrustExhaust` (scene.ts:289-305) — safe
because the draw reads only `_thtab[_thx + off]` with `_thx ∈ [0,32]`, off ≤ 12 → max
index 44 < 65 (no OOB), and every pixel write is clipped per-coordinate to the
framebuffer (verified reachable: ship y can legitimately hit ~239 and dy 5 clips at
height 240; df5-9 drives ship.x to −80).
**Pattern observed:** pt1-26's mirror convention (px → span−1−px), scene.ts:299 —
followed correctly for geometry; the ROM store tables at scene.ts:264-284 verified
byte-for-byte against DEFA7.SRC THOUT (:2214-2239).
**Error handling:** out-of-frame plume pixels clipped silently (scene.ts:296,300) —
correct for a framebuffer port; noted the NaN-guard asymmetry vs blitObject (Low).
**Observations:** (1) THOUT transcription exact — offsets 0,1,5,9,12 / 3,6,10 / 4,7,11 /
8, taper 5→3→3→1, stub unconditional before the PIA21 `BITA #$02` gate, rows +1..+5;
(2) THINIT 33 draws / dual store / 65-slot table byte-exact including the ROM's own
THTAB[32] overwrite; (3) THPROC wrap `thx >= 32 ? 0 : thx+1` matches
`CMPX #THTAB+32 / BLS`, every-4-ticks, and consumes no rand in stepSim; (4) purity
holds — table + index on SimState, seeded from the injected rand; purity.test.ts and
the AC5 determinism guard both green, and mutation probes (fix reverted, flicker forced
onto Math.random) redden the right tests; (5) [MEDIUM] THOUT1's per-cell byte mapping
not ported and in-source comments overclaim it (see Deviation audit); (6) [MEDIUM] the
envelope tests lack a coverage floor (see Delivery Findings); (7) [LOW] NaN-guard
asymmetry vs blitObject; (8) [LOW] `require_(OBJECTS, SHIP_OBJECT, 'object')` looked up
per call in drawThrustExhaust while composeFrame holds the same lookup one line above —
pass it in; (9) [NIT] THPROC citation `:3282-3288` stops short of the routine's real
extent (`NAP 4,THPROC` at :3294; the FBX/FBTAB half is the FIREBALL index, correctly
out of scope); (10) [NIT] test header "over 32+32 bytes" imprecise (33 draws / 65
slots). No Critical or High findings. All three test re-touches verified assertion-safe.
**Test status:** defender 93 files / 1195 tests green; pt1-28 + purity 56/56; lint
(`tsc --noEmit`) clean.

**Handoff:** To SM for finish-story
