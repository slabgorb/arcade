---
story_id: "cp1-4"
jira_key: "cp1-4"
epic: "cp1"
workflow: "tdd"
---
# Story cp1-4: Playfield + mushrooms — the 30x32 grid, seeding, damage states, scoring hooks, RESTOR sweep

## Story Details
- **ID:** cp1-4
- **Jira Key:** cp1-4
- **Workflow:** tdd
- **Stack Parent:** none (stack root)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T00:38:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T23:51:24Z | 2026-07-18T23:52:53Z | 1m 29s |
| red | 2026-07-18T23:52:53Z | 2026-07-19T00:19:46Z | 26m 53s |
| green | 2026-07-19T00:19:46Z | 2026-07-19T00:26:58Z | 7m 12s |
| review | 2026-07-19T00:26:58Z | 2026-07-19T00:38:04Z | 11m 6s |
| finish | 2026-07-19T00:38:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): rev-4 seeding addressing can overshoot the 30-wide grid. `h = ((RNGEN&3)<<3)|(RNGEN>>5)` yields 0–31, but the playfield is only 30 wide (h∈[0,29]); h∈{30,31} lands the 0x3F write in motion-object RAM (0x7C0+). P ≈ 1/16 per attempt → ~3 of the 46 attempts per seed. The grid-only sim must treat off-grid placements (h≥30) as **no-ops** (no cell, no MUSH count) — the clean faithful reduction. Affects `src/core/playfield.ts` (seedPlayfield). *Found by TEA during test design.*
- **Improvement** (non-blocking): the rev-4 RESTOR comment `;EVERY 16 FRAMES` (CENTI4.MAC:1832) is **wrong** — the code masks `AND I,07` → active every **8** frames. Code wins; captured in claim PM-23; AC-2 test demands the record in open-questions.md. *Found by TEA.*
- **Question** (non-blocking): CENTIP.DOC:142 "no mushrooms on the bottom line" (one line) **understates** rev-4, which reserves v=0 AND v=1 at the bottom (seeding walk floor 0x02) plus the top score row v=0x1F and player row v=1 (MUSHER). Code wins (claims PM-12/27/28/34). *Found by TEA.*
- **Gap** (non-blocking): the poison-mushroom band 0x38–0x3B (destroy at 0x37) is fully transcribed here (PM-19) but the *creator* of poison mushrooms is the scorpion, which is **cp3** scope. cp1-4 pins the encoding + damage/restore of poison cells; nothing seeds them yet. Pre-extracted for cp3. *Found by TEA.*

