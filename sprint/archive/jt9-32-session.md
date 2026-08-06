---
story_id: "jt9-32"
jira_key: "jt9-32"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-32: Two bake assertions weaker than their names: nothing pins WHAT the joust bake produces, and the manifest throws are pinned only as SUBSTRINGS

## Story Details
- **ID:** jt9-32
- **Jira Key:** jt9-32
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** main
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-06T17:25:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T17:07:10Z | 2026-08-06T17:09:55Z | 2m 45s |
| red | 2026-08-06T17:09:55Z | 2026-08-06T17:19:42Z | 9m 47s |
| green | 2026-08-06T17:19:42Z | 2026-08-06T17:22:43Z | 3m 1s |
| review | 2026-08-06T17:22:43Z | 2026-08-06T17:25:54Z | 3m 11s |
| finish | 2026-08-06T17:25:54Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Dev / GREEN] No upstream findings; no production change.** The bake is
  correct — this story only strengthens tests. GREEN filled the empty `GOLDEN`
  table in `bake-samples.test.mjs` with 18 DERIVED `filename -> sha256` pairs
  (Improvement, non-blocking). The values were computed, not typed, by a default
  `bakeSamples(dir)` run:
  ```
  import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
  import { tmpdir } from 'node:os'; import { join } from 'node:path'
  import { createHash } from 'node:crypto'
  import { SOUNDS, bakeSamples } from './bake-samples.mjs'
  const d = mkdtempSync(join(tmpdir(),'g')); await bakeSamples(d)
  for (const f of Object.values(SOUNDS).sort())
    console.log(f, createHash('sha256').update(readFileSync(join(d,f))).digest('hex'))
  ```
  Re-baseline after any deliberate sound change by re-running this and pasting the
  block. `enemy_death.wav` = `0f10d233…5f3c1c`, stable across two independent runs.

- **[Dev / GREEN] Acceptance battery — MEASURED, all restores `git status` clean:**
  - **R12** (`const RATE = 22050` → `24000` in `bake-samples.mjs`): content pin
    reddens per-file, naming `enemy_death.wav` (`0f10d233…` → `251d322e…`), and is
    the ONLY failure (1 failed / 22 passed). Green unmutated.
  - **R4** (append to pairing msg) + **R5** (append to invention msg): all 5
    hardened throws redden (5 failed / 7 passed). The pre-jt9-32 substring form
    survived both.
  - **N3** decoy (`(${pairs.length})` → `(5)`): reddens the two `(3)`-expecting
    pairing tests (2 failed / 10 passed) — the interpolation is still pinned, so
    the fix traded no blind spot.
  - **Suite shape RE-MEASURED on current tree:** `--project joust` = **143 files /
    2941 tests, all green** (the story's filed "105 / 2533" was 2026-08-03; many
    sibling test commits have landed since — the filed numbers are stale, as TEA
    flagged). Repo-wide `npm run lint` (tsc --noEmit) clean.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## SM Assessment

**Setup, jt9-32 (2pt, tdd, arcade orchestrator, trunk-based).** Board clean at
setup: no branch for the id, no sibling session file, story was `status: backlog`.
Claim commit `59f3065` (rebased to `ccc0340`) pushed to `origin main` + empty
reference branch `feat/jt9-32-bake-content-pin-and-exact-throws` pushed so a
sibling probe lights up during RED. Story stamped `in_progress`.

**Premises spot-checked and CURRENT (2026-08-06):**
- `plugins/joust/tools/sample-bake/bake-samples.mjs:55` still `const RATE = 22050`.
- `plugins/joust/tests/audio-frames-edge-cases.test.ts` has exactly the five
  `toThrowError(...)` sites: pairing throw at 262/289/311 (3 tests), invention
  throw at 393/423 (2 tests) — matches the folded-in jt9-34 half.
- The commit that moved origin during setup (mc2-2 docs) does not touch the bake.

