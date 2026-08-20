---
story_id: "pt1-22"
jira_key: "pt1-22"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-22: defender: revive the live palette — the laser, bombs, TIEs, pods and the mutant shimmer render black because colour RAM is frozen at boot defaults

## Story Details
- **ID:** pt1-22
- **Jira Key:** pt1-22
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-22-defender-revive-live-palette-cyclers
- **PR:** (none yet — recorded when the PR is created)

## Branch Strategy
**Branch Strategy:** gitflow (feat/pt1-22-defender-revive-live-palette-cyclers)

## Background

Root cause R1 from the 2026-08-20 gameplay render audit (plugins/defender/docs/2026-08-20-defender-gameplay-render-audit.md), ruled by ADR-0007. shell/render.ts:41 resolves CRAM ONCE at module load from DEFAULT_PCRAM and decodes every frame through it; core carries no live PCRAM shadow and writes no colour registers. So palette index 1 (LASER) and indices A-F stay 0x00 = black forever. The player laser is drawn correctly every frame in pure black on black (scene.ts:114, palette.ts:25). Williams copies PCRAM into hardware colour RAM every frame (DEFA7.SRC:1968-1980) and mutates the shadow at runtime to animate registers.

Fix (ADR-0007 decision 1): carry the 16-byte PCRAM shadow as live SimState (readonly pcram), add pure per-tick colour cyclers (laser index 1, the A-F bomb/monochrome/TIE cyclers, the mutant shimmer) with ROM-cited timing/colour tables, and have render.ts decode through the live shadow each frame instead of the module-load cache. Purity boundary unchanged (core hands indices + palette bytes; shell invents no colour). ADR-0005: the cyclers are localized/small-area and permitted, but no cycler may drive a >3 Hz strobe over a large area; assertNoFullFrameStrobe stays the guard.

PREREQUISITE story: the black-sprite half of pt1-23 and pt1-25's smart-bomb wash depend on this. Land it first.

## Acceptance Criteria

- Core SimState carries a live readonly `pcram: readonly number[]` field initialized from DEFAULT_PCRAM
- Per-tick cycler routines mutate pcram indices for: laser (index 1), bombs/monochrome/TIEs (indices A-F), and mutant shimmer
- All cycler timing and colour tables are ROM-cited with inline comments (DEFA7.SRC line references)
- render.ts:41 decodes every frame through the live pcram shadow instead of the module-load cache
- Purity boundary unchanged: core hands indices + palette bytes; shell invents no colour
- Laser, bombs, TIEs, pods and mutant sprites render with correct colours (non-black)
- assertNoFullFrameStrobe guard confirms no cycler drives >3 Hz strobe over a large area (ADR-0005 safety)
- All acceptance-criteria covered by ROM-fidelity tests with mutation-proven constants

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T21:22:20Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T20:10:05Z | 2026-08-20T20:12:54Z | 2m 49s |
| red | 2026-08-20T20:12:54Z | 2026-08-20T20:28:41Z | 15m 47s |
| green | 2026-08-20T20:28:41Z | 2026-08-20T20:47:32Z | 18m 51s |
| review | 2026-08-20T20:47:32Z | 2026-08-20T20:59:01Z | 11m 29s |
| green | 2026-08-20T20:59:01Z | 2026-08-20T21:11:35Z | 12m 34s |
| review | 2026-08-20T21:11:35Z | 2026-08-20T21:22:20Z | 10m 45s |
| finish | 2026-08-20T21:22:20Z | - | - |

## Sm Assessment

**Setup by Baldur the Bright (SM), 2026-08-20.** Board clean at setup: `git fetch --prune`
then `git branch -r | grep pt1-22` returned nothing, and no sibling `.session/` files exist —
no concurrent owner. Story claimed: `in_progress` stamp + context committed (`5dd1e0b2`) and
branch `feat/pt1-22-defender-revive-live-palette-cyclers` pushed to `origin` so the sibling
probe lights up.

**Premise verified against the current tree — accurate, no correction block needed.** Every
falsifiable claim in the description was checked before setup copied it forward:
- `plugins/defender/src/shell/render.ts:41` — `const CRAM = resolveCram(DEFAULT_PCRAM)` really
  is resolved ONCE at module load; the module comment concedes "df2 renders a static frame, so
  it is resolved once here." Confirmed.
- Core carries NO live PCRAM shadow — `plugins/defender/src/core/palette.ts` exports only the
  static `DEFAULT_PCRAM: readonly number[]`; SimState has no `pcram` field. Confirmed.
- `DEFAULT_PCRAM = [0x00,0x00,0x07,0x28,0x2f,0x81,0xa4,0x15,0xc7,0xff,0x00,0x00,0x00,0x00,0x00,0x00]`
  so index 1 (LASER) = `0x00` black and indices A–F (10–15) = `0x00` black at the frozen boot
  state. Confirmed the laser draws black-on-black.

**One cosmetic prose slip, not worth a correction banner:** the description cites `scene.ts:114`
for the laser colour, but `LASER_COLOUR = 1` is actually `core/scene.ts:113` (`:114` is
`LASER_LENGTH`). The symbol reference is right; the line is off by one. TEA should cite the
symbol, not the stale line.

