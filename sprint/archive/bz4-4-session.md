---
story_id: "bz4-4"
jira_key: "bz4-4"
epic: "bz4"
workflow: "trivial"
---
# Story bz4-4: Audio cue duration reconcile — BOING 456ms and the DISINT 104-vs-96ms ruling

## Story Details
- **ID:** bz4-4
- **Jira Key:** bz4-4 (local tracking)
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** setup
**Phase Started:** 2026-07-19T17:51:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T17:51:21Z | - | - |

## Story Context

**Type:** chore  
**Points:** 1  
**Priority:** p3  
**Repo:** battlezone  
**Branch Strategy:** gitflow (standard feature branch workflow)  

### Problem Statement

bz3-10 residuals from the NUMBER x FRCNT envelope-decode correction:

1. **BOING duration:** Currently ships 496ms but the true NUMBER x FRCNT value is 456ms (WP1).
2. **DISINT duration tension:** DISINT ships 104ms per the epic AC / refuter DS1 figure, but the pure engine model gives 96ms (NUMBER x FRCNT) — requires ruling the AC-vs-engine tension and landing whichever is correct.
3. **Misleading comment:** audio.ts currently contains a formula-contradicting 'one frame per record' claim for multi-record cues that needs rewording to match the per-record formula.

### Acceptance Criteria

1. BOING duration corrected to the true NUMBER x FRCNT value (456ms), and the misleading multi-record duration comment reworded to match the per-record formula.
2. The DISINT 104ms (AC/refuter) vs 96ms (engine NUMBER x FRCNT) tension is ruled against source and the shipped value reflects the ruling.

### Prior Art

- **bz3-10 session:** `/Users/slabgorb/Projects/a-2/sprint/archive/bz3-10-session.md` — the original envelope-decode correction
- **Audio duration constants:** battlezone/src/shell (audio.ts or similar location where BOING and DISINT constants live)
- **ROM source:** battlezone ROM audio data (ALSOUN-style 6-byte envelope, NUMBER x FRCNT frame-count decode)

### Technical Resources

- Source quarry: ~/Downloads/va-battlezone (SourceGen project with ROM disassembly + audio envelope data)
- Reference path: /Users/slabgorb/Projects/battlezone-source-text/ (ROM citations + envelope records)
- Grep targets: `BOING`, `DISINT`, audio duration constants, "one frame per record" comment

### Setup Status

- **Repo:** battlezone (branch: develop)
- **Branch Strategy:** gitflow — feature branch off origin/develop
- **Context files:** generated
  - `sprint/context/context-epic-bz4.md` (epic context)
  - `sprint/context/context-story-bz4-4.md` (story context)
- **Jira:** Not configured for this project (local tracking only)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement  
**Urgency:** blocking, non-blocking  

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### IMPLEMENT phase (Dev) — bz4-4

**Engine model (my own MODSND trace, BZSOUN.MAC:301-348).** A record is
`STVAL,FRCNT,CHANGE,NUMBER` (BZSOUN.MAC:61-65; `.RADIX 16`, all bytes hex). MODSND
loads `COUNT=NUMBER`, holds each value `FRCNT` NMI-frames, and the instant `COUNT`
hits 0 it falls straight into the **next** record's `STVAL` (17$, line 327-333) — no
extra `FRCNT` hold. So a record sounds exactly **NUMBER values × FRCNT frames**; its
`(NUMBER+1)`th conceptual value is preempted (also true of the last real record, which
hands off to the `0,0` terminator: FRCNT=0 → channel idles). This reconciles the file's
own examples: EX1 (`0FF,1,-1,6`, line 77-78) documents 7 values but only 6 sound (0F9
preempted). 1 sound-frame = 1 NMI = 4 ms (250 Hz) — the frame→ms convention bz3-10
established; unchanged here.