**Handoff note to TEA (Tyr):** the story's suite-shape figure "105 files / 2533
collected" and the golden combined sha256 (`4499a28b…c9962`) were MEASURED
2026-08-03; sibling test commits have landed since (jt9-46, jt9-52, mc2-2, ad1-3).
**Re-measure the suite shape and re-derive the per-file/golden hashes against the
CURRENT tree at RED time** — do not copy the filed numbers as current fact. The
description IS the spec (epic ACs are null); its named mutants are the acceptance
harness — re-run VERBATIM: R12 (`RATE 22050 -> 24000`) must redden the new content
pin (green unmutated); R4/R5 (append to the two throw messages) must redden after
the `toThrowError` equality fix; decoy N3 must still redden. Prefer per-file
hashes over one combined digest so a failure names the moved cue. Read the two
throw messages off the current source — do not re-type them (self-transcription
trap). No new test file is added, so the audio-seam-scope README census guard
should not move. Scope fence: joust bake ONLY — do not widen to centipede/star-wars.
## TEA Assessment

**RED landed: `ce96b46` (rebased from `b0c3da2`).** Two files, +101/-12. Two
holes closed, both "the assertion is weaker than its name," both filed from
surviving mutants.

### What RED looks like
- `plugins/joust/tools/sample-bake/bake-samples.test.mjs` — NEW `jt9-32` describe
  block (2 tests) pins one **sha256 per file** of the default bake against an
  inline committed `GOLDEN` table, plus set-equality (golden keys == shipped
  manifest, both ways). `GOLDEN` is left **empty** — this is the genuine RED
  (18 vs 0; per-file hash vs `undefined`, naming `enemy_death.wav`). Mirrors
  jt9-31's "the thing doesn't exist yet → GREEN creates it" shape.
- `plugins/joust/tests/audio-frames-edge-cases.test.ts` — 5 throw sites
  (3 AC-1 pairing @ 262/289/311, 2 AC-3 invention @ 393/423) rewrapped
  `toThrowError(str)` → `toThrowError(new Error(str))` (containment → equality).
  Literals **reused verbatim** — byte-exact to `audio-manifest.ts:551-556`
  (pairing) and `:604-609` (invention), NOT re-typed. Green on clean tree.

### Non-vacuity — MEASURED this session (do not take on faith)
- Content pin: 2 tests RED with empty golden; 33 green. Localized.
- Throw hardening: applied **R4** (append to pairing msg) + **R5** (append to
  invention msg) to `audio-manifest.ts` → **all 5** hardened throws reddened.
  The old substring form SURVIVED both (as filed). Production restored,
  `git status` clean, re-run confirmed throws back to green.
- `audio-seam-scope` census: green (30/30) — no new test FILE added, so no
  README file/claim count bump ([[joust-test-file-count-census]] does not fire).

### GREEN — what Dev must do (thin but real)
1. **Fill `GOLDEN`.** Bake the shipped manifest once into a temp dir and record
   each filename → sha256. **DERIVE** the 18 values (read them off a
   `bakeSamples(tmp)` run / a `node -e` loop), do NOT hand-type — the pin must
   not be its own transcription. A one-liner Dev can use:
   `node -e "import('./plugins/joust/tools/sample-bake/bake-samples.mjs').then(async m=>{const fs=require('fs'),os=require('os'),p=require('path'),c=require('crypto');const d=fs.mkdtempSync(p.join(os.tmpdir(),'g'));await m.bakeSamples(d);for(const f of Object.values(m.SOUNDS).sort())console.log(f,c.createHash('sha256').update(fs.readFileSync(p.join(d,f))).digest('hex'))})"`
   (or equivalent). No production code changes — the bake is correct.
2. **Run the acceptance battery VERBATIM** and record it in the GREEN message:
   - **R12** (`const RATE = 22050` → `24000` in `bake-samples.mjs`) must redden
     the per-file content pin (by cue), green unmutated.
   - **R4 / R5** (append to the two throw messages) must redden — already proven
     here, re-confirm after the golden lands.
   - **decoy N3** (`an odd operand count (${pairs.length})` → `... (5)`) must
     STILL redden — proves the fix didn't trade one blind spot for another.
   - Assert the **suite SHAPE** alongside: re-measure `--project joust` file/test
     counts on the CURRENT tree (story's "105 files / 2533" was 2026-08-03; many
     sibling test commits have landed — do NOT copy the filed numbers).

### Rule Coverage (`.pennyfarthing/gates/lang-review/javascript.md`)
- **Check 3 — bracket notation / prototype access:** already covered by the
  existing `Object.hasOwn` tests (`toString` cue, inherited-duration). This story
  strengthens, not adds, prototype-safety surface — no new gap.
