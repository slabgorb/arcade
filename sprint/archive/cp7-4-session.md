---
story_id: "cp7-4"
jira_key: "cp7-4"
epic: "cp7"
workflow: "tdd"
---
# Story cp7-4: The flea's 0.6s sample wraps inside a 2s drop — the sweep is shorter than the descent

## Story Details
- **ID:** cp7-4
- **Jira Key:** cp7-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-04T21:41:03Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-04T18:06:30Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Question** (non-blocking): The story mandates choosing between Path A (asset-only) and
  Path B (faithful per-frame playbackRate); TEA chose **Path A** because the acceptance
  criteria (#2 "sample's length derived from descent frame count", #3 "a guard pins the flea
  sample duration") are written for a baked sample, and Path B is a contract change to the
  payload-free `plugins/centipede/src/core/events.ts` — a wiring story beyond this 2-pt baker
  fix. If the owner wants Path B, this story should be re-pointed and re-specced.
  *Found by TEA during test design.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## TEA Assessment

**Tests Required:** Yes
**Path chosen:** A (asset-only) — see Delivery Findings. Path B (playbackRate wiring) out of scope.

**Test Files:**
- `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs` — two RED tests added in the
  `bakeSfx(outDir) writes the manifest` describe block (the one that bakes into `staging`).

**Tests Written:** 2 tests covering ACs 1, 2, 3
**Status:** RED (failing — ready for Dev)

### Coverage

| AC | Test | Status |
|----|------|--------|
| #1 no audible restart / #3 length guard | `cp7-4: the flea sample outlasts a full slow descent — one playthrough, no wrap` | failing (0.6s, needs ≥2.02s) |
| #2 sweep resolved to descent | `cp7-4: the flea sweep resolves the descent — one recompute per frame, to the bottom row` | failing (16 steps, needs ≥122) |
| #4 CKFE/pitch stay green | existing `:390`, `:628` tests | passing (regression, untouched) |

Both new assertions derive from cited ROM/core constants (flea.ts FLEA_PARK_V/FLEA_BOTTOM_V/FLEA_DV_SLOW,
timebase.ts FRAME_HZ) — the property (baked wav duration ≥ slow-descent time), not a proxy for it.

**For Dev (GREEN), Path A:**
1. `bake-sfx.mjs` fleaLoop: raise `seconds` to the slow-descent window (~2.037s) and step the
   sweep by the real `dv` over ANTV 0xF8→0x04 (≈122 steps), preserving the CKFE start + monotonic-rise
   (falling-pitch) properties the `:390`/`:628` tests already pin.
2. Document Path A **and its known limitation** (the post-60K 1.37s fast descent gets cut off, not
   wrapped) in prose, and update `docs/rom-study/sound.fixture.json` cues.fleaLoop.cp62Decision (AC #8).
3. AC #7 is ears-on: `just deploy-assets` must be RUN and the flea heard dropping — CI never touches
   the asset bucket, so a green vitest is necessary but not sufficient (cp6-2 rule).

**Self-check:** No vacuous tests — both fail on the real short-sample/coarse-sweep defect, verified by run.
**Handoff:** To Dev for implementation.

---
## Dev Assessment

**Implementation Complete:** Yes (Path A, asset-only)
**Files Changed:**
- `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` — flea stand-in `seconds` now derived
  from the slow descent (FLEA_PARK_V/BOTTOM_V/DV_SLOW + timebase FRAME_HZ → ~2.037s, was 0.6s);
  sweep steps by the real dv over 0xF8→0x04 (123 steps, was 16 at 0x10). Descent constants
  hoisted above `STAND_IN_SPECS` with source citations.
- `plugins/centipede/docs/rom-study/sound.fixture.json` — added `cp74Decision` recording Path A,
  the derivation, and the accepted fast-descent (post-60K) truncation limitation (AC #8). No
  raw frame-rate literal (the dossier guard forbids restating `15750/263`).

**Verified values:** flea sample 2.0372s, sweep 123 steps, AUDF rises 0x83→0xfd (pitch falls).

**Tests:** full centipede project 1236/1236 passing (GREEN); the two cp7-4 tests green; the
CKFE/pitch regression guards (`:390`, `:628`) and the sound-dossier suite still green. `npm run lint`
clean. Fixture is valid JSON.

**Not run (finish-time, human-gated):** AC #7 ears-on — `just deploy-assets` re-bakes and uploads
`flea_move.wav` to the R2 asset bucket (a production upload CI never touches) and the flea must be
HEARD dropping as one continuous glide. A green vitest is necessary but not sufficient here (cp6-2
rule). Left for the finish ceremony with owner authorization; not run unprompted by Dev.

**Handoff:** To Reviewer.

<!-- Delivery Findings (Dev): -->
- No upstream findings during implementation.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 | confirmed 5 (one citation cluster → F1), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 1 (citation, dup of F1), deferred 1 (constant duplication → F2, non-blocking) |

**All received:** Yes (4 enabled returned, 5 disabled skipped)
**Total findings:** 1 confirmed blocking (F1), 1 deferred non-blocking (F2), 0 dismissed

## Round-1 Reviewer Assessment (REJECTED — superseded by round 2 below)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [LOW] | `core/flea.ts` line citations off by one — a **regression**: the pre-diff comment correctly cited `:67`/`:137`, this commit changed `FLEA_PARK_V` to the wrong `:66` (while correctly fixing `FLEA_BOTTOM_V` to `:102`). Verified against the unedited `flea.ts`: `FLEA_PARK_V`=67, `FLEA_DV_SLOW`=71, `FLEA_DV_60K`=72. | `bake-sfx.mjs:200,201,253`; `bake-sfx.test.mjs:579,581` | At all 5 sites: `:66`→`:67` (FLEA_PARK_V), `:70`→`:71` (FLEA_DV_SLOW), `:71`→`:72` (FLEA_DV_60K). `:102` (FLEA_BOTTOM_V) is correct — leave it. Comment-only; no code/test-logic change. |

### Dispatch coverage (all lenses accounted for)

- **[DOC]** — reviewer-comment-analyzer (HIGH, corroborated by rule-checker and by my own read): the 5-site citation off-by-one above. **This is F1, the sole blocker.** All other prose verified accurate: `timebase.ts:20` FRAME_HZ, `CENTI4.MAC:2409-2414`, the arithmetic (122 frames, 2.0372s, 123 sweep entries), and the fixture's `cp74Decision` narrative all check out.
- **[RULE]** — reviewer-rule-checker: JavaScript checklist #1–#13 all PASS or N/A. CORE/SHELL boundary intact (baker gains no import; it correctly hand-copies literals because `flea.ts`/`timebase.ts` pull `@shared` and would break the plain-node baker — the established `audio-manifest.ts` idiom). Manifest filename `flea_move.wav` + `voice-flea` channel unchanged. One MEDIUM (F2, **deferred** — see Delivery Findings): `15750/263` and the flea constants are re-literaled in `bake-sfx.mjs` **and** `bake-sfx.test.mjs` with no drift-guard; the baker's copy is unavoidable, the test's is avoidable but a drift-guard test is an improvement beyond this 2-pt fix.
- **[SEC]** — reviewer-security: clean. Bounded sweep (even bounds, step 2, terminates on 0x04, 123 iters); `seconds`→`render()` allocates ~97,776 samples at SAMPLE_RATE 48000 (bounded, compile-time constant, no external input); no fs/injection/secret surface.
- **[SIMPLE]** — disabled; my own read: minimal, idiomatic change (hoisted constants + one loop bound + `seconds` value). No over-engineering. none.
- **[EDGE]** — disabled; my own check: the sweep loop lands exactly on `0x04` (both bounds even, step 2); the derived sample length **equals** the slow-descent event length exactly (both = 122/FRAME_HZ), so under `source.loop=true` there is no audible wrap and no partial-loop tail. none.
- **[TEST]** — disabled; preflight confirms the 2 cp7-4 tests green and the full centipede suite 1236/1236. My own read: both new assertions pin the **output** (baked `wav.seconds`, `sweep.length`) against ROM-derived expectations — a property, not a proxy — and fail loudly with descriptive messages. Not vacuous. none.
- **[TYPE]** — disabled; JS/JSON, no type surface introduced. none.
- **[SILENT]** — disabled; no error handling, try/catch, or fallback touched by the diff. none.

### Rule Compliance

Language checklist (`.pennyfarthing/gates/lang-review/javascript.md`) #1–#13: all PASS/NA (per rule-checker, re-verified). Project rules: CORE/SHELL purity PASS, citation/fixture convention PASS for the gated JSON (no `15750` literal in the fixture), manifest identity PASS. The citation off-by-one (F1) is not caught by any gate (these tools/test comments are not in `claims/*.json`), which is exactly why a human reviewer must catch it.

### Devil's Advocate

Assume this is broken. First attack: the sample length now **equals** the event length (both derive from `122/FRAME_HZ`). Is that a race? At `t≈2.037s` the stop edge fires as the sample would wrap — could a frame of jitter let it wrap once before the stop lands, reintroducing the very click this story removes? In practice the descent is frame-quantised to the same clock the sample length is derived from, so the stop edge precedes or coincides with the wrap point; but a stressed frame budget (dropped frames) could delay the stop edge and expose a sliver of wrap. It's strictly better than 0.6s (which wrapped ~3×), and the residual is sub-frame — acceptable, but not provably zero. Second attack: the **fast** descent (post-60K, dv=3, ~1.37s) plays only the first ~67% of a 2.037s glide, so the pitch never reaches the bottom-row value before the stop edge truncates it — an audibly *incomplete* fall. The story explicitly accepts this and the fixture records it, so it's a documented limitation, not a defect — but it means "one continuous sound" (AC #1) is only fully faithful for the slow drop. Third attack: constant drift (F2). If someone later corrects the open 262-vs-263 `FRAME_HZ` question at `timebase.ts:20`, or retunes `FLEA_DV_SLOW`, the baker's hand-copied literals silently desync from the sim and no test fails — the sample would once again mis-match the descent it scores, reintroducing this bug invisibly. That's real, but it's a latent future risk, not a present defect, and the baker genuinely cannot import those modules. Fourth: a confused reader follows `flea.ts:66` (F1) and lands on a section-header comment, not `FLEA_PARK_V` — small, but it erodes the dossier-trust this codebase runs on, and it's a regression from a previously-correct citation. None of these rise to a behavioural block except F1, which is trivially fixable; F2 is filed as a follow-up.

**Handoff:** Back to Dev for the F1 citation fix (comment-only).

### Reviewer (code review)
- **Improvement** (non-blocking): The `FRAME_HZ` literal `15750/263` and the flea kinematic constants (`FLEA_PARK_V`/`FLEA_BOTTOM_V`/`FLEA_DV_SLOW`) are hand-copied into both `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` and `bake-sfx.test.mjs` with no automated cross-check against their named homes (`src/shell/timebase.ts:20`, `src/core/flea.ts:67,71,102`). Affects the baker + its test (add a vitest-only drift-guard that imports the real exported constants and asserts `STAND_IN_SPECS.fleaLoop.seconds` still tracks them — the baker's own copy is unavoidable because importing those modules pulls `@shared` and breaks plain-node baking). *Found by Reviewer during code review.*
---
## Reviewer Assessment

**Verdict:** APPROVED (round 2)
**Round:** 2 (supersedes the Round-1 REJECTED assessment above)

**F1 resolved — verified:** the off-by-one `core/flea.ts` citations are corrected at all 5 sites (`bake-sfx.mjs:200,201,253`; `bake-sfx.test.mjs:579,581`) — now `:67` FLEA_PARK_V, `:71` FLEA_DV_SLOW, `:72` FLEA_DV_60K, `:102` FLEA_BOTTOM_V. Confirmed by grep (no stale `:66`/`:70`-FLEA refs remain) and by re-reading the unedited `flea.ts` declarations (67/71/72/102). Commit `29e0279`.

**Scope of round-2 change:** comment-only (5 citation edits). No code, test-logic, data, or behaviour changed since the round-1 review, so the round-1 Subagent Results stand: preflight green (30/30 flea suite, 1236/1236 centipede, lint clean), security clean, rule-checker JS checklist all pass. Re-ran the flea bake suite after the fix: 30/30 green; `npm run lint` clean.

**Dispatch coverage (all lenses, re-affirmed):** [DOC] F1 fixed — the sole blocker, now clear. [RULE] pass (F2 deferred, below). [SEC] clean. [EDGE] sample length == slow-descent event length, terminates on 0x04. [TEST] output-property assertions, not vacuous. [SIMPLE] minimal. [TYPE] no type surface. [SILENT] no error handling touched.

**Data flow traced:** ROM kinematic constants → `FLEA_DESCENT_SECONDS` → `STAND_IN_SPECS.fleaLoop.seconds` → `render()` bounded buffer → baked `flea_move.wav` (safe: compile-time constants, no external input).
**Deferred (non-blocking, filed in Delivery Findings):** F2 — constant-duplication drift-guard is a follow-up, not a blocker on a 2-pt fix.
**Outstanding for finish (AC #7, human-gated):** `just deploy-assets` must be RUN and the flea heard dropping as one continuous glide — a green vitest is necessary but not sufficient (cp6-2 rule).

**Handoff:** To SM for finish-story.
## SM Finish — AC #7 deploy evidence

`just deploy-assets` run 2026-08-05 (owner-authorized). 52 objects uploaded to the `arcade` bucket, centipede sfx included. Live 200 for the re-baked asset:

```
$ curl -sI https://arcade-assets.slabgorb.com/centipede/sfx/flea_move.wav
HTTP/2 200
content-type: audio/wav
content-length: 195616      # ~2.037s @ 48kHz/16-bit (was ~58KB at 0.6s) — the lengthened, no-wrap sample
last-modified: Wed, 05 Aug 2026 09:24:58 GMT
etag: "e156fd0e793caa237cd7b03c7766e84f"
```

**Outstanding (owner):** the "flea HEARD dropping in a live run" half of AC #7 — the asset is deployed and byte-correct; the subjective live listen is the owner's confirmation before archive.

**AC #7 CONFIRMED (owner, 2026-08-05):** flea heard dropping as one continuous falling glide in a live run — no repeat. All acceptance criteria met.