- **BOING ruling (496 → 456 ms).** WP1, BZSOUN.MAC:187-197: 10 records + `0,0`, all
  FRCNT=1. Record 1 `0C0,1,0F6,6` → NUMBER=6; records 2-10 (nine of them) `…,0C` →
  NUMBER=0C=12 each. Σ NUMBER×FRCNT = 6×1 + 9×(12×1) = 6 + 108 = **114 fr × 4 ms = 456 ms**.
  The old 496 ms was the `(NUMBER+1)×FRCNT` count (7×1 + 9×13 = 124 fr) — +10 frames
  = one preempted value per record × 10 records = +40 ms. Landed **0.456**.
- **DISINT ruling (104 vs 96 → 96 ms lands).** DS1, BZSOUN.MAC:217-219: 2 records + `0,0`,
  each `30,1,0FC,0C` → STVAL=0x30, CHANGE=0xFC(−4), FRCNT=1, NUMBER=0C=12. Each record
  sounds 12 values (0x30,2C,28,24,20,1C,18,14,10,0C,08,04 — the 13th, 0x00, is preempted)
  × 1 frame = 12 fr. Σ = 2×12 = **24 fr × 4 ms = 96 ms**. Landed **0.096**. **The engine
  model (96 ms) is source-correct; the 104 ms figure loses.** What 104 missed: it counted
  NUMBER+1 = 13 values/record (2×13 = 26 fr) — the identical `(NUMBER+1)` over-count the
  bz3-10 Reviewer already rejected for WARNG/RBEEP/BONER, left on DISINT/BOING only because
  the delta was rationalised as "one 4 ms frame" (treated as one frame *total*) when it is
  one frame **per record** (×2 = 8 ms). U-014's own original `claim` field already stated
  ~96 ms; only its round-2 `refuter_correction` wrongly bumped it to 104.
- **Comment reword (before → after).** `audio.ts` header + both const docs previously
  claimed BOING/DISINT are "numerically unaffected … differ by exactly one 4 ms frame when
  FRCNT=1 … durations unchanged". Rewritten to state the actual PER-RECORD Σ NUMBER×FRCNT
  formula and that the FRCNT=1 cues DO move by one frame per record (BOING −40 ms, DISINT
  −8 ms). Same reword applied to the `audio-cues.test.ts` header block.