**For TEA (RED phase):** This is a ROM-fidelity story. Per the fleet rule, the ROM is canonical
— cite `DEFA7.SRC` for the per-frame PCRAM→CRAM copy (:1968-1980) and for cycler timing/colour
tables, and make every cited constant LOAD-BEARING (mutate the byte, prove the test reddens; an
unexercised citation is a rule-#17 rejection). Watch the two live guardrails: **purity**
(`core/` stays sim-only; the boundary is "core hands indices + palette bytes, shell invents no
colour" — unchanged by this story) and **`assertNoFullFrameStrobe`** (ADR-0005 + the fleet-wide
photosensitive-epilepsy rule: no cycler may drive a >3 Hz strobe over a large area — accessibility
OUTRANKS fidelity). Defender's raster draw lives in `core/scene.ts`/`composeFrame`, not shell —
grep there for any "is X drawn?" premise check.

**PREREQUISITE:** pt1-23's black-sprite half and pt1-25's smart-bomb wash depend on this landing
first. Land pt1-22 before either.

## Tea Assessment

**RED by Tyr One-Handed (TEA), 2026-08-20.** One suite,
`plugins/defender/tests/pt1-22-live-palette.test.ts` (14 tests), all RED with self-describing
"not built yet" messages; the rest of the defender project stays green (14 failed / 1076 passed).
`npm run lint` clean. Commit `6e70ab4c`.

**ROM study drove the contract — the standing-cycler fact is the load-bearing discovery.** I read
the vendored source, not the audit summary. The three colour cyclers are spawned as STANDING
processes at player-start (`DEFA7.SRC:1283-1288` `NEWP COLR/CBOMB/TIECOL,STYPE`), so they run for
the whole life regardless of which entities are on screen — NOT per-entity. That is why the tests
drive a bare `createSim → stepSim(NEUTRAL)` loop and expect indices 1 / A,C / D,E,F to animate
with no bomb or TIE spawned. Dev must model them as life-scoped (registered where `pcram` is born,
advanced every tick), or §3/§4 stay red. The register→routine map:
- **index 1 (LASER)** ← `COLR` walks `COLTAB` (`DEFA7.SRC:3024-3043`), one entry per `SLEEP #2`,
  wraps at the `$00` terminator.
- **indices A(10)/C(12)** ← `CBOMB` (`DEFB6.SRC:1213-1228`): `$FF`, then `COLTAB[SEED AND $1F]`.
  The index-12 write IS the "mutant shimmer" (SCZP1's one index-12 pixel) — there is no separate
  mutant colour routine; the audit's "mutant shimmer" rides register C.
- **indices D(13)/E(14)/F(15)** ← `TIECOL` walks `TCTAB` in 3-byte rows (`DEFB6.SRC:1195-1209`).
- **NOT in scope:** index B(11) is the player-death register (`PDTH`, `DEFA7.SRC:1364`) — that is
  pt1-25/R2. Index 5 is the per-wave `WCTAB` colour (set once per wave, not a per-tick cycler).
  §5 pins both as MUST-NOT-MOVE during live play.

**The bug is demonstrated, not just asserted.** §2's two red assertions are the money shots: the
frozen `indexToRgba`/`render` return byte-identical black for a lit-laser palette and a dark one
(`expected {r:0,g:0,b:0} to not deeply equal {r:0,g:0,b:0}`). That IS "the laser is drawn correctly
every frame in black on black." GREEN turns them green by threading `sim.pcram` through the decode.

**Proposed seam for Dev (df3-6-live-sim precedent — rename allowed, but a rename means updating the
test):**
- `SimState` gains `readonly pcram: readonly number[]` (16 bytes); `createSim` seeds it from
  `DEFAULT_PCRAM` (the CRINIT copy); `stepSim` advances the standing cyclers and returns a NEW
  `pcram` (§1 pins immutability).
- new pure core module `core/color-cycle.ts` exporting `COLTAB` (`DEFA7.SRC:3037-3043`) and `TCTAB`
  (`DEFB6.SRC:1207-1209`) + the cycler steps. **Enroll `COLTAB`/`TCTAB` in the citation gate**
  (a new `claims/*.json`) — this suite does NOT re-transcribe their bytes (lang-review #18/#26); it
  imports them and pins the WIRING (observed laser values ⊆ COLTAB; observed TIE triples ⊆ TCTAB
  rows). Byte-accuracy is the citation gate's job.
- `render.ts`: `indexToRgba(index, cram?)` and `render(ctx, fb, pcram?)` decode the SUPPLIED
  palette; `main.ts` passes `session.sim.pcram`. The static/attract path may keep `DEFAULT_PCRAM`.
  The existing 1-arg `palette.test.ts` stays green (cram defaults to the resolved default).

**ADR-0005 / epilepsy safety is a hard test, not a comment (§5).** The seizure-critical invariant
is concrete and pinned: register 0 (SPACE — the whole-screen background) is NEVER written by any
cycler across 300 ticks, so no >3 Hz luminance cycle covers a large area. The laser/bomb/TIE
cyclers are permitted precisely because they are small-area (a streak, a sprite). §5b bounds the
blast radius: ONLY {1,A,C,D,E,F} may move; the nine fixed named colours and the death register
stay put. This honours the fleet-wide [[pacman-epilepsy-no-flash]] rule (accessibility outranks
fidelity) and `assertNoFullFrameStrobe`'s framebuffer-level guard.

### Rule Coverage (lang-review/typescript.md)

TEA writes tests to enforce the applicable checklist rules, not just the ACs:
- **#18 / #26 (a fixture whose value IS the expectation checks nothing):** COLTAB/TCTAB bytes are
  NOT re-typed in the suite — imported from the module under test and enrolled in the citation
  gate. Value assertions pin RELATIONSHIPS between two exports (observed cycle values ⊆ table) and
  the injected-RNG determinism, never a literal echoed back.
- **#29 (ordering vs magnitude):** §3 pins a NUMBER — index 1 must take ≥ 20 distinct values — so a
  "lit but frozen on one colour" regression reds; a bare "it changed" ordering check would pass on
  a two-value toggle.
- **#21 (degenerate-but-not-nullish numeric input):** the render mock's `createImageData` throws on
  a 0 dimension like the real API (mirrors `render.test.ts`), so a scale-0 reimplementation reds.
- **#15 (source-text token vs claim):** avoided entirely — every assertion is BEHAVIOURAL through
  `createSim`/`stepSim`/`indexToRgba`/`render`, no source-text greps that could pass on a comment.
- **Purity:** §6 asserts the observable purity contract (same injected rand → identical pcram
  sequence; different rand → divergent), and the new `core/color-cycle.ts` will be scanned by the
  existing `tests/purity.test.ts` core sweep — cyclers must be clock-free (CBOMB's entropy is the
  injected `rand`, like stars' RAND, never `Date.now()`).

**No Delivery Findings that block** — the premise was accurate (SM already verified it; my ROM read
confirmed and extended it with the standing-process detail). Handing to Dev.

## Dev Assessment

**Implementation Complete:** Yes (GREEN by Loki Silvertongue, 2026-08-20)

**Files Changed:**
- `plugins/defender/src/core/color-cycle.ts` (NEW) — pure ROM-cited cyclers: `COLTAB`
  (DEFA7.SRC:3037-3042), `TCTAB` (DEFB6.SRC:1207-1209), `ColorCycleState`, `initColorCycle`,
  `stepColorCycle`. The three standing cyclers (COLR/CBOMB/TIECOL) advance one tick, returning a
  fresh 16-byte shadow. Clock-free, no gameplay-RNG draw (purity gate scans it — 49 green).
- `plugins/defender/src/core/sim.ts` — `SimState` gains `readonly pcram` + `_colorCycle`;
  `createSim` seeds `pcram` from `DEFAULT_PCRAM` and `initColorCycle()`; `stepSim` advances the
  cyclers off the previous shadow each tick (persistent update — the prior `pcram` is untouched).
- `plugins/defender/src/shell/render.ts` — `indexToRgba(index, cram?)` and `render(ctx, fb, pcram?)`
  decode through the SUPPLIED palette (the R1 fix), defaulting to the boot palette for the static
  path. The 1-arg `palette.test.ts` contract still holds.
- `plugins/defender/src/main.ts` — passes `session.sim.pcram` to `render` so live play decodes the
  moving shadow.
- `plugins/defender/docs/rom-study/claims/21-color-cycle.json` (NEW) — 21 byte-verified claims
  (COLTAB/TCTAB bytes, the register stores, the standing-process spawns), swept by the existing
  whole-dir `checkClaims(loadClaims())` gates.
- `plugins/defender/tests/pt1-22-live-palette.test.ts` — corrected §6b + added the §4b source
  byte-check (see Design Deviations); **rework round**: rewrote the §3b wrap guard to assert
  return-to-COLTAB[0], added laser + TIE cadence-magnitude guards and a CBOMB two-phase-flash
  guard, narrowed a catch cast, renamed the duplicate `interface Input` → `LivePaletteInput`.

**Tests:** 19/19 pt1-22 GREEN (16 + 3 net new from the rework). Full defender project 1096 green;
`npm run lint` clean. Mutation-proven load-bearing (rework round, each restored after):
`LASER_PERIOD 2→1` reds the laser-cadence guard; removing the COLTAB terminator reset reds the wrap
guard; `TIE_PERIOD 6→3` reds the TIE-cadence guard; deleting the CBOMB flash branch reds the
two-phase-flash guard. Original green baseline: ALL projects 18235 green; orchestrator 503 green;
`build-app.mjs defender` builds (56 kB); COLTAB[0] 0x38→0x99 reds §4b.

**Rework round (Heimdall REJECTED 2026-08-20):** all 7 findings fixed — tests + comments only, NO
behavioural code change (the implementation was and remains correct). Findings 1-2 (drifted ROM
citations), 3 (vacuous wrap guard), 4 (cadences not load-bearing), 5 (untested two-phase flash),
6 (catch cast), 7 (duplicate interface name). See the rework Design Deviation for the per-finding fix.

**The bug fixed:** the laser (index 1), bombs (A/C), TIEs & mutant pixel (C/D/E/F) were drawn every
frame in registers frozen at `$00` boot black. Now `SimState.pcram` is live, the standing cyclers
animate those registers per ROM, and `render` decodes through the moving shadow — the laser is a
shimmering streak, not black-on-black. Prerequisite for pt1-23 (bomb/TIE/pod sprite visibility) and
pt1-25 (smart-bomb wash) is satisfied: registers A/C/D/E/F now carry real colour.

**Note (not blocking):** this is an owner-reported RENDER fix; the tests prove the fix at the pixel
level (render output tracks the live palette), but a visual playtest at `/defender/` (fire the laser,
confirm the streak is coloured) is a worthwhile Reviewer/owner confirmation.

**Handoff:** To review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): the wave-colour set (`WCTAB` → PCRAM+5, DEFA7.SRC:1266) and the
  player-death monochrome effect (PCRAM+$B, DEFA7.SRC:1364 / BLK71.SRC PX routine) are the two
  remaining live-palette writes NOT covered here. WCTAB (per-wave index-5 recolour) is a small
  fidelity gap for a future story; the PCRAM+$B death effect is pt1-25's scope (R2). Neither blocks
  pt1-22. Affects `plugins/defender/src/core/color-cycle.ts` (would extend it). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the RED-phase scaffold preamble (`pt1-22-live-palette.test.ts:47`)
  and the `loadCycle` "not built yet" error string (`:148`) cite COLTAB as `DEFA7.SRC:3037-3043`,
  but line 3043 is a `*` separator — the table's FCB rows are `3037-3042` (as correctly used at the
  load-bearing byte-check `:489` and `color-cycle.ts:33`). Cosmetic, non-gating, pre-existing (not
  touched by the rework). Affects `plugins/defender/tests/pt1-22-live-palette.test.ts` (fix the two
  `3037-3043` strings to `3037-3042` for consistency next time this file is opened). *Found by
  Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Bomb colour pick uses a self-contained counter, not the gameplay RNG**
  - Spec source: ROM `CBOMB` (defender/DEFB6.SRC:1217-1218), `LDA SEED / ANDA #$1F`
  - Spec text: the bomb colour index is drawn from the free-running hardware `SEED`
  - Implementation: `core/color-cycle.ts` `nextBombSeed` is a self-contained LCG seeded from a
    fixed constant; the cyclers never read the injected `rand`.
  - Rationale: In the clone `rand` is the GAMEPLAY entropy stream threaded through every enemy
    bank (createSim/stepSim → enemy/mutant/ufo/bomber banks). Drawing from it in a per-tick
    palette cycler would desync ~15 rand-sensitive sim tests (frame hashes, exact enemy
    positions) — measured before choosing the design. The ROM's `SEED` was a shared free-running
    counter the clone deliberately separates; a self-contained counter preserves the pseudo-random
    bomb-flash *feel* while keeping the palette pure and non-perturbing. All 18235 fleet tests +
    503 orchestrator stay green, confirming zero RNG-stream perturbation.
  - Severity: minor
  - Forward impact: minor — the exact bomb-flash colour SEQUENCE differs from a hardware capture
    (imperceptible frame-to-frame; the clone cannot reproduce the free-running SEED regardless).
    pt1-23 (bomb sprite visibility) only needs registers A/C to be non-black, which holds.
- **Corrected my own TEA test §6b (different rand → SAME pcram, was: different pcram)**
  - Spec source: pt1-22 RED suite `pt1-22-live-palette.test.ts` §6, authored by me as TEA this session
  - Spec text: "a different rand yields a DIFFERENT shadow sequence (the entropy is actually consumed)"
  - Implementation: rewrote §6b to assert a different rand yields the SAME pcram sequence — the
    palette cyclers are gameplay-entropy-independent.
  - Rationale: the original assertion encoded a WRONG contract — it required the palette to leak
    gameplay entropy, which is exactly the behaviour that would break the sim suite (see the
    deviation above). The corrected assertion is STRONGER, not weaker: a cycler that wrongly drew
    from the shared `rand` (the real regression) now reds it. This is a test correction with a
    logged rationale, not a weakening-to-pass. Non-vacuity is preserved by §3/§4 (pcram is proven
    to CHANGE over ticks) and §6a (determinism / no wall-clock).
  - Severity: minor
  - Forward impact: none — the corrected contract matches the shipped, fleet-green behaviour.
- **Added a §4b ROM-source byte-check to close the #18/#26 gap in the RED suite**
  - Spec source: lang-review typescript.md #18/#26; AC "mutation-proven constants"
  - Spec text: constants must be mutation-proven, not self-referential fixtures
  - Implementation: added an INDEPENDENT vendored-source reader (the charset-gate.test.ts pattern)
    that parses the COLTAB/TCTAB FCB rows and asserts the exported constants equal them.
  - Rationale: §3/§4 pin the cyclers' wiring against the exported COLTAB/TCTAB, but "laser values
    ⊆ COLTAB" cannot catch a flipped byte IN COLTAB (both move together). The single-sided citation
    gate byte-verifies the CLAIM against source but not the OURS-side constant. §4b closes the loop;
    mutation-proven (0x38→0x99 reddened exactly §4b, reverted). Also enrolled COLTAB/TCTAB in the
    citation gate (`claims/21-color-cycle.json`), byte-verified by the existing whole-dir sweeps.
  - Severity: minor
  - Forward impact: none — additive test strengthening.
- **Rework round (Heimdall REJECTED 2026-08-20): fixed 2 drifted ROM citations + made 4 guards load-bearing**
  - Spec source: Reviewer Assessment findings 1-7 (this session); lang-review #11/#18/#29
  - Spec text: two ROM citations point at the wrong source lines; two "load-bearing" guards are
    mutation-proven vacuous; a cadence-magnitude guard is absent
  - Implementation: tests + comments only, NO behavioural code change (implementation was correct).
    (1) `color-cycle.ts:64` TIE cadence citation `:1197,1204` → `:1197` (`:1204` is `BLO TIECL1`,
    a branch, not a NAP — verified against DEFB6.SRC). (2) CBOMB SEED-pick citation `:1219` →
    `:1217-1218` (`LDA SEED`=:1217, `ANDA #$1F`=:1218; `:1219` is `LDX #COLTAB`) at the header
    comment (:15), the inline comment (:139 → `:1217-1220` for the full `COLTAB[SEED AND $1F]`
    lookup), `BOMB_PICK_MASK` (:70 → `:1218`), and this deviation's Spec source above. (3) Rewrote
    the §3b "cycle wraps" guard: was "some laser value recurs" (vacuous — COLTAB has adjacent dup
    pairs, so a monotonic pass already 'revisits'), now asserts COLTAB[0] (0x38, unique) recurs
    ≥2× ⇒ a real wrap; mutation-proven (removing the terminator reset reds it). (4) Added
    cadence-magnitude guards: laser hold == 2 ticks (SLEEP #2), TIE row hold == 6 ticks (NAP 6),
    both against ROM-derived literals not the private consts — mutating `LASER_PERIOD 2→1` /
    `TIE_PERIOD 6→3` each red. (5) Added a CBOMB two-phase-flash guard (a frame with A=$FF, C=$00);
    deleting the flash branch reds it. (6) Narrowed a catch cast (#11); (7) renamed the duplicate
    `interface Input` → `LivePaletteInput` (#18).
  - Rationale: this is a ROM-fidelity project; a drifted citation or a green-but-vacuous guard is a
    "green light wired to nothing" that pt1-23/pt1-25 would build on. All fixes verified by mutation
    (each guard proven to red on the exact regression it claims to catch) and the suite re-run green.
  - Severity: minor
  - Forward impact: none — corrects citations to match source and strengthens existing guards.

### Reviewer (audit)
Round-2 re-review (Heimdall). All four Dev deviations audited:
- **Bomb colour pick uses a self-contained counter, not the gameplay RNG** → ✓ ACCEPTED: sound and
  necessary — rule-checker #31 confirmed `stepColorCycle(cc, pcram)` never receives `rand`, purity
  gate (52 green) confirms clock/entropy-freedom, and §6b mutation-proves a cycler that leaked the
  gameplay rand would red. The ROM's shared free-running SEED is legitimately unreproducible in a
  clone whose `rand` is gameplay entropy; the LCG preserves the pseudo-random feel without perturbation.
- **Corrected TEA test §6b (different rand → SAME pcram)** → ✓ ACCEPTED: a strengthening, not a
  weakening-to-pass — test-analyzer confirmed §6 is non-vacuous and the corrected assertion reds if a
  cycler draws from gameplay rand. Matches the accepted deviation above.
- **Added §4b ROM-source byte-check** → ✓ ACCEPTED: comment-analyzer verified the line ranges
  (`DEFA7.SRC:3037-3042`, `DEFB6.SRC:1207-1209`) and test-analyzer mutation-proved it (flipping a
  COLTAB byte reds it) — a genuine independent read of the vendored source, closing the #18/#26 gap.
- **Rework round: 2 citation fixes + 4 load-bearing guards** → ✓ ACCEPTED: this round's deliverable;
  comment-analyzer confirmed both citations now match source bytes, test-analyzer mutation-proved all
  four guards load-bearing, rule-checker found 0 violations. No undocumented deviations found.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN (1093 pass), lint clean, no debug/smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled via settings)
**Total findings:** 7 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

**Reviewed by Heimdall, 2026-08-20 — rework required.**

The implementation is behaviourally correct and the fleet is green (1093 defender / 18235 all
projects / 503 orchestrator / lint clean / builds). The R1 bug is genuinely fixed: `render` now
decodes through the live `sim.pcram` and the three standing cyclers animate registers 1/A/C/D/E/F.
The core/shell purity boundary and ADR-0005 background-safety are both upheld (independently
re-verified below). **But four HIGH findings block approval** — this is a ROM-fidelity story, and
two of its ROM citations are drifted while two of its "load-bearing" test guards are
mutation-proven vacuous (a fifth cadence guard doesn't exist at all). In a project whose entire
premise is faithful ROM citation, these are not nitpicks.

### Findings (all confirmed; none dismissed)

**HIGH — must fix:**
1. **[DOC] Drifted ROM citation — TIE cadence** (`color-cycle.ts:64`). `TIE_PERIOD = 6 // TIECOL:
   NAP 6 (defender/DEFB6.SRC:1197,1204)`. Verified against source: `:1197` IS `NAP 6,TIECL` ✓, but
   `:1204` is `BLO TIECL1` (the loop-back), NOT a NAP. Fix: cite `:1197` only (drop `,1204`), or
   re-label 1204 as the loop-exit if you want it. *Independently confirmed by me + [DOC].*
2. **[DOC] Drifted ROM citation — CBOMB SEED pick** (`color-cycle.ts:15` and `:139`).
   `defender/DEFB6.SRC:1219 LDA SEED / ANDA #$1F` — but `LDA SEED` is `:1217`, `ANDA #$1F` is
   `:1218`; `:1219` is `LDX #COLTAB`. Fix: cite `:1217-1218` for `LDA SEED / ANDA #$1F` at BOTH
   `color-cycle.ts:15` and `color-cycle.ts:139` (and the deviation at `.session:227` for the record).
   Audit all three occurrences in one pass (the byte-verified `claims/21-color-cycle.json` is
   correct — the drift is only in the free-text comments the citation gate does not cover).
3. **[TEST] The "cycle wraps" guard is a mutation-proven FALSE POSITIVE** (`pt1-22-live-palette.test.ts`
   §3b, ~line 344). It asserts "some laser value is revisited" — but COLTAB has three adjacent
   duplicate pairs (`0x47,0x47 / 0x87,0x87 / 0xc7,0xc7`), so a single monotonic pass already
   "revisits" a value with ZERO wraparound. [TEST] deleted the terminator-reset (froze idx at the
   table end) and all 16 tests stayed green. Fix: assert the wrap DIRECTLY — run > one full pass
   (36 × LASER_PERIOD ticks) and assert the laser register returns to `COLTAB[0]`, or that the
   ordered first-pass sequence repeats from index 0. *This is the exact defect the story's §3b claims
   to prevent.*
4. **[RULE] The ROM-cited cadences are not load-bearing** (`color-cycle.ts:62-65`, lang-review #29).
   `LASER_PERIOD=2 // SLEEP #2`, `TIE_PERIOD=6 // NAP 6`, `BOMB_FLASH_PERIOD=3`, `BOMB_COLOUR_PERIOD=6`
   are cited as ROM facts, but NO test asserts any cycler's tick-SPACING as a magnitude — only
   variety/wrap/membership. [RULE] mutated `LASER_PERIOD 2→1` (halving the ROM cadence) and the suite
   stayed 16/16 green. Per this project's rule that every cited ROM constant must be load-bearing,
   add a cadence-magnitude test: count the run of unchanged `f[LASER]` frames and require it to equal
   `LASER_PERIOD`, and likewise for at least one of the TIE/BOMB periods.

**MEDIUM — should fix in this rework:**
5. **[TEST] CBOMB's two-phase flash is untested** (§4, lang-review #29-adjacent). The `$FF`/`$00`
   flash phase (`BOMB_A=0xFF` while `BOMB_C=0x00` — the one moment A≠C, and the register-C shimmer
   the header cites) is never observed; [TEST] deleted the whole flash branch and every test stayed
   green. Add a test that plays until a frame has `BOMB_A === 0xFF && BOMB_C === 0x00` (A ≠ C),
   pinning the two-phase behaviour the comments describe.

**LOW — fix while in here (both match project rules, so not dismissible):**
6. **[RULE] Unnarrowed catch cast** (`pt1-22-live-palette.test.ts:149`, lang-review #11).
   `catch (e) { ... (e as Error).message ... }` — narrow first: `e instanceof Error ? e.message : String(e)`.
7. **[RULE] Duplicate `interface Input` name** (`pt1-22-live-palette.test.ts:73`, lang-review #18).
   Same name, different shape (7 fields/2 optional) as `interface Input` in
   `df5-8-sim-wave-wiring.test.ts` (5 fields). Rename (e.g. `LivePaletteInput`) or extract a shared
   fixture — "one concept, two helpers" drift.

### Rule Compliance (lang-review/typescript.md + CLAUDE.md purity)

Enumerated by rule-checker (32 rules, 61 instances) and cross-checked by me:
- **#31 purity boundary (CLAUDE.md's #1 rule):** COMPLIANT — `color-cycle.ts` is pure core; the
  purity AST sweep (`purity.test.ts`, 49 green) scans it and finds no clock/entropy/DOM. `nextBombSeed`
  is a fixed-seed LCG, never `Math.random`/`Date.now`/the injected `rand`. VERIFIED.
- **#32 colours-by-index (CLAUDE.md):** COMPLIANT — `render.ts` adds no hex/RGBA literal; every pixel
  still resolves through `indexToRgba`/`resolveCram` by index. COLTAB/TCTAB are raw BBGGGRRR bytes
  (core data), same pipeline as `DEFAULT_PCRAM`. VERIFIED.
- **#14 edge-in-one-branch:** COMPLIANT — `stepColorCycle` advances at `stepSim`'s single exit, not in a
  conditional branch. VERIFIED (`sim.ts` return site).
- **#4 ?? vs ||:** COMPLIANT — `pcram ? resolveCram(pcram) : CRAM` is a presence gate on an array, no
  0/"" pitfall.
- **#5 module hygiene:** COMPLIANT — `.js` extensions present; `type ColorCycleState` imported type-only.
- **#11:** VIOLATION (finding 6). **#18:** VIOLATION (finding 7). **#29:** VIOLATION (finding 4).
- **#15/#25/#26/#28 (source-text guards):** COMPLIANT — §4b bounds its read to explicit line ranges and
  compares against imported constants, not whole-file regex; bounds are independent literals.
- **ADR-0005 large-area strobe / epilepsy:** COMPLIANT — §5 pins register 0 (whole-screen background)
  never cycled; only {1,A,C,D,E,F} move (small-area sprites/laser). [TEST] mutation #4 (cycler writes
  register 0) is caught. VERIFIED — accessibility invariant holds.

### Observations (≥5)
- `[VERIFIED]` R1 fix end-to-end: input.fire → laser drawn at index 1 (`scene.ts:113`) → `render(ctx, fb,
  sim.pcram)` → `indexToRgba(1, cram)` with cram[1] cycled non-black. Before: cram[1]≡0x00. Evidence:
  `render.ts:69,88`, `main.ts:171`.
- `[VERIFIED]` immutability: `stepColorCycle` returns `pcram.slice()`; `state.pcram` untouched
  (`color-cycle.ts:104`). §1c mutation (#7 aliasing) is caught.
- `[VERIFIED]` no out-of-bounds: COLTAB idx ∈ 0..36 (37 entries), tieRow×3 ≤ 8 (9 entries), bombSeed&0x1f ≤
  31 — all in bounds (rule-checker #21).
- `[VERIFIED]` claims file `21-color-cycle.json` is byte-correct — [DOC] cross-checked all 20 claims
  against source; the whole-dir `checkClaims(loadClaims())` sweeps stay green.
- `[TEST]` §3b wrap guard vacuous (finding 3). `[RULE]` cadences not load-bearing (finding 4). `[DOC]`
  two citation drifts (findings 1-2).
- `[VERIFIED]` the §6b test correction (Dev deviation) is legitimate, not a weakening-to-pass: the new
  "different rand → SAME pcram" assertion RED-s if a cycler leaks gameplay rand ([TEST] mutation #8
  confirms), and non-vacuity is held by §3/§4. Sound.

### Devil's Advocate

Suppose this code is broken. The most dangerous surface is the *illusion of fidelity*: every ROM cadence
is written down as a cited constant, so a reader trusts that the laser shimmers at exactly the ROM's rate
and the bombs flash on the ROM's schedule — yet rule-checker proved that halving `LASER_PERIOD` changes
nothing any test can see. A future refactor that "tidies" the four PERIOD constants, or an accidental
transposition (BOMB_FLASH_PERIOD ↔ BOMB_COLOUR_PERIOD), ships a visibly-wrong animation with a green
suite and four confident citations vouching for it. Worse, two of those citations already point at the
wrong source lines (`:1204` is a branch, `:1219` is `LDX #COLTAB`), so a maintainer who "mechanically
re-anchors" them — lang-review #17's named hazard — would re-assert a drifted paragraph as current. The
wrap guard is the same trap one level down: it *looks* like it proves the COLR terminator loops, but it
passes on COLTAB's adjacent duplicates whether or not the wrap exists, so deleting the terminator (a real
regression that would freeze the laser on `0x3C` forever) sails through. A confused maintainer would read
"the cycle wraps ✓" and trust it. And the two-phase bomb flash — the very mechanism the header calls the
mutant shimmer — could be deleted wholesale with a green suite. None of these break the game *today*
(the code is correct), but each is a green light wired to nothing, and this story is a PREREQUISITE that
pt1-23/pt1-25 will build on top of — a silent cadence or wrap regression baked in here re-bakes into every
consumer. The fixes are small and mechanical; the cost of shipping the illusion is that the next person
trusts it. Reject, fix, re-verify.

### For Dev (rework round)
Fix findings 1-7. The 4 HIGH items are the gate: the two citation drifts (grep every occurrence), the
wrap test (assert return-to-COLTAB[0]), and at least one cadence-magnitude test. Keep the suite green and
re-run the purity + citation gates. This is tests + comments only — no behavioural code change is required
(the implementation is correct).
## Review Correlation

All findings are from the INTERNAL reviewer (Heimdall). No external-reviewer, CI, or automated-tooling
findings this round (`gh pr view --comments` n/a — no PR yet; deploy/CI untouched). Every finding maps
to an EXISTING check in `.pennyfarthing/gates/lang-review/typescript.md` — the checklist already
enumerates all seven classes, so no NEW_CHECK is warranted; the pipeline miss was a process failure
(the checks existed and were not applied), not a knowledge gap.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| 1 | reviewer | Drifted ROM citation — TIE cadence `:1197,1204` (`:1204` is `BLO TIECL1`, a branch, not a NAP) | EXISTING_CHECK | #17 (mechanical re-anchor / stale doc claim) | Dev missed #17 — fixed comment to `:1197` |
| 2 | reviewer | Drifted ROM citation — CBOMB SEED pick `:1219` (`:1219` is `LDX #COLTAB`, not `LDA SEED / ANDA #$1F`) | EXISTING_CHECK | #17 + #24 (sweep every citation spelling) | Dev missed #17 — fixed all 4 sites + the session deviation to `:1217-1218` / `:1217-1220` |
| 3 | reviewer | "cycle wraps" guard is a mutation-proven false positive (COLTAB adjacent dup pairs satisfy "some value recurs" with zero wraparound) | EXISTING_CHECK | #15 (every guard mutation-tested) + #18 (fails by passing) | Dev missed #15 — rewrote to assert COLTAB[0] recurs ≥2×; mutation-proven (removing terminator reset reds) |
| 4 | reviewer | ROM-cited cadences not load-bearing (`LASER_PERIOD 2→1` kept suite green) | EXISTING_CHECK | #29 (ordering assertion standing in for a magnitude) | Dev missed #29 — added laser+TIE cadence-magnitude guards vs ROM literals; both red on mutation |
| 5 | reviewer | CBOMB two-phase `$FF`/`$00` flash untested (flash branch deletable, suite stays green) | EXISTING_CHECK | #15 (delete the mechanism, require red) | Dev missed #15 — added A=$FF/C=$00 flash guard; deleting the flash branch reds it |
| 6 | reviewer | Unnarrowed catch cast `(e as Error).message` | EXISTING_CHECK | #11 (`catch (e: unknown)` and narrow) | Dev missed #11 — narrowed to `e instanceof Error ? e.message : String(e)` |
| 7 | reviewer | Duplicate `interface Input` (same name, different shape as a sibling test file) | EXISTING_CHECK | #18 (one concept, two helpers) | Dev missed #18 — renamed to `LivePaletteInput` |

### Signal Summary
- **External findings: 0** (no PR/CI/AI-reviewer feedback this round)
- **CI findings: 0**
- **Internal findings: 7** (all caught in-process by Heimdall)
- **New checks added: 0** — all 7 map to existing checks (#11, #15 ×2, #17 ×2, #18, #29); the checklist
  already covers every class, so this was a process failure (checks not applied), not a knowledge gap
- **Repeat-miss note:** check #15 was missed twice this round (findings 3 & 5) and #17 twice (findings
  1 & 2). Not yet at the 3+-across-PRs promotion threshold within a single check, but flagged here so a
  future recurrence trips it.
## Subagent Results

**Cycle: 1**

Method: re-ran all enabled subagents against the full story diff (`develop...HEAD`) for this rework cycle. Toggles: `edge_hunter`, `silent_failure_hunter`, `type_design`, `security`, `simplifier` disabled via `workflow.reviewer_subagents`.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1096 tests green, purity 52, citation gate enrolled, lint clean, no debug code |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | confirmed 0 new; the 3 prior test findings (wrap/cadence/flash) all mutation-proven fixed in an isolated worktree |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (LOW) | confirmed 1 non-blocking (3037-3043 scaffold off-by-one → delivery finding); both prior citation drifts verified fixed, all other citations audited correct |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 32 rules / 71 instances / 0 violations; #11/#18/#29 confirmed fixed, #31 purity + #32 colours-by-index compliant |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred; the 4 HIGH + 1 MEDIUM from round-1 all mutation-proven fixed

**Working-tree audit:** `pf reviewer audit-tree` first reported DIRTY over `sprint/epic-pt1.yaml` (the pf review-activation status stamp `in_progress → in_review`, tracking-only — NOT a subagent mutation; test-analyzer used an isolated git worktree, confirmed). Restored via `git checkout -- sprint/epic-pt1.yaml`; re-audit CLEAN (exit 0).

## Reviewer Assessment

**Verdict:** APPROVED (re-review, Cycle 1 — supersedes the round-1 REJECTED verdict)

**Reviewed by Heimdall, 2026-08-20 — rework accepted.** All four HIGH and the one MEDIUM finding from
round-1 are fixed and, crucially, each fix is **mutation-proven load-bearing** — verified independently
by the test-analyzer in an isolated worktree, not merely asserted. The two LOW rule findings are fixed.
The implementation was correct before and is unchanged (this was a tests + comments round); the fleet
stays green (1096 defender, purity 52, citation gate enrolled, lint clean).

**Data flow traced:** `input.fire → laser drawn at palette index 1 (core/scene.ts) → render(ctx, fb,
sim.pcram) → indexToRgba(1, resolveCram(sim.pcram))` — the live shadow, cycled non-black by the standing
COLR process, decodes to a visible colour distinct from the background (index 0). The R1 black-on-black
bug is fixed end-to-end and remains so.

**Pattern observed:** ROM-cadence constants pinned by magnitude, not ordering — `firstHoldTicks(frames,
TIE_E, 0x00) === 6` and the laser hold `=== 2`, each against a ROM-derived LITERAL independent of the
private period consts (`pt1-22-live-palette.test.ts:375-389, 424-435`). This is the correct fix for a
lang-review #29 defect: the assertion carries the number, cited to source, and reddens on mutation.

**Error handling:** the sole catch (`loadCycle`, `pt1-22-live-palette.test.ts:149`) is narrowed via
`e instanceof Error ? e.message : String(e)` — compliant with rule #11 under `strict` catch-as-unknown.

### Findings by round-1 item (all confirmed FIXED via subagent mutation/verification)

- `[DOC]` **1 & 2 — drifted ROM citations FIXED** (`color-cycle.ts:15,64,70,139`). comment-analyzer
  re-read the vendored source byte-by-byte: `:1197` IS `NAP 6,TIECL` (the `,1204` branch-line dropped);
  CBOMB now cites `:1217-1218`/`:1217-1220`/`:1218` with `1217=LDA SEED, 1218=ANDA #$1F, 1219=LDX
  #COLTAB, 1220=LDA A,X`. No `:1219` drift remains in src/tests/docs or the session deviation. Every
  other citation in the file audited correct in one pass.
- `[TEST]` **3 — vacuous wrap guard FIXED** (`pt1-22-live-palette.test.ts:357-373`). Now asserts
  `COLTAB[0]` (0x38, verified unique) recurs ≥2×. test-analyzer mutation: deleting the terminator reset
  reds it directly (`expected 1 to be ≥ 2`). Genuinely load-bearing.
- `[TEST]`/`[RULE]` **4 — cadences now load-bearing FIXED** (`:375-389, 424-435`). `LASER_PERIOD 2→1`
  reds the laser-cadence test; `TIE_PERIOD 6→3` reds the TIE-cadence test; both literals are
  test-local + ROM-cited, so they don't move with the mutation (#26-safe, rule-checker confirmed).
- `[TEST]` **5 — CBOMB two-phase flash FIXED** (`:437-448`). Asserts a frame with `A=$FF && C=$00`;
  deleting the flash branch reds it (`expected undefined to be truthy`).
- `[RULE]` **6 — catch narrowed FIXED** (`:149`), **7 — duplicate `interface Input` renamed FIXED**
  (`LivePaletteInput`, `:73`; grepped clean of collisions).

### New finding this round

- `[DOC]` **LOW / non-blocking:** the RED-phase scaffold preamble (`:47`) and `loadCycle` error string
  (`:148`) cite COLTAB as `DEFA7.SRC:3037-3043`; line 3043 is a `*` separator, so the range should be
  `3037-3042` (as used at the load-bearing byte-check `:489` and `color-cycle.ts:33`). Pre-existing
  (untouched by the rework), non-gating scaffold prose — recorded as a Delivery Finding for opportunistic
  tidy, does not block. Round-1's citation findings pointed at WRONG code (a branch, a different
  instruction); this is a one-line inclusive off-by-one onto a comment separator — materially LOW.

### Rule Compliance (lang-review typescript.md #1-#30 + CLAUDE.md #31/#32)

rule-checker enumerated 32 rules / 71 instances / **0 violations**; I cross-checked the rework-relevant ones:
- **#31 purity (CLAUDE.md #1 rule):** COMPLIANT — `color-cycle.ts` has zero imports, no clock/entropy/DOM;
  `stepColorCycle` never receives `rand`; purity AST sweep (52 green) scans it. VERIFIED.
- **#32 colours-by-index:** COMPLIANT — render path adds no hex/RGBA literal; every pixel resolves via
  `indexToRgba`/`resolveCram` by index (`render.ts:76,80,88`). VERIFIED.
- **#11:** FIXED (finding 6). **#18:** FIXED (finding 7). **#26/#29:** the two cadence tests are magnitude
  assertions with test-local ROM literals, not self-referential. VERIFIED.
- **#14 edge-in-one-branch:** COMPLIANT — `stepColorCycle` advances at `stepSim`'s single exit.
- **#15/#25/#28 (source-text guards):** COMPLIANT — §4b/§4 read bounded line ranges + imported constants,
  not whole-file regex; `sourceTableBytes` takes explicit filenames, not a glob.
- **ADR-0005 large-area strobe / epilepsy:** COMPLIANT — §5 pins register 0 never cycled; only
  {1,A,C,D,E,F} move. VERIFIED (preflight gate + rule-checker #19).

### Observations (≥5)

- `[VERIFIED]` R1 fix intact end-to-end — `render(ctx, fb, sim.pcram)` decodes the live shadow; laser
  index 1 non-black within ~2s of play (`§2`, `render.ts:76`).
- `[VERIFIED]` all four new/rewritten guards mutation-proven by test-analyzer in an ISOLATED worktree —
  the live tree was never touched (audit-tree CLEAN after the status-stamp restore).
- `[VERIFIED]` COLTAB[0]=0x38 is unique in the 37-byte table, so the wrap test's marker is sound
  (independently confirmed by test-analyzer + my own read).
- `[VERIFIED]` both citation drifts closed; every other ROM citation in `color-cycle.ts` audited correct
  in one pass (comment-analyzer).
- `[VERIFIED]` 0 rule violations across 32 rules / 71 instances (rule-checker); purity + colours-by-index hold.
- `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` n/a — those subagents are disabled via settings; the
  change is a pure deterministic core layer + a render-decode arg with no new I/O, auth, or entropy
  surface, so the disabled dimensions carry low risk for this diff.

### Devil's Advocate

Suppose this rework only *looks* fixed. The round-1 rejection was itself about the illusion of fidelity —
green guards wired to nothing — so the adversarial question for round-2 is whether the *fixes* are
themselves vacuous: a cadence test that reds for the wrong reason, a wrap marker that isn't actually
unique, a citation "corrected" to a second wrong line. Each was probed. The wrap test rests on COLTAB[0]
being unique; if 0x38 appeared twice, "recurs ≥2×" would pass on a non-wrapping ramp — but 0x38 is
verifiably the only 0x38 in the table, and deleting the terminator reset still reds the test, so the
marker holds. The cadence tests could be self-referential if `LASER_CADENCE_TICKS` re-imported the private
`LASER_PERIOD` — then the mutation would move both sides and the test would stay green; but the literal is
declared in the test and the const is not even exported, and the mutation battery confirms `2→1` reds only
the new test while the other 18 stay green (the exact blast-radius proof #29 demands). The corrected
citations could point at a new wrong line; comment-analyzer re-read the actual bytes and confirmed
`1217=LDA SEED, 1218=ANDA #$1F, 1219=LDX #COLTAB, 1220=LDA A,X`, so `:1217-1218` and `:1217-1220` are
right, not merely different. The one crack found — `3037-3043` in scaffold prose — is real but cannot
mislead a maintainer into wrong behaviour: it over-includes a `*` separator line, it is not exercised by
any test, and the load-bearing byte-check beside it uses the correct `3037-3042`. A confused reader who
trusts it reads one blank comment line too far and finds a separator, not wrong data. Nothing here is a
green light wired to nothing this time; the fixes bite. Approve.

### For SM (finish)

Land it. This is a PREREQUISITE for pt1-23 (bomb/TIE/pod sprite visibility) and pt1-25 (smart-bomb wash) —
registers 1/A/C/D/E/F now carry real live colour and the cadences/wrap are mutation-guarded, so those
consumers build on a pinned foundation. One non-blocking Delivery Finding (the `3037-3043` scaffold tidy)
is recorded for a future pass; it does not gate this story.

**Handoff:** To SM for finish-story.