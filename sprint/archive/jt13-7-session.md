---
story_id: "jt13-7"
jira_key: "jt13-7"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-7: Lava-troll grab is silent — add the SNTROL 'captured' cue

## Story Details
- **ID:** jt13-7
- **Jira Key:** jt13-7
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** fix/jt13-7-troll-grab-sntrol-cue
- **PR:** 547 (MERGED into develop, 2026-08-18)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-18T13:14:23Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T12:03:31Z | 2026-08-18T12:06:40Z | 3m 9s |
| red | 2026-08-18T12:06:40Z | 2026-08-18T12:22:48Z | 16m 8s |
| green | 2026-08-18T12:22:48Z | 2026-08-18T12:56:11Z | 33m 23s |
| review | 2026-08-18T12:56:11Z | 2026-08-18T13:14:23Z | 18m 12s |
| finish | 2026-08-18T13:14:23Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap / non-blocking — the description's `sim.ts:1034` caller cite is stale (SM already
  flagged this).** Confirmed by measurement: `beginGrip` has NO caller at that line. Its real
  production callers are the grip-commit branch of `stepTrolls` (`troll.grip = beginGrip(lavgra)`)
  and `demo.stepTrolls` (difficulty.ts). Dev: emit the cue at the grip-commit moment, not by
  chasing a line number.
- **Improvement / non-blocking — there is no game-LEVEL troll-grab harness.** I first tried the
  jt13-10 idiom (`createGame` + splice a staged sim + drive `stepGame`, assert `game.events`), but
  the troll never committed the grab under `stepGame` with a hand-staged sim (the session wrap does
  not drive a lone staged troll). The authoritative troll harness (demo-jt9-11) drives grips with
  `stepSim` and asserts on `sim.cues`; I followed it. This is sound — `stepGame` lifts `sim.cues`
  into `game.events` verbatim (game.ts), and the AC2 dispatch test closes the chain to `play()`.
  Noted only so a later story that wants an end-to-end game-level grab test knows it must first
  build that harness (or discover why `stepGame` skips the staged troll).
- **Gap / non-blocking — AC4 is enforced by an existing guard cascade, not by a new test.** Adding
  `'troll-grab'` to `EVENT_KINDS` (forced by AC1) reddens three PRE-EXISTING guards that currently
  pin it as deferred: `audio-events.test.ts` (`const deferred = ['troll-grab']`, ~:263),
  `audio-flap.test.ts` (~:1302, asserts `.toContain('troll-grab')`), `audio-thud.test.ts` (~:1463,
  same). Dev MUST update all three (drop 'troll-grab' from the deferred set; re-point the stale
  uf1-10/uf1-11 ownership comments to jt13-7) — reverting the wiring to keep them green silently
  fails the AC (mg1-9 trap). My RED file deliberately does NOT duplicate these guards.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- The test plan's step 3 ("Audio test: verify the SNTROL cue plays when the troll grips a player
  in a live game session") is asserted at the SIM level (`stepSim` → `sim.cues` contains
  `'troll-grab'`) plus the dispatch map (`playEventSounds([{type:'troll-grab'}])` → `play('trollGrab')`),
  NOT by booting a live `stepGame` session. Why: `stepGame` lifts `sim.cues` into `game.events`
  verbatim (a generic lift already pinned for every other cue), and the game-level troll harness
  does not exist (see Delivery Findings). The two assertions together cover the whole chain
  sim.cues → game.events → play('trollGrab'). No behaviour is left unpinned.

### Dev (implementation)