- **Files + tests.** `src/shell/audio.ts` (BOING 0.496→0.456, DISINT 0.104→0.096, header +
  two const comments). `tests/shell/audio-cues.test.ts`: CUES `romMs` labels 496→456 / 104→96
  and bands tightened to *reject* the old values (boing `[0.42,0.48]` excludes 0.496; disint
  `[0.085,0.101]` excludes 0.104 — mirroring bz3-10's re-baseline of the FRCNT>1 bands), the
  dedicated DISINT test now `toBeCloseTo(0.096, 3)` (was `0.104, 2`) with corrected 24-frame
  math, plus the header reword. `docs/audit/findings/pair-sound.json`: U-014 `refuter_correction`
  prose corrected to affirm 96 ms (frozen `ours`/`source` citations untouched); U-001/003/004
  `ours.line` re-anchored 177→183 / 407→413 / 321→327 (line-only shift from the +6 lines the
  header reword added to `audio.ts` — verbatim unchanged, `reanchor-citations.mjs` dry-run: 0 lost).
- **Reviewer LOW-1 follow-up (comment-only, 6769d75):** fixed stale `104 ms zap` → `96 ms zap` in the WARNG-outlasts-DISINT test comment (`audio-cues.test.ts:325`); assertion (relative `warng > disint`) untouched. 1056/1056 pass, build clean.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Tightened the BOING/DISINT `audio-cues.test.ts` bands (not just relabelled them):** the
  old bands (`boing [0.38,0.64]`, `disint [0.075,0.16]`) already admitted BOTH the wrong old
  value and the new one, so relabelling `romMs` alone would leave the band guard vacuous w.r.t.
  the ruling. Narrowed to `boing [0.42,0.48]` / `disint [0.085,0.101]` so each band now *rejects*
  the superseded value (0.496 / 0.104). Reason: source dictates the old values are wrong, and this
  matches the precedent bz3-10 set when it re-baselined the WARNG/RBEEP/BONER bands to exclude
  their old over-counts. No new mechanism, no unrelated code touched.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/shell/audio.ts` — BOING 0.496→0.456, DISINT 0.104→0.096; header + both const doc comments reworded to the per-record Σ NUMBER×FRCNT formula.
- `tests/shell/audio-cues.test.ts` — CUES `romMs` labels + bands re-baselined (reject old values); DISINT test now pins 0.096; header reword.
- `docs/audit/findings/pair-sound.json` — U-014 `refuter_correction` prose corrected to 96 ms (frozen citation untouched); U-001/003/004 `ours.line` re-anchored for the +6-line audio.ts shift.

**Tests:** 1056/1056 passing (from 1056 baseline — no net change; the 2 duration/citation tests that pinned old values were updated per the source ruling, not to force a pass). `tsc --noEmit`: exit 0. build: clean.
**Branch:** chore/bz4-4-audio-duration (pushed)

**Handoff:** To review.

## Reviewer Assessment

**Verdict:** APPROVED

I independently re-derived every number from primary source (`/Users/slabgorb/Projects/battlezone-source-text/BZSOUN.MAC`, `.RADIX 16`) — I did not trust Dev's arithmetic. Both ACs are met and the DISINT ruling is source-correct.

### Independent MODSND re-derivation (the load-bearing check)

I hand-traced the MODSND state machine (BZSOUN.MAC:301-348) frame-by-frame for a single channel, from the SNDON init (`FRAMES=1, COUNT=1`). Result: a record sounds **exactly NUMBER values, each held FRCNT frames**. The instant `COUNT` decrements to 0 (line 308-309 `DEC X,COUNT / BNE 20$` falls through), the engine loads the **next** record's `STVAL` (line 310) — the current record's `(NUMBER+1)`th conceptual value is **preempted, never sounded**. Verified against the file's own examples: EX1 (`0FF,1,-1,6`, line 77-78) lists 7 conceptual values but only 6 sound (0F9 preempted); EX2 (`0,45,0,1`, line 79) plays ~FRCNT frames (69/70), NOT 2×FRCNT=138 — ruling out any per-value doubling.

- **BOING (WP1, BZSOUN.MAC:187-197) → 456 ms. CONFIRMED.** 10 records + `0,0`, all FRCNT=1. R0 `0C0,1,0F6,6`=NUMBER 6; R1-R9 (nine records) each `…,0C`=NUMBER 12. Σ NUMBER×FRCNT = 6 + 9×12 = **114 frames × 4 ms = 456 ms**. Shipped `BOING_DURATION_SEC = 0.456` (audio.ts:118). The old 496 ms = (NUMBER+1) count (7 + 9×13 = 124 fr) — a +1-value-per-record over-count across 10 records (+40 ms). My sum matches Dev's exactly.
- **DISINT (DS1, BZSOUN.MAC:217-219) → 96 ms. CONFIRMED; 104 was an over-count, 104 loses.** 2 records + `0,0`, each `30,1,0FC,0C` (STVAL 0x30, FRCNT 1, CHANGE −4, NUMBER 12). I traced R0 frames 1-12 emitting 0x30,2C,…,04 (12 values); frame 13 loads R1's STVAL (0x30) — R0's 13th value (0x00) is preempted. R1 = frames 13-24 (12 values); frame 25 = terminator idle. Σ = 2×12×1 = **24 frames × 4 ms = 96 ms**. Shipped `DISINT_DURATION_SEC = 0.096` (audio.ts:125). The refuter's 104 ms = 26 frames = 13 values/record — the **identical (NUMBER+1) over-count bz3-10 already rejected for WARNG/RBEEP/BONER**, mis-rationalized on DISINT/BOING as "one 4 ms frame total" when it is one frame **per record**. Even counting the single terminator boundary frame gives 25 fr (100 ms), never 26 — and the convention across all five cues (WARNG 144, RBEEP 16, BONER 224) counts pure NUMBER×FRCNT with no terminator frame, so 24 fr / 96 ms is the internally consistent answer. **Source wins; the ruling is correct.**

### Mandatory adversarial checks

- **Comment reword (AC-1):** PASS. The old audio.ts header + const docs claiming the FRCNT=1 cues are "numerically unaffected … differ by exactly one 4 ms frame … durations unchanged" are gone. New text (audio.ts:101-108, 114-124; test:41-47) states the correct PER-RECORD Σ NUMBER×FRCNT formula, names the MODSND preemption mechanism, and states the cues DO move (BOING −40 ms, DISINT −8 ms). No formula-contradicting claim remains.
- **Test changes non-vacuous + source-justified (anti-gaming):** PASS. Band test (audio-cues.test.ts:308-311) enforces BOTH `>=lo` and `<=hi`. New boing band `[0.42, 0.48]` **excludes** old 0.496 (>hi) and admits 0.456; new disint band `[0.085, 0.101]` **excludes** old 0.104 (>hi) and admits 0.096. Dedicated DISINT test (line 319) `toBeCloseTo(0.096, 3)` (±0.0005) rejects 0.104. `durationSec` flows directly from the constant via `cueEnvelope` (audio.ts:140-155), so every pinned value is dictated by the source derivation, not fitted to pass. Every changed pin matches my independent numbers.
- **Audit finding U-014 (`pair-sound.json`):** PASS, no laundering. Only `refuter_correction` prose changed to the 96 ms ruling. Frozen citations untouched: `source` (BZONE.MAC:2485 `LDA I,DISINT`) and `ours` (src/core/events.ts:28 `export type DestroyedKind = HostileKind | 'saucer'`) both unchanged; `remediated_by: bz3-10` unchanged. U-001/003/004 `ours.line` re-anchored 177→183 / 407→413 / 321→327 — I confirmed each verbatim appears at its new line in the current audio.ts (line-only shift from +6 header lines). `reanchor-citations.mjs`: **115 already correct, 0 re-anchored, 0 lost**. `check-citations.mjs`: exit 0.
- **AC divergence (epic 104 vs ruling 96):** LEGITIMATE. Epic AC-2 (epic-bz4.yaml:58) explicitly says "ruled against source and the shipped value reflects the ruling," and the description says "rule the AC-vs-engine tension and land whichever is correct" — so landing 96 ms is exactly what the AC authorizes, not a violation.

### Verification run

- `npx vitest run tests/shell/audio-cues.test.ts tests/audit/citations.test.ts` → **31 passed**.
- `npx tsc --noEmit` → exit 0.
- Diff scoped to exactly the 3 claimed files (`src/shell/audio.ts`, `tests/shell/audio-cues.test.ts`, `docs/audit/findings/pair-sound.json`); working tree clean.

### Findings

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] | Stale "104 ms zap" in the WARNG-outlasts-DISINT test comment (ruling is now 96 ms) | `tests/shell/audio-cues.test.ts:325` | Cosmetic only — the assertion is a relative `warng > disint` comparison, so logic is unaffected. Not blocking. |
| [LOW] | DISINT ruling / epic-AC divergence recorded under the IMPLEMENT-phase subsection rather than as a formally tagged Delivery Finding (Type: Conflict) | `.session/bz4-4-session.md` Delivery Findings | The ruling is thoroughly documented and the epic AC self-authorizes it; a tagged entry noting "epic's 104 ms figure superseded → 96 ms" would aid downstream epic traceability. Not blocking. |

No Critical/High/Medium findings. Data flow traced: `DISINT_DURATION_SEC (0.096)` → `cueEnvelope('disint').durationSec` → both the band test and the dedicated `toBeCloseTo` guard, and the same constant scopes the real synthesised cue's tail (audio.ts:140-155) so descriptor and sound cannot drift.

**Handoff:** To SM for finish-story.
