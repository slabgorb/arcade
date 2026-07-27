---
story_id: "sw8-12"
jira_key: "sw8-12"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-12: Space-phase music follows the PH.TIM milestone schedule — the ROM opens the phase in SILENCE and plays theme at 2s (PMTH5, or PMDAR on GM.WAV>=3 odd), theme B at 10s (PMTHB), descent at 20s (PMDES) — 1s BEFORE the warp (WSMAIN.MAC:1418-1440, left-to-right eval: (2+7+1)*20=200, (2+7+1+9+1)*20=400 frames @ 20 Hz; first-wave head start 39 frames shifts all cues ~1.95s earlier). Our clone cues the space track + descent tune ON the phase edges (sw3-5/U-014). Depends on sw8-11's phaseTime clock; descoped from sw8-11 (end-condition only).

## Story Details
- **ID:** sw8-12
- **Jira Key:** sw8-12
- **Workflow:** tdd
- **Stack Parent:** sw8-11

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T17:57:49Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T17:01:11+00:00 | 2026-07-27T17:01:11+00:00 | 0 |
| red | 2026-07-27T17:01:11+00:00 | 2026-07-27T17:32:40Z | 31m 29s |
| green | 2026-07-27T17:32:40Z | 2026-07-27T17:52:40Z | 20m |
| review | 2026-07-27T17:52:40Z | 2026-07-27T17:57:49Z | 5m 9s |
| finish | 2026-07-27T17:57:49Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Type: Conflict, Urgency: blocking** — sw8-11 archive (sprint/archive/sw8-11-session.md) documents a Reviewer M7 mutation survivor (LOW, owned by sw8-12): `phaseTime` accumulation OUTSIDE the space phase is unpinned — no test/consumer reads it in surface/trench yet; sw8-12 as the first cross-phase consumer should pin the accumulation where it starts relying on it (one accumulation assert per non-space phase, in `star-wars/tests/core/space-phase-timebox.test.ts`). This is a design gap that blocks AC coverage.
  - → ✓ CLOSED by TEA in RED: the accumulation pins live in `star-wars/tests/core/space-music-milestones.test.ts` AC-7 (one per non-space phase, asserting `phaseTime` ticks by dt), housed with the cross-phase no-cue guards they make non-vacuous. See deviation 4 for why the home differs from the finding's named file.

### TEA (test design)