- **Test-quality / vacuity self-check:** every assertion added is a `toBe` /
  `toEqual` on a concrete value; the RED itself proves the content pin is not
  vacuous, and the R4/R5 mutation run proves the throw equality is not vacuous.
  No `assert(true)`, no always-undefined comparisons introduced.

### Scope fence (unchanged)
Joust bake ONLY. Centipede's and star-wars' bakes share the shape and the gap —
do NOT widen here; measure and file separately if wanted.
## Reviewer Assessment

**Verdict:** approved

Enabled reviewer subagents: `preflight` only (8 of 9 specialists disabled on this
project), so the review was an independent MUTATION BATTERY + re-derivation, not a
re-read. Every Dev claim was re-verified from scratch, all restores `git status`
clean.

### Independently verified (Heimdall)
- **Golden is a true derivation, not fabricated.** Re-baked the shipped manifest
  and re-hashed all 18 files in a fresh temp dir; the result is IDENTICAL to the
  committed `GOLDEN` table, character-for-character (18/18). `enemy_death.wav`
  reproduces `0f10d233…5f3c1c` across three independent bakes — deterministic.
- **Content pin non-vacuous.** R12 (`RATE 22050→24000`) reddens the per-file pin,
  naming the moved cue; green unmutated (23/23 in isolation).
- **Set-equality guards BOTH directions** (adversarial mutation of GOLDEN itself):
  removing a golden row reds `covers EXACTLY` (a shipped file with no pin is
  caught), and adding a bogus `ghost_cue.wav` row reds it too (a stale/renamed pin
  is caught). Neither direction is one-way.
- **Throws are truly EQUALITY, not leftover containment.** R4 (append to pairing
  msg) + R5 (append to invention msg) redden all 5 hardened sites; the pre-jt9-32
  substring form survived both. N3 interpolation decoy still reddens — no traded
  blind spot.
- **No stale citations.** Committed comments carry no line-ref citations to rot
  (symbol-level only). No production/`src` change; `sprint/epic-mc2.yaml` in the
  commit range is a sibling's file, not this story's.

### Rule Compliance (`.pennyfarthing/gates/lang-review/javascript.md`)
- Check 3 (bracket/prototype access): pre-existing `Object.hasOwn` coverage intact;
  this story strengthens, adds no new bracket-read surface.
- Test quality: no vacuous assertions introduced — every new assertion is a
  concrete `toBe`/`toEqual`, and non-vacuity is proven by the R12/R4/R5 battery.

### Preflight corroboration
GREEN: 143 files / 2941 tests, 0 failed/skipped; `tsc --noEmit` clean; zero code
smells (no console.log/TODO/skip). Golden derived at GREEN time; R4 survives old
form / reddens new; R12 caught only by the new golden. Concurs with the above.

## Subagent Results

| Subagent | Status | Verdict |
|----------|--------|---------|
| reviewer-preflight | received | GREEN — 2941 pass, lint clean, 0 smells |

All received: Yes

No Critical, High, Medium, or Low findings. Approved for finish.
## Impact Summary

**jt9-32 — pure test-hardening, no production/src change. Single review round,
APPROVED, 0 blocking.** Two "weaker than its name" holes on the joust bake closed.

1. **Content pin (golden table).** `bake-samples.test.mjs` now pins one sha256 PER
   FILE of the default bake against a committed 18-entry `GOLDEN` table (derived,
   not hand-typed). Closes the near-miss where the "byte-identical" test compared
   two runs of the SAME code, so a synthesis-constant edit moved both sides
   together. Non-vacuous: R12 (`RATE 22050→24000`) reddens per-file by cue; green
   unmutated. Set-equality guards both directions (missing row AND stale row red).

2. **Throw equality.** 5 sites in `audio-frames-edge-cases.test.ts` upgraded from
   `toThrowError(str)` (vitest containment) to `toThrowError(new Error(str))`
   (equality) — 3 AC-1 pairing (262/289/311), 2 AC-3 invention (393/423). Literals
   reused verbatim, byte-exact to `audio-manifest.ts`. Non-vacuous: R4/R5 (append)
   redden all 5; old substring form survived both; N3 interpolation decoy still
   reddens (no traded blind spot).

**Verification:** joust suite RE-MEASURED at 143 files / 2941 tests green (filed
"105/2533" was 2026-08-03, stale); `tsc --noEmit` clean; golden re-derived
identical (18/18) by the Reviewer. Scope held to the joust bake; centipede/
star-wars bakes share the gap and were left for a separate filing.