### Dev (implementation)
- **Improvement** (non-blocking): TEA's GREEN notes suggested wiring the rng/seed + playfield into `SimState` (`src/core/sim.ts`). No test in `tests/playfield.test.ts` (or elsewhere) exercises that wiring — `sim.ts` was left untouched (still the cp1-1 constant-free skeleton) to keep the change minimal and honest. The actual frame-stepped RESTOR sweep (armed on death, one restore per 8-frame pass across `MEM` 0x400→0x7BF) is also not implemented — only the per-cell `restoreMushroom` primitive the tests pin. Whichever future story wires the sim loop (motion-object table / frame stepper) should build the sweep stepper on top of `restoreMushroom` + `RESTOR_FRAME_MASK`/`RESTOR_START`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `damageMushroom(cell)` does not enforce its precondition — it unconditionally computes `cell - 1`, so `damageMushroom(0x00)` returns `{cell:-1,scored:0,destroyed:false}` and `damageMushroom(0x10)` decrements a non-mushroom (verified at runtime). The ROM's SHOOT routine guards internally (`CMP I,38 / BCC 108$` skips anything below the mushroom band — CENTI4.MAC:2152-2153). No current caller is affected: the determinism test and every legitimate caller gate with `isMushroom`, and `sim.ts` is unwired. But the frame-stepped shooter story (cp1-6) MUST gate `damageMushroom` behind `isMushroom` or add the `< MUSHROOM_MIN` guard inside. Related latent gap: `damageMushroom`/`restoreMushroom` compare on the raw `cell` while `isMushroom` masks `& 0x3F` — harmless only while cells never carry the top color bits (this model's faithful reduction), but a caller that ever passes a color-bearing code would diverge. Affects `src/core/playfield.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-2 reframed from "correct a number" to "record the diff outcome":** AC-2 says "where CENTIP.DOC prose and rev-4 code disagree on a number, code wins." Diffing the mushroom scoring: CENTIP.DOC (mushroom 1, partial/poison 5) **AGREES** with rev-4 code (PM-20/26/32/33) — no number to bake-correct. So the AC-2 test asserts open-questions.md **records the diff was done** (scoring 1/5 confirmed-agree) plus the genuine code-wins divergences found (RESTOR 8-frame cadence over the "16 frames" comment; reserved-rows detail). Reason: honestly, the headline scoring numbers match; the divergences are the RESTOR cadence and row-reservation, and the standing-rule value is recording the confirmation so a later story does not re-diff.
- **Playfield API is TEA-proposed, not story-specified:** the story says "suggest src/core/playfield.ts + additions to sim state." The RED suite pins a concrete contract — `Playfield { cells: Uint8Array(960), mush }` (offset = h*0x20+v), `seedPlayfield(rng)`, per-cell `damageMushroom`/`restoreMushroom`, `isMushroom`, `createPlayfield`, and the exported constants. Dev may refine names but the tests encode this shape. Reason: behaviour cannot be pinned without a callable surface; per-cell pure ops keep damage/RESTOR testable without a full frame loop.


## Impact Summary

**Delivery findings compiled:** 6 total, 0 blocking, 6 non-blocking (routed forward or documented).

**Finding categories:**
- **Gaps** (3): seeding overshoot (h≥30 no-op), poison-mushroom creator is cp3 scope, RESTOR sweep frame-stepped not implemented.
- **Improvements** (3): RESTOR cadence comment stale (code correct, record it), damageMushroom unguarded (routed cp1-6), SimState wiring untested (logged for future).
- **Questions** (1): CENTIP.DOC reserve-row spec understates code (code wins, recorded).

**Routing:**
- **Non-blocking to cp1-6** (shooter story): guard `damageMushroom` input, implement frame-stepped RESTOR sweep on top of `restoreMushroom` primitive.
- **Recorded in open-questions.md** (cp1-4 item 6): RESTOR cadence 8 frames (not 16), reserve-rows v={0,1,0x1F}, mushroom scoring 1/5 confirmed-agree.
- **Deferred (cp3 scorpion scope)**: poison-mushroom seeding logic.

**Story delivery:** core module complete, all 4 ACs satisfied, tests 128/128 green, build/lint/citations clean. No blocking findings.

## Story Acceptance Criteria

1. Grid dimensions, seeding counts, damage-state count, and per-state scoring all transcribed from rev-4 code with radix-cited comments AND claims/*.json entries; npm test -- citations green.
2. Where CENTIP.DOC prose and rev-4 code disagree on any number, the code wins and the divergence is recorded in docs/rom-study/open-questions.md.
3. Determinism test: identical seed + inputs reproduce the identical field through seeding, damage, and RESTOR.
4. No wall-clock, no Math.random in core (purity guard stays green).

## Sm Assessment

**Setup verified:** session + context files in place (epic context untouched), branch `feat/cp1-4-playfield-mushrooms` off origin/develop @ 8a8e8ad (cp1-3's merge), epic YAML flipped to in_progress, orchestrator setup commit a5fbdc5. Merge gate clear; no sibling cp1-4 race on origin.

**Story shape:** 5pt, `workflow: tdd` explicit. Repo centipede only. FIRST core-sim story — src/core/sim.ts is a constant-free skeleton by design; this story populates the playfield model behind the now-live citation gate.

**Hazards routed to TEA (O'Brien):**
- RADIX: CPU modules inherit .RADIX 16 from CENDE4 via .INCLUDE — PLYFLD=400 means 0x400=1024; every transcribed constant is HEX unless proven otherwise. Radix-cited comment + claims entry per constant (AC-1); claims for CPU files cite root or revision.v4/ paths (checker resolves root-first, then revision.v4/; revision.v2/ needs path-qualification).
- AC-2 is a STANDING RULE, not a checkbox: CENTIP.DOC scoring prose (mushroom 1, partial 5) is REV-1; open question 4 demands diffing prose against rev-4 CODE before baking any number. Where they disagree, code wins + record the divergence in open-questions.md.
- Seeding uses @arcade/shared/rng (seeded PRNG). Verify centipede/package.json — if @arcade/shared is not yet pinned, adding the pin is in scope (note the tag; red-baron pins the newest). The ROM's own seeding routine defines the COUNTS/PLACEMENT rules; the shared rng only supplies deterministic entropy. Be explicit in tests about which facts are ROM-transcribed (counts, rows, exclusions) vs. adapter policy (rng stream usage).
- Determinism (AC-3): same seed + same inputs → identical field through seeding, damage, RESTOR. Pin with a test; keep rng cursor in state (arcade-shared extraction lesson: cloneState needs a fresh rng cursor).
- Score/status rows: the 30x32 grid includes rows the game reserves for score/status — seeding and RESTOR must respect them per the ROM, cited.
- RESTOR (CENTI4.MAC:1826) is the repair sweep — transcribe its actual traversal/repair semantics, not a guess.
- Purity guard binds all of src/core (now with the cp1-2 hardening bans); no wall-clock, no Math.random (AC-4) — the seeded rng import is legitimate.
- Carry-forward NOT in scope: cp1-3's 2 LOW findings (decode-orientation pixel pin, width constants) belong to the future render story cp1-6.
- Sibling checkouts active (rb4-15 in flight elsewhere): re-verify no cp1-4 race at review.

**Peloton mode:** subagent peloton (user-directed) — SM drives phases via inline subagents.

**Routing:** phased tdd → next phase `red`, owner `tea`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** First core-sim playfield story — pins a transcribed ROM model behind the live citation gate. RED before GREEN, per the epic's discipline.

**Status:** RED (failing — ready for Dev/Julia). RED commit `c2c9734` on `feat/cp1-4-playfield-mushrooms`.

**Test Files:**
- `tests/playfield.test.ts` (NEW, 29 tests) — pins the playfield core module (`src/core/playfield.ts`, GREEN builds it). 25 RED (23 module-absent + 2 AC-2 open-questions), 4 GREEN provenance. Covers: geometry (AC-1), mushroom picture band, damage states, RESTOR, scoring, seeding, determinism (AC-3), AC-2 open-questions record, AC-1 claim provenance.
- `docs/rom-study/claims/06-playfield-mushrooms.json` (NEW, 34 claims) — TEA-authored, byte-verified against the vendored rev-4 tree (`node tools/audit/check-citations.mjs` → 99/99 verified).
- `package.json` + `package-lock.json` — pinned `@arcade/shared` at `github:slabgorb/arcade-shared#v0.15.0` (newest tag, mirrors red-baron); `/rng` resolves + is deterministic. In scope per SM hazard.

**Tests Written:** 29 tests covering all 4 ACs (grid/seeding/damage/scoring transcription+claims = AC-1; CENTIP.DOC-vs-code record = AC-2; determinism = AC-3; purity/no-Math.random via the seeded rng = AC-4).

### Transcription table (RADIX 16 — hex unless noted; each with a claim + file:line)

| Constant (proposed export) | Hex | Dec | Citation | Claim |
|---|---|---|---|---|
| PLYFLD_BASE | 0x400 | 1024 | CENDE4.MAC:61 | PM-1 |
| PLYFLD_WIDTH (h) | — | 30 | CENDE4.MAC:61 ("30 WIDE") | PM-1 |
| PLYFLD_HEIGHT (v) | — | 32 | CENDE4.MAC:61 ("32 HIGH") | PM-1 |
| PLYFLD_END | 0x7BF | 1983 | CENDE4.MAC:61 ("400-7BF") | PM-1 |
| PLYFLD_STRIDE | 0x20 | 32 | derived (v=addr&0x1F; CENTI4.MAC:1602/1620) | PM-1 |
| SEED_COUNT | — | **46** | CENTI4.MAC:1222 `LDX I,45.` (**45 DECIMAL**) + 1259 DEX/BPL | PM-6/PM-14 |
| SEED_COLUMN_START | 0x1B | 27 | CENTI4.MAC:1220 | PM-5 |
| SEED_COLUMN_MIN | 0x02 | 2 | CENTI4.MAC:1253 (`CMP I,2`) | PM-12 |
| MUSH_LOWER_BOUND | 0x0C | 12 | CENTI4.MAC:1241/1609/1634 | PM-8/PM-30 |
| MUSHROOM_FULL | 0x3F | 63 | CENTI4.MAC:1247/1851/1638 | PM-10/PM-25/PM-29 |
| MUSHROOM_MIN | 0x38 | 56 | CENTI4.MAC:2152/1847 | PM-16 |
| NORMAL_DESTROY | 0x3B | 59 | CENTI4.MAC:2155 | PM-18 |
| POISON_DESTROY | 0x37 | 55 | CENTI4.MAC:2157 | PM-19 |
| MUSHROOM_HP | — | 4 | CENTI4.MAC:2154 (SBC 1) + 2155 | PM-17/PM-18 |
| SCORE_DESTROY | 0x01 | 1 (BCD) | CENTI4.MAC:2161 | PM-20/PM-32 |
| SCORE_RESTORE | 0x05 | 5 (BCD) | CENTI4.MAC:1856 | PM-26/PM-33 |
| RESTOR_FRAME_MASK | 0x07 | 7 → every 8 | CENTI4.MAC:1831 (comment says 16 — **wrong**) | PM-23 |
| RESTOR_START | 0x400 | 1024 | CENTI4.MAC:995-997 (armed at death) | PM-22 |

**Radix traps handled:** `LDX I,45.` is **decimal 45** (trailing period) → **46** loop iterations (DEX/BPL). Every other literal is hex. Scoring constants (0x01, 0x05) are added in **BCD** (SED, PM-31) so hex==decimal points.

### AC-2 — CENTIP.DOC (rev-1) vs rev-4 code
- **Mushroom scoring 1 / 5:** CENTIP.DOC:111/112 **AGREE** with rev-4 (2161 / 1856). No number to correct — safe to bake. (PM-32/33.)
- **RESTOR cadence:** rev-4 comment "EVERY 16 FRAMES" vs `AND I,07` → **8 frames**. Code wins. (PM-23.)
- **"No mushrooms on the bottom line" (1)** vs rev-4 reserving v=0,1 (bottom) + v=0x1F (top score row). Code wins. (PM-12/27/28/34.)
- These get recorded in `docs/rom-study/open-questions.md` by GREEN (the AC-2 tests demand a `cp1-4`-tagged entry naming RESTOR/8-frames and the CENTIP.DOC mushroom-scoring diff).

### RED verification evidence
- `node tools/audit/check-citations.mjs` → `checked 99 claim(s) / all claims verified` (34 new byte-exact).
- `npm test` (via testing-runner): 6 files, 127 tests → **102 pass / 25 fail**. All 25 fails are in `tests/playfield.test.ts`; 23 report the self-describing "playfield core module not built yet" (feature absent, not harness/import error), 2 are the AC-2 open-questions `cp1-4` assertions. Pre-existing 98 + 4 provenance = 102 green (citations green WITH the 34 new claims).

### Rule coverage
| AC | Pinned by | State |
|---|---|---|
| AC-1 grid/seeding/damage/scoring transcribed + claims, citations green | geometry/mushroom/seeding/scoring describe blocks + 06 claims file + citation gate | RED (feature) / GREEN (claims) |
| AC-2 CENTIP.DOC-vs-code divergence recorded in open-questions.md | AC-2 describe block (2 tests) | RED until GREEN records |
| AC-3 determinism through seeding+damage+RESTOR | determinism describe block (3 tests) | RED (feature) |
| AC-4 no wall-clock / no Math.random (seeded rng only) | purity.test.ts auto-binds `src/core/playfield.ts` on landing; RED suite requires the `@arcade/shared/rng` import as the sole entropy | GREEN (purity) — enforced when file lands |

### Notes for Dev (Julia) — GREEN
**Build:** `src/core/playfield.ts` exporting the constants in the transcription table above + `createPlayfield()`, `seedPlayfield(rng: Rng)`, `isMushroom(cell)`, `damageMushroom(cell)→{cell,scored,destroyed}`, `restoreMushroom(cell)→{cell,scored}` (exact contract in `tests/playfield.test.ts`). Wire the rng/seed + playfield into `SimState` (additions to `src/core/sim.ts`).
**Also:** add the `cp1-4` divergence entry to `docs/rom-study/open-questions.md` (RESTOR is active every **8** frames — `AND I,07`, not the "16 FRAMES" comment; and CENTIP.DOC mushroom scoring 1/5 confirmed-agree with rev-4; "bottom line" understates the reserved rows). Two AC-2 tests gate on it.
**Traps:**
1. **`import { createRng, nextInt, type Rng } from '@arcade/shared/rng'`** is the ONLY entropy — no `Math.random`. Purity guard binds the new file automatically.
2. **Mutable rng:** `Rng` is `{ seed: number }`; `nextFloat` MUTATES `seed`. Any `cloneState` must copy the seed word (`{ seed: rng.seed }`) so clones advance independently (arcade-shared lesson).
3. **46 not 45** (`LDX I,45.` is decimal; DEX/BPL loops 46×). Column (v) walks 0x1B→0x02 **deterministically**, wrapping; only the ROW (h) is rng-driven.
4. **Off-grid overshoot:** the ROM's h can be 30/31 (writes into motion RAM). Grid-only model → treat h≥30 as a **no-op** (no cell, no MUSH). Tests assume this (MUSH == lower grid mushrooms).
5. **Damage decrements by 1**, destroy at 0x3B (normal) / 0x37 (poison); +1 point only on the destroying hit; destroyed cell → 0.
6. **RESTOR** restores the 0x38–0x3E band → 0x3F (+5); full 0x3F and non-mushroom cells untouched. Sweep is armed at death (MEM=0x0400), scans 0x0400→0x07BF, one restore per active pass (every 8 frames), terminates at 0x07C0.

**Handoff:** To Dev (Julia) for GREEN implementation. Handoff doc: `.session/cp1-4-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/core/playfield.ts` (NEW) — the playfield/mushroom core module: geometry constants (`PLYFLD_BASE/WIDTH/HEIGHT/END/STRIDE`), mushroom picture-code constants (`MUSHROOM_FULL/MIN`, `NORMAL_DESTROY`, `POISON_DESTROY`, `MUSHROOM_HP`), seeding constants (`SEED_COUNT`, `SEED_COLUMN_START/MIN`, `MUSH_LOWER_BOUND`), scoring constants (`SCORE_DESTROY/RESTORE`), RESTOR constants (`RESTOR_FRAME_MASK/START`), `createPlayfield`, `isMushroom`, `damageMushroom`, `restoreMushroom`, `seedPlayfield(rng)`. Entropy sourced solely from `@arcade/shared/rng` (`nextInt`).
- `centipede/docs/rom-study/open-questions.md` — added item 6, the cp1-4 AC-2 divergence record: RESTOR's own comment ("EVERY 16 FRAMES") is wrong against its code (`AND I,07` => every 8 frames); CENTIP.DOC mushroom scoring (1/5) confirmed-agrees with rev-4 code; CENTIP.DOC's "no mushrooms on the bottom line" understates the rows rev-4 actually reserves.

**Tests:** 128/128 passing (GREEN). `tests/playfield.test.ts`'s 25 RED tests now pass; the purity sweep (`tests/purity.test.ts`) gained one more `it.each` entry for the new `src/core/` file (2→3 core modules), which is why the total moved from 127 (RED) to 128 (GREEN) rather than staying flat.
- `npm test` (testing-runner, RUN_ID af51ab2fbaf2639c4): 6 files, 128/128 passing.
- `npm run build` (`tsc --noEmit && vite build`): clean, exit 0.
- `npm run lint` (`tsc --noEmit`, strict + `noUnusedLocals`): clean, exit 0.
- `node tools/audit/check-citations.mjs`: `checked 99 claim(s) / all claims verified` (unchanged from RED — the 34 cp1-4 claims were already TEA-authored and byte-verified before GREEN).

**AC walkthrough:**
- **AC-1** (grid/seeding/damage/scoring transcribed + claims, citations green): every constant in the transcription table is exported with a radix-cited comment; `docs/rom-study/claims/06-playfield-mushrooms.json` (34 claims, TEA-authored) verifies 99/99 byte-exact. Geometry/mushroom-code/damage/RESTOR/seeding/scoring test blocks all green.
- **AC-2** (CENTIP.DOC vs rev-4 code divergence recorded): open-questions.md item 6 added; both AC-2 tests (`records the cp1-4 diff: RESTOR 8-frame cadence` / `records that CENTIP.DOC mushroom scoring was diffed`) green.
- **AC-3** (determinism through seeding/damage/RESTOR): all 3 determinism tests green — identical seed reproduces identical field/mush, different seeds diverge, and a scripted damage+RESTOR walk over two same-seed runs produces byte-identical cells and score.
- **AC-4** (no wall-clock, no Math.random): `playfield.ts` imports only `nextInt`/`Rng` from `@arcade/shared/rng`; the purity sweep (`tests/purity.test.ts`) auto-binds the new file and is green with no violations.

**Commits:**
- `ffa6125` — `feat(cp1-4): playfield + mushrooms — 30x32 grid, seeding, damage, RESTOR` (on top of RED `c2c9734`), pushed to `origin/feat/cp1-4-playfield-mushrooms`.

**Scope note (see Delivery Findings):** `src/core/sim.ts` was left untouched — no test exercises `SimState` wiring or an actual frame-stepped RESTOR sweep, only the per-cell `restoreMushroom` primitive. That wiring is left for whichever future story adds the frame-stepped sim loop / motion-object table.

**Handoff:** To Reviewer.

## Handoff: implement -> review
**Story:** cp1-4  |  **Agent:** dev (Julia)  |  **Timestamp:** 2026-07-19T00:45:00Z

### Summary
Implemented `src/core/playfield.ts`, the pure playfield/mushroom model for Centipede: the 30x32 PLYFLD grid, deterministic seeding (46 attempts, column walk with wrap, rng-driven row, off-grid no-op), per-shot damage decrement with destroy thresholds and scoring, and the RESTOR per-cell repair primitive — every constant transcribed from rev-4 CENTI4.MAC/CENDE4.MAC and cited in the already-TEA-authored claims file. Also recorded the cp1-4 AC-2 CENTIP.DOC-vs-code divergence in open-questions.md.

### Deliverables
- `centipede/src/core/playfield.ts`: new core module (constants + `createPlayfield`/`isMushroom`/`damageMushroom`/`restoreMushroom`/`seedPlayfield`).
- `centipede/docs/rom-study/open-questions.md`: new item 6 (cp1-4 AC-2 divergence record).

### Key Decisions
- **Seeding's RNG-driven horizontal draw uses a local `SEED_ROW_DRAW = 32`** (not `PLYFLD_HEIGHT`), even though they're numerically equal — it represents the 5-bit RNGEN draw (adapter policy), not a playfield dimension (ROM fact); kept the two concepts textually distinct so a future edit to one doesn't silently retune the other.
- **Overshoot AND collision both fold into a no-op/idempotent-overwrite path**: `h >= PLYFLD_WIDTH` skips entirely (no write, no mush bump); landing on an already-occupied cell re-writes the same `MUSHROOM_FULL` value without double-counting `mush`. Both keep `mush` exactly equal to the count of nonzero lower-screen cells, which is what AC-3/the seeding tests check.
- **Did not touch `src/core/sim.ts`.** TEA's notes suggested wiring rng/playfield into `SimState`, but no RED test exercises that surface — added as a non-blocking Delivery Finding instead of guessing at an untested contract.

### Open Questions
- The actual frame-stepped RESTOR sweep (walking `MEM` from `RESTOR_START` to `PLYFLD_END`, one repair every `RESTOR_FRAME_MASK+1` frames, arming on player death) is NOT implemented — only the per-cell `restoreMushroom(cell)` primitive the RED suite pins. A future sim-loop story needs to build the stepper on top of it.
- Poison-mushroom seeding (who places a poisoned mushroom) is out of scope per TEA's note — cp3 (scorpion) territory. This story only pins the poison band's damage/restore encoding.

### Test Status
128/128 passing. Build clean. Lint clean. Citations 99/99 verified.

## Subagent Results

| Subagent | Received | Result |
|----------|----------|--------|
| `testing-runner` (independent preflight) | Yes | **PASS** — `npm test` exit 0, 6 files / **128 passed**; `npm run build` exit 0 (no TS errors, vite build ok); `npm run lint` exit 0; `node tools/audit/check-citations.mjs` exit 0 → **99/99 verified**. Independently matches Dev's claims. |
| `reviewer-preflight` | Disabled | Skipped (peloton config). Compensated inline: independent ROM re-open (CENTI4.MAC/CENDE4.MAC), citation CLI re-run, and a `vite-node` runtime harness (below). |
| `reviewer-edge-hunter` | Disabled | Skipped. Boundary cases (46-vs-45 fencepost, h≥30 overshoot, poison band edges 0x37/0x3C, RESTOR 0x3F exclusion, wrap at v=0x02) enumerated inline + runtime-confirmed. |
| `reviewer-silent-failure-hunter` | Disabled | Skipped. No catches/fallbacks in the module; the one unguarded path (`damageMushroom` non-mushroom → cell -1) found inline and logged LOW. |
| `reviewer-test-analyzer` | Disabled | Skipped. Determinism/seeding/damage/RESTOR assertions reviewed inline; re-ran an independent runtime harness rather than trust the suite. |
| `reviewer-comment-analyzer` | Disabled | Skipped. Module header + JSDoc reviewed inline against source; the stale-comment divergence (RESTOR "16 frames") is itself the recorded AC-2 finding. |
| `reviewer-type-design` | Disabled | Skipped. `Playfield` type + op return shapes reviewed inline. |
| `reviewer-security` | Disabled | Skipped. Pure sim, no I/O / auth / secrets / network surface — nothing to attack. |
| `reviewer-simplifier` | Disabled | Skipped. 136-line module, no over-engineering; unused-but-exported constants are deliberate AC-1 transcription surface. |
| Reviewer inline: runtime harness (`vite-node`) | Yes | Seeded 4 fields — counts 41-43 (< 46), `mush` == lower-screen recount for every seed, **0** reserved-row (v∈{0,1,0x1F}) violations, **0** out-of-walk (v∉[2,0x1B]), **0** off-grid (h≥30) writes, all cells 0x3F; same-seed byte-identical, diff-seed differ; normal 0x3F → 4 hits → destroy@0x3C +1; poison 0x3B → 4 hits → destroy@0x38 +1; restore 0x3E/0x38→0x3F +5, 0x3F/0x37 untouched. |

**All received:** Yes (1 enabled subagent returned; 8 specialists disabled via peloton config, domains self-assessed inline; plus 1 Reviewer runtime harness). This is a 136-line pure, dependency-free transcription module with no I/O, auth, error paths, or UI wiring — the load-bearing adversarial work is ROM re-verification, done inline by re-opening CENTI4.MAC/CENDE4.MAC. Peloton pane budget (swarm dies ~5 panes) also argues against a wide fan-out for a story this size.
**Total findings:** 1 confirmed (LOW, non-blocking — unguarded `damageMushroom`, routed to cp1-6), 0 dismissed, 0 deferred.

## Reviewer Assessment

**Verdict:** APPROVED

**Data-flow trace (a seed, end to end):** `seed:number` → `createRng(seed)` (mulberry32, seed word carried in `{seed}`) → `seedPlayfield(rng)`: for each of 46 attempts, `nextInt(rng, SEED_ROW_DRAW=32)` → `h ∈ [0,31]`; `if (h < PLYFLD_WIDTH=30)` write `MUSHROOM_FULL` at `offset = h*0x20 + v`, and `mush++` iff the cell was empty AND `v < 0x0C`; `v` walks `0x1B → 0x02` and wraps. **Safe because:** (1) entropy is the seeded, deterministic mulberry32 — the sanctioned `@arcade/shared/rng` path, zero `Math.random`/wall-clock; (2) off-grid `h≥30` is a deliberate no-op — the faithful reduction for a grid-only sim with no motion-object RAM to corrupt (ROM would write into 0x7C0+, CENDE4.MAC:62); (3) reserved rows are never seeded — the walk floors at `0x02` (bottom rows v=0,1 clear) and ceilings at `0x1B` (top/score row v=0x1F clear); (4) `mush` exactly equals the lower-screen occupied count, independently recomputed and matched for four seeds.

**Independent ROM re-verification (I re-opened the routines myself — CENTI4.MAC / CENDE4.MAC, rev-4):**
- **Seeding count = 46 [CONFIRMED].** `LDX I,45.` (CENTI4.MAC:1222) — trailing-dot decimal 45 under `.RADIX 16`; `STX TEMP3`/`DEX`/`BPL` (1231/1258/1259) loops X=45..0 inclusive = **46** iterations. Fencepost correct.
- **Column walk 0x1B→0x02 wrap [CONFIRMED].** `LDX I,1B`→`TEMP1` (1220-1221); each pass `SBC I,01`/`CMP I,2`/`BCS`/else `LDA I,1B` (1250-1255) → v sequence 0x1B..0x02 then reset to 0x1B; placement uses the pre-decrement value, so v never reaches 0/1. Only h (0-31, 5 bits: `RNGEN&0E0`>>5 ‖ `RNGEN&03`) is entropy — Dev's single `nextInt(rng,32)` is a documented adapter substitution of the two RNGEN reads; overshoot probability 2/32 = 1/16 preserved.
- **Damage thresholds [CONFIRMED].** `AND I,3F`/`CMP I,38`/`BCC`(not-mushroom); `SBC I,1`; `CMP I,3B`→destroy (2155), `CMP I,37`→destroy (2157) — normal band 0x3C-0x3F destroys at 0x3B, poison band 0x38-0x3B destroys at 0x37; full mushroom = 4 hits (0x3F-0x3B). All matched at runtime.
- **RESTOR [CONFIRMED].** Band `CMP I,38`(BCC skip)/`CMP I,3F`(BCS skip) → restores 0x38-0x3E to 0x3F only (1847-1851); `LDA I,5`/`SCORN1` = +5 (1856); armed `MEM=0x0400` at death (`LDA I,0`/`STA MEM`; `LDA I,4`/`STA MEM+1`, 994-997); sweep bound 0x07C0 (1839-1841). Cadence: `AND I,07` (1831) = active every **8** frames — the adjacent `;EVERY 16 FRAMES` comment (1832) is stale; **code wins, and the divergence is recorded** (open-questions.md item 6, PM-23).
- **Reserved rows [CONFIRMED].** v=0,1 (bottom) + v=0x1F (top score row) — walk floor/ceiling, matched at runtime (0 violations across 4 seeds).
- **Scoring 1/5 [CONFIRMED].** `LDA I,01`/`SCORN1` destroy (2161), `LDA I,5` restore (1856); BCD (hex==dec). CENTIP.DOC:111-112 prose AGREES — no bake-correction, agreement recorded (AC-2 standing rule satisfied).
- **Geometry [CONFIRMED].** `PLYFLD =400 ;30 WIDE BY 32 HIGH (400-7BF)` (CENDE4.MAC:61); `MUSH ... LOWER PART OF SCREEN` (222); lower bound `CMP I,0C` (1241). Byte-cited claims re-open 99/99.

**Pattern observed:** the ROM-fact-vs-adapter-policy split is drawn honestly and, in one place, load-bearingly — `SEED_ROW_DRAW=32` (playfield.ts:58) is a *local, non-exported* const kept textually distinct from `PLYFLD_WIDTH`/`PLYFLD_HEIGHT` precisely because it is the 5-bit RNGEN draw (0-31), not a dimension. Drawing `nextInt(rng, 30)` instead would silently erase the 1/16 off-grid overshoot and inflate mushroom/MUSH counts — so this "cosmetic" split is actually a fidelity guard.

**Error handling:** the one soft spot — `damageMushroom` (playfield.ts:91-97) does not enforce its "cell is a mushroom" precondition (`damageMushroom(0x00) → {cell:-1}`, verified). Not reachable by any current caller (all gate with `isMushroom`; `sim.ts` unwired), logged as a non-blocking Delivery Finding for cp1-6. LOW.

**≥5 tagged observations:**
1. `[LOW]` `damageMushroom`/`restoreMushroom` compare on raw `cell` (no `& 0x3F` mask) and `damageMushroom` doesn't guard non-mushroom input — latent footgun for the cp1-6 shooter wiring; no current caller affected. `src/core/playfield.ts:91-108`.
2. `[VERIFIED GOOD]` Every load-bearing constant independently re-derived from rev-4 code; the 45.-decimal→46 fencepost and every hex/decimal reading are correct.
3. `[VERIFIED GOOD]` Determinism (AC-3): same seed → byte-identical field+mush; different seeds diverge; damage/RESTOR script reproducible — confirmed independently, not just by the suite.
4. `[VERIFIED GOOD]` Purity (AC-4): playfield.ts imports only `nextInt`/`Rng` from `@arcade/shared/rng`; no banned globals; the `src/core/` purity sweep auto-binds the new file (128th test) and is green.
5. `[LOW/INFO]` `MUSHROOM_HP`, `PLYFLD_BASE/END`, `RESTOR_FRAME_MASK/START` are exported but unused in this story's logic — intentional AC-1 transcription surface for cp1-6's sweep stepper, each pinned by a claim + test. Not dead code.
6. `[VERIFIED GOOD]` The `mush` counter reproduces the ROM's occupied-and-lower-only increment (CENTI4.MAC:1241-1246) including the idempotent-collision and off-grid no-op paths; recomputed == stored for every seed tested.

**Devil's advocate (assumed subtle breakage, results):**
- 46-vs-45 fencepost → correct (46). Hex/decimal misreads anywhere → none (all re-derived). Poison-band edge codes (0x37/0x3C) → correct (destroy@0x37, band 0x38-0x3B). RESTOR restoring a full 0x3F → excluded (`cell < MUSHROOM_FULL`). Scoring double-count → none (1 only on destroy, 5 only on genuine 0x38-0x3E restore). h≥30 no-op silently changing counts vs ROM → it IS the faithful reduction AND it is recorded (TEA Gap finding + module header + open-questions). The only genuine gap surfaced is the unguarded `damageMushroom` (LOW, above).

**Deviation audit:**
- TEA — "AC-2 reframed to record the diff outcome": **✓ ACCEPTED.** CENTIP.DOC scoring 1/5 genuinely agrees with rev-4; recording the confirmed-agreement plus the real code-wins divergences (RESTOR 8-frame, reserved rows) is the honest reading of the standing rule. Verified against source.
- TEA — "Playfield API is TEA-proposed": **✓ ACCEPTED.** Story said "suggest"; the concrete pure-op contract is the only way to pin damage/RESTOR without a frame loop. Sound.
- Dev — "`SEED_ROW_DRAW=32` distinct from `PLYFLD_HEIGHT`": **✓ ACCEPTED** (and commended — load-bearing for overshoot fidelity, see Pattern).
- Dev — "overshoot AND collision fold to no-op/idempotent-overwrite": **✓ ACCEPTED.** Matches ROM (BNE-skip increment on occupied; off-grid writes vanish in a grid-only model). Runtime-confirmed `mush` == occupied lower count.
- Dev — "did not touch `sim.ts`": **✓ ACCEPTED — scope-honest.** No RED test exercises `SimState` wiring; epic roadmap places the playable/frame-stepped slice at cp1-6. Building an untested contract now would be guessing. Logged as non-blocking Delivery Finding by both TEA and Dev.

**Merge safety:** `origin/develop` = `8a8e8ad` = the merge-base — origin/develop has NOT moved since branch point, so the branch is strictly ahead with no divergence (clean fast-forwardable merge; no trial-merge needed). No sibling `cp1-4` branch on origin (only our own `feat/cp1-4-playfield-mushrooms`); no open/other `cp1-4` PR (cp1-1/2/3 all merged). Working tree clean (read-only review). SM merges at finish — Reviewer did NOT create or merge any PR.

**Handoff:** To SM (Winston) for finish-story. No blocking items. One non-blocking Delivery Finding routed forward to cp1-6 (guard `damageMushroom`).