- **Improvement** (blocking): the SHELL/ASSET half of the 10s theme-B milestone. The shipped `space_theme.wav` CONCATENATES TH5 + THB back-to-back (measured via the bake's own pm-player: TH5 = 6.332s, THB = 8.651s), landing theme B at ~8.33s — 1.67s EARLY vs the ROM's 10s milestone (the cabinet has real silence between theme end and PMTHB). Once the core cues `themeB` at 10s, the concatenated loop would DOUBLE-PLAY THB. Dev must either split the bake (space → TH5-only + a new `theme_b.wav` via the existing tools/music-bake pipeline, R2 upload via orchestrator `just deploy-assets`) or route the themeB cue to steal the music channel — and extend whichever channel suite's REQUIRED list + FILES map matches (the sw7-18 finishGround precedent; `tests/shell/tune-channel.test.ts:108` pins `Object.keys(TUNES)` exhaustively). If the split-bake path is taken, `tools/music-bake/music-data.test.mjs`'s `segmentsOf('space') → ['TH5','THB']` pin RUNS in `npm test` and needs the matching re-seat.
  Affects `star-wars/src/shell/audio.ts`, `star-wars/tools/music-bake/*`, and one shell channel suite (Dev's pick).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the space-theme LOOP adaptation. The cabinet plays TH5 ONCE (6.33s) then sits silent until theme B; a LOOPING TH5-only space track would ring ~3x inside the 21s box. Loop-vs-one-shot is owned by Dev IN THIS STORY: either make the theme playback one-shot, or keep the loop and document the divergence in `audio.ts` + the Impact Summary. The core tests are channel-agnostic on purpose and accept either.
  Affects `star-wars/src/shell/audio.ts` / `star-wars/src/main.ts` (music pump wiring).
  *Found by TEA during test design.*
- **Gap** (non-blocking): discovered proving RED — today's edge-cued descent NEVER fires on wave 1: sw7-18 made wave 1 fly space→trench, and the edge condition is `phase === 'space' && next === 'surface'` (sim.ts:1682). The ROM plays PMDES on every space phase. The milestone port fixes this for free — the AC-6 wave-1 flight pins descent at ~18.05s wall — recorded so the Reviewer knows the fix deliberately WIDENS wave-1 behavior.
  Affects `star-wars/src/core/sim.ts` (the edge-cue deletion site).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): warp-frame channel overlay — the cabinet's single PM player lets the ground-init towers music STEAL a still-ringing descent tune; our two-channel shell overlays them (tune + music ring together). Pre-existing sw3-5 adaptation, unchanged by this story, but the milestone port widens the overlap window (descent now rings ~1s into the warp). Filed as **sw8-13** (depends_on sw8-12) — the old routing in tune-cue.test.ts's comment pointed at sw7-9/A-019, both since closed (sw7-9 completed; A-019 `remediated_by: sw8-11`).
  Affects `star-wars/src/shell/audio.ts` (channel model — sw8-13's scope, not this story's).
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (blocking — for the next star-wars RELEASE, not for this merge): `just deploy-assets` must run at the orchestrator BEFORE or WITH the release that ships this code. The bucket still holds the OLD concatenated space_theme.wav (TH5+THB, ~15s); releasing the milestone code against it makes the loop play THB at ~8.3s AND the 10s themeB cue play it again — the exact double-play this story removes. The re-bake is verified locally (space_theme.wav 6.3s TH5-only, theme_b.wav 8.7s, ten files clean); uploading from an unmerged branch was deliberately NOT done (it would change live behavior early).
  Affects the orchestrator `just deploy-assets` step (post-merge ops; carry into the Impact Summary and the release checklist).
  *Found by Dev during implementation.*
- **Gap** (non-blocking): the music-bake pipeline cannot reproduce `finish_ground.wav` — sw7-18's PMREB one-shot exists only in R2; OUTPUT_FILES has no entry, so deploy-assets never re-uploads it and a bucket wipe loses it. The old manifest-agreement test masked this with a positional 5-entry scrape; it now states the carve-out explicitly. Filed as **sw8-14**.
  Affects `star-wars/tools/music-bake/gen-music-data.mjs` + `bake-music.mjs` (sw8-14's scope).
  *Found by Dev during implementation.*

## Impact Summary

**Upstream Effects:**
- ⚠ **RELEASE-ORDERING (ops):** run `just deploy-assets` at the orchestrator BEFORE/WITH the next star-wars release. The bucket still holds the OLD concatenated space_theme.wav; the merged code cues `themeB` at 10s, so releasing against the old asset DOUBLE-PLAYS theme B (loop lands it ~8.3s + the cue at 10s). Do NOT upload before the release either in isolation is fine — uploading is safe any time AFTER this merge only for dev servers; production (main, v0.0.31 code) would lose theme B entirely until the release lands. Correct order: deploy-assets immediately before/with `just release star-wars`.
- Follow-ups filed: **sw8-13** (warp tune-channel priority — the cabinet's PM player steal semantics vs our two-channel overlay; also owns the [EDGE][LOW] death-frame milestone nuance) and **sw8-14** (finishGround bake reproducibility gap).
- sw8-11's Reviewer M7 mutation survivor is CLOSED (accumulation pins live in space-music-milestones.test.ts AC-7).

**Blocking:** None

### Deviation Justifications

8 deviations

- **Edge-cued space-theme/descent sibling suites inverted and re-seated**
  - Rationale: the ROM outranks sibling-suite prose on a fidelity story; TEA owns re-seats (Dev cannot move goalposts)
  - Severity: minor
  - Forward impact: Dev inherits 26 reds across 4 files with the parity law guarded through the migration
- **Cue NAMES pinned; the event CHANNEL (music vs tune) left to Dev**
  - Rationale: seam-agnostic (the sw3-13 lesson) — loop-vs-one-shot and union placement are shell design with asset consequences, routed via the blocking Delivery Finding; names keep the repo's Sound_24/Sound_1D vocabulary and the ROM-caller convention (themeB = PMTHB)
  - Severity: minor
  - Forward impact: Dev picks the channel; the matching shell suite gains a member (finishGround precedent)
- **The ROM's IFEQ equality ported as a CROSSING (prev < T && next >= T)**
  - Rationale: a float clock never sits ON a milestone; sw8-11's IFHS -> `>=` precedent; an equality port would silently never fire (pinned explicitly by the "crossing, not equality" test)
  - Severity: minor
  - Forward impact: none — behaviorally identical at the ROM's own 20 Hz
- **M7 accumulation pins housed in the NEW suite, not space-phase-timebox.test.ts, and land GREEN**
  - Rationale: the consumer M7 waited for is THIS story's cross-phase no-cue guards, which are vacuous without the accumulation pin — so the pins live beside the guards they arm; sw8-11's archived suite header stays an accurate record of ITS contract
  - Severity: minor
  - Forward impact: M7 closed; removing a non-space dispatch tick now fails the suite
- **Theme-B pinned at the CORE seam only; the 1.67s asset divergence routed, not unit-pinned**
  - Rationale: the wav layout is Dev/shell design with two valid shapes (split bake vs channel steal); the blocking Delivery Finding carries the measured facts and the suite-extension obligations
  - Severity: minor
  - Forward impact: Reviewer verifies the audible result and the channel-suite extension
- **Theme B ported as a one-shot TUNE with a split bake (of TEA's two sanctioned paths)**
  - Rationale: the tune channel is one-shot by construction (the cabinet's PM semantics); the steal-the-music-channel path would have made theme B loop
  - Severity: minor
  - Forward impact: `just deploy-assets` must run before/with the next star-wars release (see Delivery Findings)
- **The space theme stays a LOOPING MusicEvent (not converted to one-shot)**
  - Rationale: the re-seated suites pin the theme as a MUSIC event (musicTracks collectors), and a non-looping music channel is an @arcade/shared/audio playback-mode change — cross-repo scope this 2pt story doesn't carry
  - Severity: minor
  - Forward impact: none owed — divergence is documented in code and here; sw8-13 owns the wider channel-priority model
- **bake-music.test.mjs manifest-agreement test restructured beyond the sanctioned +1 entry**
  - Rationale: extending the positional count to 6 would have deepened the mask; a test that "agrees" by not looking is the epic's own silent-404 bug wearing a green suit
  - Severity: minor
  - Forward impact: the gap is filed as sw8-14 (add finishGround to the bake pipeline, drop the carve-out)

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Edge-cued space-theme/descent sibling suites inverted and re-seated**
  - Spec source: story title (session file) vs music-cue.test.ts (sw3-5 AC2), tune-cue.test.ts (sw7-8 U-014), wave-parity-gates.test.ts (sw7-2 U-005), select-death-star.test.ts (sw9-2 AC-6)
  - Spec text: "the ROM opens the phase in SILENCE ... Our clone cues the space track + descent tune ON the phase edges (sw3-5/U-014)"
  - Implementation: run-start / wave-rollover / warp-edge music stagings re-seated to milestone crossings; silence-at-open pins INVERT the old edge assertions; wave-parity-gates' musicEnteringWave made moment-agnostic (edge today, milestone after — green under BOTH codes, red under a half-fix)
  - Rationale: the ROM outranks sibling-suite prose on a fidelity story; TEA owns re-seats (Dev cannot move goalposts)
  - Severity: minor
  - Forward impact: Dev inherits 26 reds across 4 files with the parity law guarded through the migration
- **Cue NAMES pinned; the event CHANNEL (music vs tune) left to Dev**
  - Spec source: story title (PMTH5/PMDAR/PMTHB/PMDES)
  - Spec text: "plays theme at 2s (PMTH5, or PMDAR on GM.WAV>=3 odd), theme B at 10s (PMTHB), descent at 20s (PMDES)"
  - Implementation: tests collect music+tune events BY NAME ('space' / 'imperialMarch' / 'themeB' / 'descent'); descent stays pinned as the existing TuneEvent; theme/themeB union placement unpinned
  - Rationale: seam-agnostic (the sw3-13 lesson) — loop-vs-one-shot and union placement are shell design with asset consequences, routed via the blocking Delivery Finding; names keep the repo's Sound_24/Sound_1D vocabulary and the ROM-caller convention (themeB = PMTHB)
  - Severity: minor
  - Forward impact: Dev picks the channel; the matching shell suite gains a member (finishGround precedent)
- **The ROM's IFEQ equality ported as a CROSSING (prev < T && next >= T)**
  - Spec source: WSMAIN.MAC:1418-1440 (`CMPD #2*20. / IFEQ`)
  - Spec text: exact integer-frame equality on PH.TIM 40/200/400
  - Implementation: milestones pinned as float-dt crossings of the literals 2/10/20 with once-only and no-refire guards
  - Rationale: a float clock never sits ON a milestone; sw8-11's IFHS -> `>=` precedent; an equality port would silently never fire (pinned explicitly by the "crossing, not equality" test)
  - Severity: minor
  - Forward impact: none — behaviorally identical at the ROM's own 20 Hz
- **M7 accumulation pins housed in the NEW suite, not space-phase-timebox.test.ts, and land GREEN**
  - Spec source: sw8-11 session Delivery Findings (Reviewer M7), which named tests/core/space-phase-timebox.test.ts
  - Spec text: "one accumulation assert per non-space phase, when a consumer exists — owned by sw8-12"
  - Implementation: two accumulation asserts (surface, trench) in space-music-milestones.test.ts AC-7, green pre-GREEN
  - Rationale: the consumer M7 waited for is THIS story's cross-phase no-cue guards, which are vacuous without the accumulation pin — so the pins live beside the guards they arm; sw8-11's archived suite header stays an accurate record of ITS contract
  - Severity: minor
  - Forward impact: M7 closed; removing a non-space dispatch tick now fails the suite
- **Theme-B pinned at the CORE seam only; the 1.67s asset divergence routed, not unit-pinned**
  - Spec source: story title ("theme B at 10s") + the measured bake (TH5 6.332s / THB 8.651s)
  - Spec text: "theme B at 10s (PMTHB)"
  - Implementation: core cue 'themeB' pinned at the 10s crossing; NO shell/bake unit test written for the asset restructuring
  - Rationale: the wav layout is Dev/shell design with two valid shapes (split bake vs channel steal); the blocking Delivery Finding carries the measured facts and the suite-extension obligations
  - Severity: minor
  - Forward impact: Reviewer verifies the audible result and the channel-suite extension


### Dev (implementation)

- **Theme B ported as a one-shot TUNE with a split bake (of TEA's two sanctioned paths)**
  - Spec source: session Delivery Findings (TEA blocking finding — shell/asset half)
  - Spec text: "Dev must either split the bake ... or route the themeB cue to steal the music channel"
  - Implementation: TuneName/TUNES gain `themeB` -> theme_b.wav (8.7s); gen-music-data TRACK_SPEC.space drops THB, TUNE_SPEC gains it; music-data.mjs regenerated; space_theme.wav re-bakes to TH5 alone (6.3s); the sanctioned bake/channel suite re-seats applied (tune-data, music-data, bake-music, tune-channel)
  - Rationale: the tune channel is one-shot by construction (the cabinet's PM semantics); the steal-the-music-channel path would have made theme B loop
  - Severity: minor
  - Forward impact: `just deploy-assets` must run before/with the next star-wars release (see Delivery Findings)
- **The space theme stays a LOOPING MusicEvent (not converted to one-shot)**
  - Spec source: session Delivery Findings (TEA non-blocking finding — loop-vs-one-shot is "owned by Dev IN THIS STORY")
  - Spec text: "either make the theme playback one-shot, or keep the loop and document the divergence"
  - Implementation: loop kept; divergence documented in audio.ts's MUSIC manifest comment (6.3s TH5 repeats inside the 21s box where the cabinet plays it once)
  - Rationale: the re-seated suites pin the theme as a MUSIC event (musicTracks collectors), and a non-looping music channel is an @arcade/shared/audio playback-mode change — cross-repo scope this 2pt story doesn't carry
  - Severity: minor
  - Forward impact: none owed — divergence is documented in code and here; sw8-13 owns the wider channel-priority model
- **bake-music.test.mjs manifest-agreement test restructured beyond the sanctioned +1 entry**
  - Spec source: TEA blocking finding ("extend whichever channel suite's REQUIRED list + FILES map matches")
  - Spec text: the finding sanctioned ADDING themeB to the lists
  - Implementation: the test's positional scrape(5) was silently masking that finish_ground.wav has NO bake source (OUTPUT_FILES never included it); re-seated to scrape the full 7-entry manifest and state the finishGround carve-out explicitly
  - Rationale: extending the positional count to 6 would have deepened the mask; a test that "agrees" by not looking is the epic's own silent-404 bug wearing a green suit
  - Severity: minor
  - Forward impact: the gap is filed as sw8-14 (add finishGround to the bake pipeline, drop the carve-out)

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity bug with a fully recoverable primary-source spec (WSMAIN.MAC PHISP1/PHESP1, read firsthand this session).

**Acceptance Criteria** (context stub delegated AC definition to TEA):
- **AC-1** Entering the space phase cues NO music — run start (picker edge) and wave rollover (clearRun) are silent; PHISP1 plays nothing (WSMAIN.MAC:1378-1390).
- **AC-2** The theme fires the step `phaseTime` crosses 2 (PH.TIM 40): cue named `space`, exactly once, silence before and after.
- **AC-3** The 2s milestone consults the existing parity law: `imperialMarch` on human waves {4,6,8,...} (GM.WAV>=3 odd, 0-based — WSMAIN.MAC:1421-1426), plain `space` otherwise.
- **AC-4** A cue named `themeB` fires the step `phaseTime` crosses 10 (PH.TIM 200) — once, parity-blind (March waves too).
- **AC-5** The `descent` TUNE fires the step `phaseTime` crosses 20 (PH.TIM 400), while still in space — the space→surface warp edge no longer carries it.
- **AC-6** A full parked flight walks the schedule in order — wave 2+: space@2s, themeB@10s, descent@20s, warp@21s; wave 1: the 1.95s head start fires the theme on the FIRST step and shifts every cue ~1.95s earlier in wall time, diving to the trench at ~19.05s.
- **AC-7** No space cue ever fires from a surface / trench / gameOver frame — with the surface/trench `phaseTime` accumulation pinned (closes sw8-11 review M7) so those negatives cannot pass vacuously.

**Test Files:**
- `tests/core/space-music-milestones.test.ts` — NEW canonical suite (19 tests: 14 red, 5 intended green guards)
- `tests/core/music-cue.test.ts` — re-seated (9 red: run-start/rollover edge pins inverted per the ROM; towers/trench edge pins untouched)
- `tests/core/tune-cue.test.ts` — re-seated (2 red: descent edge → 20s milestone; net +1 test)
- `tests/core/wave-parity-gates.test.ts` — helper made moment-agnostic; fully GREEN under both codes by design
- `tests/core/select-death-star.test.ts` — 1 red (run-start music inverted)

**Tests Written:** 26 failing (new-contract), 5 intended green guards, covering 7 ACs
**Status:** RED (verified by testing-runner, full suite: **1941 tests / 184 files — 26 failed, 1915 passed, zero collateral**; totals match the 1921+20 arithmetic, so the run was not narrowed). `tsc --noEmit` clean.

**Pre-GREEN pass audit:** every passing new test is a documented keep-behavior guard (no-refire, inter-milestone silence, gameOver, M7 accumulation x2). One coincidental pass was caught and strengthened in RED: the descent once-only pin originally accepted today's edge-cued descent landing in its collection window — it now records the PHASE each cue fired in ('space' vs the warp frame's 'surface'), so it is red today for the right reason.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test/measure | Status |
|------|---------|--------|
| #1 type-safety escapes | No `as any` / `as unknown as` anywhere in the diff; staging uses real landed fields (`phaseTime` shipped in sw8-11); union members widen to `string[]` implicitly, no casts | clean |
| #4 null/undefined | No `\|\|`-on-falsy; `exhaustPort!.pos` non-null assertion follows the established portKill fixture idiom (state constructed with the port present) | clean |
| #8 test quality | No vacuous assertions; every universally-quantified negative paired with a positive existence/accumulation guard (AC-7); failure messages carry frame + clock context | pass |
| #13 fix-regressions | n/a in RED — flagged for Dev's GREEN self-review | n/a |

**Rules checked:** 3 of 13 applicable to a tests-only diff (no src changes; no React, async, config, or security surface touched)
**Self-check:** 1 coincidental-green test found and fixed (descent one-shot, above); 0 vacuous assertions

**Dev notes (implementation shape, non-binding):**
- The milestone walk belongs in `stepSpace` (sim.ts ~605, where `phaseTime` ticks): fire on `prev < T && next >= T` — no new state field needed, the clock is monotone within a phase and `enterPhase` resets it.
- Delete the `beginRun` music push (sim.ts:758), the `clearRun` re-open (sim.ts:1446), and the descent edge-cue (sim.ts:1682-1684).
- `musicTrackFor('space', wave)` already carries the AC-3 parity law — consult it at the crossing.
- The shell/asset half (themeB bake or channel steal, loop-vs-one-shot, channel-suite extension) is specified in the blocking Delivery Finding with measured durations.
- Citation-gate: the descent edge-cue deletion shifts sim.ts lines — run `node tools/audit/reanchor-citations.mjs --write` and re-run `npm test -- citations` after the edit.

**Handoff:** To Bicycle Repair Man (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/events.ts` — TuneName gains `themeB` (PMTHB, the space PH.TIM 200 milestone)
- `src/core/sim.ts` — the space stepper walks the PH.TIM milestones as once-only crossings of the sw8-11 clock (2s theme via `musicTrackFor`'s parity law, 10s themeB, 20s descent); the `beginRun` music push, the `clearRun` rollover re-open, and the descent edge-cue in `progress()` are deleted (each site keeps a comment saying where the cue went)
- `src/shell/audio.ts` — TUNES/TUNE_CHANNELS gain `themeB` → theme_b.wav; the MUSIC space entry documents the kept-loop divergence (6.3s TH5 repeats inside the 21s box where the cabinet plays it once)
- `tools/music-bake/gen-music-data.mjs` — TRACK_SPEC.space drops THB; TUNE_SPEC gains themeB (THB, TUNTAB 35-38); caller-truth comments updated
- `tools/music-bake/music-data.mjs` — REGENERATED (4 tracks + 6 tunes; space = TH5 alone)
- `tools/music-bake/bake-music.mjs` — OUTPUT_FILES += theme_b.wav
- `tools/music-bake/{tune-data,music-data,bake-music}.test.mjs`, `tests/shell/tune-channel.test.ts` — the re-seats TEA's blocking finding sanctioned (six one-shot tunes, space one segment, 20 track voices, 7-entry manifest scrape with the finishGround carve-out stated, REQUIRED_TUNES/TUNE_FILES += themeB)
- `docs/audit/findings/*.json` — 19 citations re-anchored (`reanchor-citations.mjs --write`), 0 lost

**Tests:** 1941/1941 passing (GREEN — testing-runner full suite, 184 files, totals match the RED run exactly; no narrowing). `tsc --noEmit` clean. All 26 RED tests now pass; the bake verified locally into the scratchpad (ten files, space_theme 6.3s, theme_b 8.7s).

**Branch:** `fix/sw8-12-space-music-milestones` (pushed; RED `f76add7` + GREEN `1379ec8` on top of origin/develop `e6e79ef`)

**Beyond the handoff (each logged):** the manifest-agreement test's positional scrape was masking the finish_ground.wav reproducibility gap — restated explicitly and filed as sw8-14; the release-ordering hazard for deploy-assets is a blocking-for-release Delivery Finding.

**Handoff:** To the review phase.
### Reviewer (audit)

Deviation audit — every logged deviation reviewed:

- **TEA: Edge-cued suites inverted and re-seated** → ✓ ACCEPTED by Reviewer: the ROM outranks sibling prose on a fidelity story, and mutations M6/M7 (edge-cues restored) prove the inverted pins bite (4-5 reds each).
- **TEA: Cue NAMES pinned, channel left to Dev** → ✓ ACCEPTED by Reviewer: Dev's tune-channel choice satisfies the name contract; the channel-agnostic collectors passed unchanged.
- **TEA: IFEQ ported as crossing** → ✓ ACCEPTED by Reviewer: mutation M1 (bare `>=` refire) is killed by 11 tests — the once-only half is genuinely pinned, which is what makes the crossing port honest.
- **TEA: M7 accumulation pins housed in the new suite** → ✓ ACCEPTED by Reviewer: the pins exist and arm the cross-phase guards; sw8-11's archived suite header stays a truthful record of its own contract.
- **TEA: theme-B pinned at the core seam only** → ✓ ACCEPTED by Reviewer: the asset half landed via the blocking finding exactly as routed (split bake, measured durations verified below).
- **Dev: split-bake path** → ✓ ACCEPTED by Reviewer: THB voice block md5-identical across the move (a150a8bd…), generator re-run reproduces music-data.mjs byte-identically, bake verified (space_theme 6.3s TH5-only, theme_b 8.7s).
- **Dev: loop kept + documented** → ✓ ACCEPTED by Reviewer: the divergence note is in audio.ts's MUSIC manifest where the next reader will look; converting the channel to one-shot is @arcade/shared scope this story rightly refused.
- **Dev: manifest-agreement test restructured** → ✓ ACCEPTED by Reviewer: the positional scrape was hiding a real reproducibility hole; the explicit carve-out + filed sw8-14 is the honest shape. Extending the count would have deepened the mask.

Undocumented-deviation sweep: one implementation-level nuance found, logged as a Reviewer finding (not a spec deviation): the milestone block fires on the frame the shield hits zero, where the ROM's PHIS0D exit precedes the PH.TIM walk — see [EDGE][LOW] in the Reviewer Assessment.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1941/1941 green, tsc clean, 0 smells, branch 0 behind / 2 ahead, tree clean) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (dying-frame milestone nuance found: [EDGE][LOW] below; large-dt multi-crossing reasoned through in Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (cue events are fire-and-forget by design; the 404-on-missing-asset silence is carried by the release-blocking Delivery Finding) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed via 7-mutation battery, ALL KILLED (M1 refire: 11 red; M2 theme@3s: 20; M3 parity dropped: 7; M4 themeB@8.33s: 5; M5 descent@21s: 7; M6 edge-descent restored: 4; M7 beginRun music restored: 5) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (every deleted cue site carries a where-it-went comment; audio.ts documents the loop divergence; no banned purity words in new core comments — full suite incl. the purity scan is green) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (TuneName union + Record<TuneName,string> keep the manifest exhaustive at compile time; no casts added in src) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (no input parsing, no auth surface; static asset filename added to a const manifest) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (the milestone walk is 3 conditions + 1 helper closure; nothing speculative added) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — lang-review/typescript.md walked manually in Rule Compliance below |

**All received:** Yes (1 returned clean, 8 disabled via settings and assessed directly)
**Total findings:** 1 confirmed ([EDGE][LOW]), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `dt` → `stepGame`'s space stepper (`phaseTime = state.phaseTime + dt`, sim.ts) → `crossed(mark)` (prev < T && next >= T) → `events` (`music`/`tune`) → main.ts event pump (`case 'music'` → `startLoop(track)`, `case 'tune'` → `playTune(tune)`) → shared-audio channels via `MUSIC`/`TUNES` manifests → R2 filenames. themeB flows through the pump with ZERO main.ts changes (the generic tune case), which is exactly what the manifest-driven design is for. Safe: pure sim decides WHEN, shell decides HOW, and a missing asset degrades to silence (carried as the release-ordering finding, not a code defect).

**Pattern observed:** the crossing guard reads the PRE-tick clock against the POST-tick clock in the same expression the stepped state is built from (`phaseTime` bound once, reused in the state literal) — no drift between what was compared and what was stored. Good pattern; mirrors PHESP1's add-then-compare.

**Error handling:** no new failure paths (pure event emission); gameOver/attract/select frames exit before the stepper (sim.ts:154-208), proven by the AC-7 guard staying green through the battery.

### Observations

1. `[VERIFIED]` Once-only crossing semantics — mutation M1 (bare `>=` refire) killed by 11 tests; the crossing reads pre/post tick at the single site the state literal also uses.
2. `[VERIFIED]` The parity law is consulted AT the milestone — M3 (hardcoded wave-1 theme) killed by 7 tests across wave-parity-gates + music-cue; `musicTrackFor('space', state.wave)` complies with the sw7-2 single-shim rule (romWave0 inside musicTrackFor).
3. `[VERIFIED]` All three edge-cues are genuinely dead — M6/M7 restorations each red 4-5 tests; grep shows no `music` push in `beginRun`/the clearRun site, no `tune: 'descent'` in `progress()`.
4. `[VERIFIED]` The generated artifact is reproducible and the data move is lossless — re-running gen-music-data.mjs leaves music-data.mjs byte-identical, and the THB voice block is md5-identical (a150a8bd…) between the old space segment and the new themeB tune.
5. `[EDGE]` `[LOW]` (confirmed finding): the milestone block is unconditional on this frame's `lives`, so a player whose last shield falls on exactly a crossing frame hears the cue start over the death — the ROM's PHESP1 exits through PHIS0D BEFORE the PH.TIM walk, so the cabinet would not. Reachable only in the 0.05s crossing window of the death frame; the shell's tune channel already rings across gameover (pre-existing sw3-5-era behavior, sw8-13's channel-model territory). Non-blocking; noted for sw8-13's scope.
6. `[VERIFIED]` Bake output correct end-to-end — ten files bake clean locally; space_theme 6.3s (TH5 only), theme_b 8.7s matching the TEA-measured THB duration exactly.
7. `[DOC]` `[VERIFIED]` The loop-vs-one-shot divergence is documented where it lives (audio.ts MUSIC manifest) as the Dev-owned finding required, and the manifest-agreement test now STATES the finishGround carve-out (filed sw8-14) instead of hiding it positionally — a strict honesty improvement to a shipped test.

### Rule Compliance (lang-review/typescript.md, walked against the diff)

| # | Check | Result |
|---|-------|--------|
| 1 | Type-safety escapes | PASS — no `as any`, no `as unknown as`, no `@ts-ignore`, no new non-null assertions in src (`exhaustPort!` in the new test file follows the established portKill fixture idiom with the port constructed present) |
| 2 | Generic/interface pitfalls | PASS — `Record<TuneName, string>` keeps TUNE_CHANNELS exhaustive at compile time; TuneName stays a string-literal union, not an enum |
| 3 | Enum anti-patterns | PASS — no enums introduced (union types per house style) |
| 4 | Null/undefined | PASS — no `\|\|`-on-falsy introduced; no optional-chain-then-call |
| 5 | Module/declaration | PASS — type-only import style unchanged; no new re-exports |
| 6 | React/JSX | N/A — no .tsx |
| 7 | Async/Promise | N/A — no async in diff |
| 8 | Test quality | PASS — 0 `.only`/`.skip` (preflight), no `as any` in assertions; suite quality proven empirically by the 7/7 mutation kill rate |
| 9 | Build/config | PASS — no config changes; strict tsc clean |
| 10 | Input validation | N/A — no user input surface in diff |
| 11 | Error handling | N/A — no catch blocks in diff |
| 12 | Performance/bundle | PASS — one per-frame arrow closure in a stepper that already allocates the full state literal; no barrel imports |
| 13 | Fix-introduced regressions | PASS — the two follow-up edits during GREEN (manifest scrape, TUNE lists) re-checked against #1-#12 |

### Devil's Advocate

Assume this is broken. The likeliest fracture: the milestone walk lives in `stepGame`'s fall-through, and I claimed that fall-through IS the space phase — if any future mode slipped through (a pause screen, a new phase), the clock would tick and cues would fire in it. I re-read the dispatch: attract (154), select (167), gameover (170), surface (328), trench (336) all return before the walk; the exhaustive `Phase` union means a NEW phase forces a compile-time decision at `NEXT_PHASE`/`PHASE_MUSIC` anyway. Second attack: a huge `dt` (tab-restore) crossing several marks at once — all fire in ONE frame, theme + themeB + descent stacked, the tune channel keeping only the last. Is that a defect? The shell loop's accumulator cap bounds real dt; under the raw API it degrades to "the last scheduled cue wins," which is literally the cabinet's one-tune-player semantics — acceptable, and the alternative (suppressing later marks) would be WRONG on wave 1 where 1.95→2.0 legitimately crosses on the first step. Third: could the wave-rollover silence regress the "run two goes silent" bug sw3-5 fixed? The old bug was a music channel that never re-cued on later waves; now NOTHING cues on the rollover by design — but the 2s milestone of every new wave re-cues it, and the moment-agnostic wave-parity helper plus music-cue's re-seated March cases prove waves 2/3/4/5/6/8/10 all get their theme. Fourth: does deleting the descent edge-cue lose the tune when the box is skipped early (a port kill mid-space? impossible — the port exists only in the trench; surface-entry always follows the full box). Fifth: the death-frame nuance above — real, small, logged, routed. I could not break it further; the battery already tried harder than I can by hand.

**Merge safety:** branch is 0 behind origin/develop (preflight) — HEAD's parent chain sits directly on e6e79ef, so the merged tree IS the tested tree; no trial-merge divergence exists to re-run.

**Handoff:** To The Announcer (SM) for finish-story. Carry into the Impact Summary: (1) the release-blocking deploy-assets ordering (Dev finding), (2) sw8-13 (channel priority, filed by TEA) and sw8-14 (finishGround bake gap, filed by Dev), (3) the [EDGE][LOW] death-frame nuance routed to sw8-13's scope.