---
story_id: "ml2-4"
jira_key: "ml2-4"
epic: "ml2"
workflow: "tdd"
---
# Story ml2-4: tools/bake-graphics.mjs -> committed *-data.ts + render a static playfield of stamps at /millipede/; VISUAL playtest for the ROT/orientation trap now, before physics (playbook section 4 — byte-equality hides orientation bugs, only a visual catch works).

## Story Details
- **ID:** ml2-4
- **Jira Key:** ml2-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml2-4-bake-graphics-static-playfield
- **Branch Strategy:** gitflow (feat/ml2-4-bake-graphics-static-playfield)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T19:20:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T18:46:31Z | 2026-08-12T18:48:10Z | 1m 39s |
| red | 2026-08-12T18:48:10Z | 2026-08-12T19:02:18Z | 14m 8s |
| green | 2026-08-12T19:02:18Z | 2026-08-12T19:11:19Z | 9m 1s |
| review | 2026-08-12T19:11:19Z | 2026-08-12T19:20:25Z | 9m 6s |
| finish | 2026-08-12T19:20:25Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap** (blocking for GREEN's local verification): the two licence-walled
  picture EPROM images (136013-107.r5, 136013-106.p5) are ABSENT in this
  checkout — ml2-1 was worked in a sibling checkout, and the images are
  gitignored so they never travelled. Dev must vendor them into
  `reference/original-source/millipede/` first (source: `~/roms/milliped.zip`;
  CRCs pinned in tests/audit/graphics-rom.test.ts) or the bake cannot run and
  the AC-3b/AC-6 skipIf teeth stay dormant. *Found by TEA during RED.*
  → RESOLVED in GREEN: Dev vendored both EPROMs from `~/roms/milliped.zip`;
  CRCs match the ml2-1 pins (f4468045 / 68c3437a); all skipIf teeth now run
  in this checkout (212/212, 0 skipped).
- **Improvement** (non-blocking, for the ml3+ render stories): the visual
  playtest shows the SCORE-VALUE glyphs are stored ROTATED 90° in the picture
  ROM (sideways "150"-style digit runs on the sheet) while the alphanumeric
  font is upright — Millipede's instance of the per-machine orientation quirk
  (playbook §4, pac-man's tiles-vs-sprites split). Whichever story blits
  motion-object point values must rotate them; the decode itself is correct.
  *Found by Dev during the ml2-4 visual playtest.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations.


## Impact Summary

**Upstream Effects:** 2 findings (1 Gap, 1 Improvement)
**Blocking:** None

**Resolved Issues:**
- **Gap:** Two licence-walled picture EPROM images (136013-107.r5, 136013-106.p5) were absent in this checkout during GREEN phase. Resolved by Dev vendoring both EPROMs from `~/roms/milliped.zip` with verified CRCs (f4468045 / 68c3437a). All 212 tests now run with no skips.

**Downstream Findings:**
- **Improvement:** Visual playtest revealed that score-value glyphs are stored rotated 90° in the picture ROM (sideways "150"-style digit runs), while alphanumeric font is upright. This is Millipede's instance of per-machine orientation quirk (playbook §4, comparable to pac-man's tiles-vs-sprites split). Routed to ml3+ render stories: whichever story blits motion-object point values must rotate them; the decode itself is correct.

### Downstream Impact

Cross-story coordination: 1 finding affects ml3+ render work
- **ml3+ render stories** — 1 improvement finding (score-value glyph rotation)

### Root Cause Analysis

The gap was environmental (checkout-specific gitignored files not synced from prior ml2-1 work). The improvement is a ROM encoding quirk, not a code defect — expected and captured for implementation in render stories.

## Sm Assessment

Setup complete for ml2-4 (tdd, 3 pts, epic ml2, repo arcade). Title-only story — the title is the spec: bake `tools/bake-graphics.mjs` output into committed `*-data.ts` modules and render a static playfield of stamps at `/millipede/`, as a VISUAL playtest for the ROT/orientation trap before any physics work (playbook section 4: byte-equality tests hide orientation bugs; only a visual check catches them). Session file created, story context written at `sprint/context/context-story-ml2-4.md`, feature branch `feat/ml2-4-bake-graphics-static-playfield` cut from develop. Jira not enabled — claim skipped. Handing off to TEA for the RED phase.

## TEA Assessment

**RED complete.** 13 failing tests across two new files, committed ceeaacc0;
194 pre-existing millipede tests still green, 5 skipped (licence-wall skips),
repo-wide lint clean. Verified by testing-runner (RUN_ID ml2-4-tea-red).

**ACs defined (title-only story — TEA-defined from the title, playbook §2/§4,
and the epic context):**

- **AC-1** `plugins/millipede/tools/bake-graphics.mjs` exists and is a THIN
  driver: imports `decodeStamp` from `../src/shell/gfx-rom.ts` (code, not
  comment — the wiring grep is comment-stripped) and does NOT re-implement the
  bitplane mask walk (no `0x80 >>` in the tool).
- **AC-2** Committed `src/shell/stamp-data.ts`: `STAMPS` = 256 stamps × 8 rows
  × 8 pixels, integers 0..3; provenance exports `LOW_PLANE_FILE =
  '136013-107.r5'` / `HIGH_PLANE_FILE = '136013-106.p5'` (MAME gfx1 load
  order, centiped.cpp:2226-2227 cited in prose via the ml2-1 claims);
  non-triviality tooth (pixel values 1, 2 AND 3 each occur — catches a dropped
  plane or an all-zero stub); GENERATED header line.
- **AC-3a** CLAIM-PINNED GOLDEN, runs on every clone with NO ROM on disk:
  stamps 0 and 1 must equal a fresh `decodeStamp` over a synthetic 32-byte
  region built from the ml2-1 byte claims (GFX-106/GFX-107 pin the first 16
  bytes of each EPROM in committed JSON). A plane-inverted bake swaps pixel
  values 1↔2 and reddens here — CI-safe teeth on the committed data.
- **AC-3b** Full byte-equality: all 256 baked stamps equal a fresh decode over
  concat(107.r5, 106.p5) — `skipIf` the EPROMs are absent (the ml2-1
  licence-wall CI invariant).
- **AC-4** `src/shell/render.ts` exports `drawStampPlayfield(ctx)` (256
  putImageData blits of 8×8 on the pinned 16×16 grid — stamp i at
  `((i%16)*8, (i>>4)*8)`; every pixel opaque and equal to
  `decodeColourByte(PLAYFIELD_COLOUR_BYTES[pixelValue])` — colours wired
  through the ml2-3 core seam) and `PLAYFIELD_COLOUR_BYTES` (4 valid bytes;
  index 0 decodes to black, 1..3 distinct non-black — which faithful bytes is
  Dev's visual call, CLRCH MLIRQ.MAC:242 is the pool).
- **AC-5** `src/main.ts` imports and calls `drawStampPlayfield` from
  `./shell/render` (comment-stripped source-wiring pins).
- **AC-6** Reproducibility: running the bake tool rewrites `stamp-data.ts`
  byte-identically (`skipIf` ROMs absent; restores the file afterwards so a
  failing bake never dirties the tree).

**The plane-order pin and the visual gate:** ml2-2 left chip→half ordering to
this story. The tests pin concat(107.r5 low, 106.p5 high) per the MAME gfx1
load order the ml2-1 claims corroborate. THE VISUAL PLAYTEST AT /millipede/ IS
THE FINAL ARBITER (the story's own point): if the sheet renders garbled or
inverted, the bake AND the AC-2/AC-3 pins flip together, in this story. The
human look at `just serve` → http://127.0.0.1:5270/millipede/ is a REQUIRED
step before review sign-off — no test here can see orientation.

**Rule Coverage** (.pennyfarthing/gates/lang-review/typescript.md +
plugin-standing guards):
- Source-text guards are comment-stripped and direction-restrictive (AC-1,
  AC-5) — a prose mention cannot satisfy them (#15/#25-adjacent).
- Vacuous-assertion self-check done: every test asserts concrete values; the
  pixel sweep guards its own loop (`checked === 256*64`); the non-triviality
  tooth rejects the all-zeros stub that shape tests alone would pass.
- Loaders use the ml1-1 self-describing-failure pattern with COMPUTED
  specifiers (the centipede bonus-lives model) so the RED tree stays
  lint-clean while the modules don't exist.
- GPL sweeps respected: no banned MAME spelling appears in the new files (the
  ml2-2 AC-5 / ml2-3 AC-4 plugin-wide walks stay green).
- Licence-wall invariant respected: every ROM-opening test skips per-file when
  the EPROMs are absent (CI-green safe).

**Handoff to Dev (GREEN):** vendor the two EPROMs into this checkout FIRST
(see Delivery Findings), then ship the bake tool, the baked module, render.ts
and the main.ts wiring. After GREEN, run the visual playtest and note what the
sheet shows in the session file.

## Dev Assessment

**Implementation Complete:** Yes — 13 RED tests green, nothing else touched.

**Files Changed:**
- `plugins/millipede/tools/bake-graphics.mjs` — thin driver (pac-man model):
  reads the two licence-walled EPROMs, asserts 2048 bytes each, assembles the
  region in MAME gfx1 load order (107.r5 first → LOW plane, 106.p5 second →
  HIGH; centiped.cpp:2226-2227 in prose), calls ml2-2's `decodeStamp` 256
  times, emits the module. No decode logic in the tool.
- `plugins/millipede/src/shell/stamp-data.ts` — GENERATED, committed: STAMPS
  (256 × 8 × 8, values 0..3) + LOW_PLANE_FILE / HIGH_PLANE_FILE provenance.
- `plugins/millipede/src/shell/render.ts` — `drawStampPlayfield` (256
  putImageData blits on the pinned 16×16 grid, every pixel
  `decodeColourByte(PLAYFIELD_COLOUR_BYTES[v])`, opaque) +
  `PLAYFIELD_COLOUR_BYTES = [0xff, 0x1f, 0xe7, 0x00]` — all from CLRCH's own
  vocabulary: $1F "RED" (MLIRQ.MAC:294), $00 "WHITE" (:297), $E7 from the 99$
  table (:304-:351, decodes to the wiring's pure green), $FF = no line driven
  = black background. Red/green/white inks make a plane inversion visible at
  a glance (1 = low only, 2 = high only, 3 = both).
- `plugins/millipede/src/main.ts` — draws the 128×128 sheet once offscreen,
  blits it integer-scaled + centred + smoothing-off each frame.
- Vendored (gitignored, NOT committed): the two EPROM images, CRC-verified.

**Verification:** 212/212 millipede (0 skipped — the licence-wall teeth run
here), 14986 repo-wide vitest, orchestrator suite green, `npm run lint`
clean, `node scripts/build-app.mjs millipede` builds. AC-6 reproducibility
ran live (bake → byte-identical rewrite).

**Visual playtest (the story's point) — PASS:** served this checkout on
:5290 (5270 was owned by a foreign-cwd process) and screenshotted
/millipede/. Mushroom stamps read as mushrooms (white caps, red/green
shading, upright, unmirrored); the full A-Z/0-9 font is legible left-to-right
(rules out mirror, whole-sheet rotation and plane scramble); critters pair
across adjacent stamps as 8×16 motion-object halves. One quirk logged as a
Delivery Finding for the ml3+ render stories: score-value glyphs are stored
rotated 90° in ROM. Screenshot: scratchpad/ml2-4-stamp-playfield.png (session
scratchpad; regenerate any time with `just serve` →
http://127.0.0.1:5270/millipede/).

**Branch:** feat/ml2-4-bake-graphics-static-playfield (pushed, 14eae1ba)
**PR:** #293 https://github.com/slabgorb/arcade/pull/293

**Handoff:** Reviewer for the review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (15464/15464 across millipede + full vitest + orchestrator, lint clean, 1 benign console.log in the CLI bake tool) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer mutation battery M1-M5 + decodeStamp/decodeColourByte guard review |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer: no catch blocks in shipped code; bake tool and main.ts throw loudly; test loaders re-throw with context |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 1 (F1), dismissed 2 (F2, F3 — rationale below) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (every MLIRQ.MAC line cite, the MAME load-order cite, the $E7/$FF decode claims and the table extent verified by hand against the quarry) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by rule-checker rules #1/#2/#4 (61 instances, 0 violations) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — static data page, no input/network surface; GPL sweeps green; domain covered by rule-checker #10/#32 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer: 52-line render, 81-line thin bake driver, no dead code (rule-checker #24 swept stale prose) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (34 rules × 61 instances, 0 violations; hand-recomputed the colour decode per rule #17) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 1 confirmed, 2 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**VERDICT: APPROVED** (round 1, with in-round fix F1 applied and
mutation-verified against the committed fix).

### Findings and dispositions

- **F1 [TEST] CONFIRMED (fixed in-round, 174ad0ae):** the per-pixel colour
  test derives its expectation from the same `PLAYFIELD_COLOUR_BYTES` export
  render.ts consumes, so swapping the ink literals kept all tests green
  (mutation-proven independently by the test-analyzer AND consistent with my
  own M-battery analysis) while render.ts's header prose cited the specific
  CLRCH bytes — the "prose is the unguarded surface" trap. Fix: the literal
  is now pinned (`[0xff, 0x1f, 0xe7, 0x00]`) in playfield.test.ts. Kill
  re-verified against the COMMITTED fix: the ink-swap mutant that survived
  before F1 now reddens exactly one test. 213/213 after.
- **F2 [TEST] DISMISSED:** string-literal evasion of the comment-stripped
  main.ts wiring greps. Rationale: the accidental variants are closed — a
  bare call to an unimported name fails `tsc` (repo-wide lint), and my M4
  mutant proves a real unwiring is killed — leaving only a deliberate
  evasion (decoy string + same-name local), which wiring pins have never
  claimed to stop; this is the repo's standing tempest/centipede wiring-pin
  convention, applied unchanged, not a regression of this diff.
- **F3 [TEST] DISMISSED:** same loophole shape on the bake tool's
  decodeStamp-import grep; same rationale, plus the AC-1 negative guard
  (no `0x80 >>`) mutation-fires (M5) and AC-3a/AC-3b bind the tool's OUTPUT
  to the real decoder byte-for-byte — a tool that stopped calling
  decodeStamp yet still emitted identical bytes is behaviourally the seam.

### Mutation battery (Reviewer-run, sequential, restored after each; all on committed code)

| # | Mutant | Result |
|---|--------|--------|
| M1 | bake tool assembles region 106-first (plane inversion) + rebake | KILLED by AC-3a claim-pinned golden (ROM-less tooth — the CI-critical kill) + AC-3b |
| M2 | render grid transposed | KILLED by the per-pixel stamp-identity test (note: the coordinate-Set assertion alone is transposition-blind — the pixel test is the identity-binding tooth; acceptable, suite kills) |
| M3 | render bypasses decodeColourByte (hardcoded ink) | KILLED by per-pixel colour equality |
| M4 | main.ts drawStampPlayfield call removed | KILLED by AC-5 call pin |
| M5 | `0x80 >>` planted in bake tool | KILLED by AC-1 thin-driver guard |
| M6 (post-F1) | PLAYFIELD_COLOUR_BYTES ink swap | survived pre-F1 (the finding); KILLED after the committed fix |

### Rule Compliance

Rule-by-rule enumeration delegated to reviewer-rule-checker (34 rules, 61
instances, 0 violations) and spot-verified by me: #1 type escapes (the
`as unknown as CanvasRenderingContext2D` fake-ctx is the repo-wide test
double idiom, 20+ precedents), #15/#25 source-text guards anchored +
comment-stripped + scope-bounded, #17 mechanism re-run (colour decode
hand-computed: $1F→(255,0,0), $E7→(0,222,0), $00→(255,222,255), $FF→black),
#31 core/shell boundary (new modules in shell; core imports nothing new),
#32 GPL sweep zero hits, #33 stamp-data.ts is data-only, #34 the bake
tool's import graph is erasable-syntax-only. [RULE] clean. [DOC] clean —
every cited quarry line re-opened. [EDGE] (self-covered): decodeStamp's
offset window and decodeColourByte's byte guard both pre-date this story
and the bake stays inside them (max offset 2040 = planeSize−8; length
asserted 2048 per EPROM before assembly).

### Review checklist observations (≥5)

1. [VERIFIED] Data flow traced end-to-end: EPROM bytes → region assembly
   (MAME gfx1 order, claim-corroborated) → decodeStamp → committed STAMPS →
   palette blit → scaled canvas; every seam carries an executable pin, and
   the one thing no test can see (orientation) got its designed VISUAL
   playtest, which passed and yielded a real finding (score glyphs stored
   rotated 90°, routed to ml3+ in Delivery Findings).
2. [VERIFIED] The AC-3a claim-pinned golden is the story's best tooth: it
   catches a plane-inverted bake on a clone with NO ROMs (M1 killed there),
   closing the licence-wall blind spot the skipIf tests would otherwise
   leave on CI.
3. [VERIFIED] AC-6 reproducibility is real, not accidental: the
   test-analyzer independently re-ran the bake and diffed byte-identical.
4. [VERIFIED] Error handling: bake tool throws on missing/short EPROM;
   main.ts throws on null 2d context; no swallowed errors anywhere in the
   diff (no catch in shipped code).
5. [NOTE] The coordinate-Set pin is transposition-blind in isolation (M2);
   binding comes from the pixel-identity test. If a future story touches the
   grid math, keep both tests together.
6. [NOTE] Vendored EPROM images are correctly licence-walled: gitignored,
   absent from the diff, CRC-verified in-checkout; CI stays green ROM-less
   by the established ml2-1 skip model.

**Final state:** 213/213 millipede, 15464 total across suites, lint clean,
app builds, PR #293 updated (174ad0ae). Story approved for finish.