- **Removed the manifest-size COUNT guards (user-directed scope expansion beyond jt13-7's ACs)**
  - Spec source: user ruling, 2026-08-18 (mid-GREEN), verbatim intent: "I am ok with 'every sound
    needs support', but not 'OH WOW WE HAVE 18 NOT 17 NOW SEND IT BACK TO TEA'".
  - Spec text: jt13-7 ACs say nothing about the count guards; they only require the cue wired +
    the three deferred guards updated + full cabinet green.
  - Implementation: deleted `jt9-7 AC4` (prose cue-count) and `jt9-28 AC5/AC6` (derived-count
    enforcement + read-set selector) from `audio-channel-role.test.ts` with their sole-use support
    (`NUMBER_WORDS`, `WORD_ALT`, `CUE_COUNT`, `CUE_TOTAL`, `wordOrDigit`, `walkFiles`, `audioFiles`,
    `AUDIO_SCAN_REQUIRED`, `label`); removed two `toBe(20)` in `audio-frames-edge-cases` and turned
    a `toBe(26)` row-count into `toBeGreaterThan(0)` (its role was non-vacuity); reworded the count
    prose in `audio.ts`, `main.ts`, `core/events.ts`, `bake-samples.test.mjs`.
  - Rationale: those guards' only function was to force a hand-typed manifest count to stay in sync,
    so every cue addition reddened CI on a number, not a defect. The reachability + completeness
    guards already prove every cue is wired and sounds. Kept ALL completeness guards (golden-hash
    set-equality, one-`.wav`-per-cue, per-cue window pins, ROM-cited-every-cue) and the channel-
    SEMANTICS guards (`flatten`/`docblockAbove`/`channelDecidesNothing`).
  - Severity: moderate (deletes established guard tests).
  - Forward impact: adding the next cue still forces a golden row + a synth spec (support) but no
    longer trips any count assertion. If a future story wants a manifest-size invariant back, it
    should derive it (`Object.keys(SOUNDS).length`) rather than hard-code, and NOT require count
    prose to exist.

- **`stepTrolls` grew a `cues` channel** — Spec source: context AC1/AC2. Spec text: "emit a
  troll-grab event at the beginGrip moment; map to a SNTROL cue." Implementation: `stepTrolls` now
  returns `{ processes, events, cues }` and the frame builder merges `trollStep.cues` into the
  frame's cue stream; the cue is pushed once at the LT1GRP grab commit. Rationale: the grab lives
  in `stepTrolls`, which previously surfaced only score `events`, not audio `cues`. Severity: minor.
  Forward impact: none — additive; jt13-11 (grip-drown cinematic) can push more cues the same way.

## SM Assessment

Setup by Baldur (SM), 2026-08-18. Story jt13-7 (joust, 3pt, tdd, type:bug): wire the
SNTROL "captured by lava troll" cue so the grab is no longer silent.

**Sibling / contention probe (clean):** `git fetch --prune` + `git branch -r | grep -i jt13`
found only the completed jt13-2 branches — no jt13-7 branch anywhere. No live session for
jt13-7 in any checkout. Merge gate clear (no open PRs). `develop` in sync. Claim committed +
pushed on `fix/jt13-7-troll-grab-sntrol-cue` so the story is sibling-visible.

**Measured corrections applied to the context (epic description was stale):**
1. The description's caller cite `sim.ts:1034` is WRONG. The real production caller is
   `sim.ts:1143` (`troll.grip = beginGrip(lavgra)`); jt9-11's caller is recorded at
   `difficulty.ts:392` (demo.stepTrolls). Context uses 1143 / difficulty.ts:392, never 1034.
2. **Guard-test web (the story's main hazard).** `'troll-grab'` is presently DEFERRED and
   pinned by THREE guards that WILL go RED when wired — expected, not a regression:
   audio-events.test.ts (~263, `deferred = ['troll-grab']`), audio-flap.test.ts (~1302) and
   audio-thud.test.ts (~1463) (both assert the deferred array `.toContain('troll-grab')`).
   Dev MUST update the guards (move troll-grab out of `deferred`), NOT revert the wiring to
   keep them green (mg1-9 trap). This is IN SCOPE.
3. **Phantom owners resolved by measurement, not by asking.** Those guards attribute
   `'troll-grab'` to "uf1-10/uf1-11" — story ids that exist NOWHERE in sprint/ (no active,
   no archive, no epic-uf1). Stale/renumbered ids. The deferral premise ("no reachable
   moment / zero production callers") is now FALSE because jt9-11 (shipped, sprint-2632)
   gave beginGrip a production caller. So there is no competing live owner — jt13-7 is the
   sole legitimate owner and this is a clean un-defer. No backlog-shape ruling needed.

**ACs:** the epic YAML had `acceptance_criteria: null`; four ACs were DERIVED (jt8-6 precedent)
from ROM ground truth (LT1GRP→SNTROL, JOUSTRV4.SRC:1646-1647, SNTROL :8097) plus the guard-update
requirement. Full-cabinet green required (joust vitest project + orchestrator + lint).

**Scope boundary:** SNPLAV/SNELAV player/enemy-in-lava cues are OUT of scope — jt13-10 (DONE)
and jt13-11. Do not touch lava-death cues here.

Handoff: TEA (Tyr One-Handed) for RED.

## TEA Assessment

### Red Phase (test writing)

RED by Tyr One-Handed (TEA), 2026-08-18. One new file: `plugins/joust/tests/jt13-7-troll-grab-cue.test.ts`
(6 tests, all failing for the right reason). Verified: `npx vitest run --project joust` →
**6 failed | 3774 passed**, the 6 all in the new file; `npm run lint` clean; the three deferred
guards still GREEN (troll-grab is still deferred on develop — they flip only when Dev wires it).

**What each test pins, and how it goes green:**
- **AC1 — `EVENT_KINDS` includes `'troll-grab'`.** RED: 19 kinds, no troll-grab. Green: add it to
  the tuple in `core/events.ts`.
- **AC1 — a real grab emits a single `troll-grab` cue.** Drives the demo-jt9-11 grip staging
  through `stepSim` (grab commits ~frame 0), asserts `sim.cues` contains `'troll-grab'` exactly
  once (non-vacuity: the fixture must actually commit the grab, checked via `grippedBy`). RED:
  grip commits, `sim.cues` stays empty. Green: emit `{type:'troll-grab'}` into the sim's cue
  stream at the beginGrip moment (once, at onset — NOT every grip frame).
- **AC2 — dispatch maps it.** `playEventSounds([{type:'troll-grab'}])` → `play('trollGrab')`. RED:
  `cueFor` returns null. Green: add the `case 'troll-grab': return 'trollGrab'` (the `never`
  exhaustiveness guard also forces this at compile time once the kind exists).
- **AC2 — `SOUNDS.trollGrab` is a `.wav`.** RED: undefined. Green: add `trollGrab` to `SoundName`
  + `SOUNDS`.
- **AC2 — `CUE_SOURCES.trollGrab` cites SNTROL.** RED: undefined. Green: add a `kind:'rom'`,
  `table:'SNTROL'` provenance record (byte-exact FCB row + LT1GRP call site; the citations gate
  will re-open it against the vendored source).
- **AC3 — the stale "zero production callers" claim is gone from `events.ts`.** RED: present.
  Green: correct the comment.
- **AC4** is enforced by the guard cascade (see Delivery Findings) — no new test; Dev updates the
  three existing guards + full cabinet green.

### Rule Coverage (.pennyfarthing/gates/lang-review/typescript.md)

- **#3 switch exhaustiveness (`never` guard):** the dispatch test exercises the runtime side
  (`troll-grab`→`trollGrab`); the compile side is `cueFor`'s `never` default — adding the kind
  without a case is a tsc error, so `npm run lint` in the gate is the compile-time half.
- **#8 test quality:** no `as any` in assertions; the behavioural test carries an explicit
  non-vacuity guard (the grab must commit) so an empty cue stream cannot pass vacuously; the
  once-only assertion guards a per-frame re-emit.
- Remaining checklist sections (React/JSX #6, async #7, build/config #9) do not apply — this is
  pure payload-free event data plus cue wiring.

Handoff: Dev (Loki Silvertongue) for GREEN.

## Dev Assessment

GREEN by Loki Silvertongue (Dev), 2026-08-18. All 6 jt13-7 tests pass; full cabinet green.

**Verification (run directly):**
- `npx vitest run --project joust` → **3776 passed** (was 6 failing).
- `npm run test:orchestrator` → **505 passed, 0 failed**.
- `npx vitest run` (all projects) → **17344 passed, 1 todo**.
- `npm run lint` → clean.

**Files changed (14, all joust):**
- Feature: `core/events.ts` (EVENT_KINDS + stale-comment fix), `core/sim.ts` (stepTrolls cue
  channel + LT1GRP emit), `shell/audio-manifest.ts` (SoundName/SOUNDS/CUE_SOURCES SNTROL),
  `shell/audio-dispatch.ts` (cueFor case), `shell/audio.ts` (CHANNELS prio-50),
  `tools/sample-bake/bake-samples.mjs` (synth spec).
- AC4 guard flips: `tests/audio-events.test.ts`, `tests/audio-flap.test.ts`, `tests/audio-thud.test.ts`
  (troll-grab un-deferred; the canaries now assert it is wired).
- Support fixtures for the new cue: `tests/audio-frames-edge-cases.test.ts` (window 30),
  `tests/audio-priority.test.ts` (priority 50), `tools/sample-bake/bake-samples.test.mjs` (golden
  hash `430e191f…`).
- Count-guard removal (see Design Deviations): `tests/audio-channel-role.test.ts` and count-prose
  rewords in `shell/audio.ts`, `main.ts`, `core/events.ts`, `bake-samples.test.mjs`.

**ROM fidelity of the cue:** SNTROL is FCB `050,!N$09!.$7F,30` at JOUSTRV4.SRC:8097 (priority 50,
30-frame window), played by LT1GRP `LDX #SNTROL` at :1646 — cited byte-exact in CUE_SOURCES and
re-opened green by `audio-rom-citations`. The synth spec is an honest stand-in (the sound board
firmware VSNDRM4.SRC was never vendored); it is a distinct waveform, proven by the golden set.

Handoff: Reviewer (Heimdall).

## Subagent Results

| # | Subagent | Received | Verdict | Findings | Notes |
|---|----------|----------|---------|----------|-------|
| 1 | reviewer-preflight | Yes | GREEN | 0 | lint clean; joust + orchestrator green; 0 code smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | dead loop (fixed), missing >0 floor (fixed), "restore count guard" (CHALLENGED) |
| 5 | reviewer-comment-analyzer | Yes | findings | 6 | wrong "own channel" comment (fixed) + 5 stale counts (de-counted) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 5 | all stale-count prose (rule 17/20/24); 29 other rules + purity/ROM/exhaustiveness/completeness CLEAN |

All received: Yes

## Reviewer Assessment

**Verdict:** APPROVED

Reviewed by Heimdall, 2026-08-18 (approved after in-review corrections). Branch rebased onto develop
(df5-8 landed); re-verified green THERE — joust 3824, orchestrator 505/0, lint clean.

### The functional change is sound — independently verified

**[RULE]** byte-verified the SNTROL citation against the vendored ROM (`od -c` of
JOUSTRV4.SRC:8097 and :1646), confirmed core purity (no DOM/clock/shell import in the sim.ts/events.ts
changes), the `cueFor` `never`-exhaustiveness (troll-grab case present, tsc green), and completeness
(`trollGrab` in SoundName/SOUNDS/CHANNELS/CUE_SOURCES/FRAME_DURATIONS/SPECS/golden). **[RULE]** also
confirmed the cue emits at the ONLY `beginGrip` call site (single grab path — no sibling can leak an
uncued grab). **[TEST]** mutation-tested the three load-bearing new assertions (emission, fires-ONCE,
dispatch map) — each reddened correctly — and confirmed the behavioural test is non-vacuous (asserts the
grab actually commits before asserting the cue), and the flipped audio-flap/thud canaries still catch
drift in both directions.

### Every finding was comment/test hygiene — all resolved

The three analysis subagents converged on ONE defect class: stale cue-count prose, plus one factually
wrong comment and two test nits. All fixed this round:
- **[DOC] audio.ts CHANNELS** — my "(its own channel)" was wrong; trollGrab shares `prio-50` with
  waveBounty (both FCB `050`). The CODE is correct (same priority → same channel, per the channel-role
  invariant, suite green); only the comment was wrong. Corrected.
- **[DOC][RULE] Stale current-total counts** ("20 cues"/"nineteen moments"/"twenty real records") in
  sim.ts, audio-priority (x2 titles + 1), audio-frames-edge-cases (header), audio-transporter-split (x4),
  audio-manifest, audio-channel-role — **de-counted** (numbers stripped, one-time, cannot rot again).
  ([DOC] found 5, [RULE] found the same class as rules 17/20/24.) Historical scope claims ("jt5-1
  shipped eleven kinds") left intact — they don't drift.
- **[TEST] audio-events.test.ts** — removed a dead zero-iteration `for` loop; kept the inert `deferred`
  array (sibling files regex it as source text) + the live inverse assertion.
- **[TEST] audio-frames-edge-cases.test.ts** — restored a `toBeGreaterThan(0)` non-vacuity floor on the
  ROM-cited sweep.

### CHALLENGED: "restore the jt9-28 count guard" ([TEST] #3, [RULE] #24)

The subagents are factually right that removing the jt9-28 `CUE_TOTAL` sweep left the stale-count class
uncaught. But their remedy — restore the guard — is **dismissed by explicit user directive** (2026-08-18):
that guard is precisely the count treadmill the user ordered removed ("we have 18 not 17 now send it back
to TEA … who the fuck CARES"). The valid underlying concern (stale prose) is resolved more robustly by
DE-COUNTING: a comment with no number cannot go stale, whereas the guard only forces the number to be
chased forever. The manifest remains the single source of truth for the count; completeness guards
(golden set-equality, one-wav-per-cue, per-cue windows, ROM-cited-every-cue) are untouched and still
prove every cue is supported.

### Rule Compliance (lang-review/typescript.md)

**[RULE]** All applicable checks pass (34 rules, 61 instances, 0 functional violations; the 5 flagged
were all the stale-count class, now fixed). No `as any`/`as unknown as` in assertions; exhaustiveness
guard intact; `.js` extensions per repo convention; test fixtures single-cast per the suite's idiom.

Handoff: SM (Baldur) for finish.
## Impact Summary

Story jt13-7 wires the SNTROL "captured by lava troll" cue so the lava-troll grab is no longer silent
(14 files, joust only). Feature: `EVENT_KINDS` gains `'troll-grab'`; `stepTrolls` emits it once at the
LT1GRP grip-commit via a new `cues` channel; audio maps it to `trollGrab` → `troll_grab.wav` with a
byte-exact SNTROL citation (FCB `050`, :8097 / LT1GRP :1646), priority-50 channel (shared with
waveBounty), synth spec + golden hash. The three deferred guards (audio-events/flap/thud) are
un-deferred — `troll-grab` was the last deferral.

**Cabinet green (rebased on develop, df5-8 landed):** joust 3824, orchestrator 505/0, lint clean.
ROM citation byte-verified; core purity intact; `cueFor` exhaustiveness enforced by tsc; completeness
(SoundName/SOUNDS/CHANNELS/CUE_SOURCES/FRAME_DURATIONS/SPECS/golden) all carry trollGrab.

**Review:** one round, APPROVED. Only comment/test-hygiene findings (one wrong comment, ~a dozen stale
count-prose sites, a dead loop, a missing non-vacuity floor) — all fixed in-review. The subagents'
"restore the jt9-28 count guard" suggestion was CHALLENGED and dismissed per explicit user directive:
that guard is the count treadmill the user ordered removed; de-counting the prose is the robust fix.

**Blocking issues: 0.** Design deviations (user-directed count-guard removal; `stepTrolls` cues channel)
are intentional and recorded above.
