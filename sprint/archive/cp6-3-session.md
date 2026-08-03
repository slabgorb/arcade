---
story_id: "cp6-3"
jira_key: "cp6-3"
epic: "cp6"
workflow: "tdd"
---
# Story cp6-3: POKEY voice 0 is contended and our CHANNELS map does not model it — the player explosion must silence the kill cues

## Story Details
- **ID:** cp6-3
- **Jira Key:** cp6-3
- **Points:** 5
- **Priority:** p2
- **Repos:** arcade
- **Workflow:** tdd
- **Branch:** none
- **Stack Parent:** none

> Trunk-based. Work lands directly on `main`. The claim branch
> `feat/cp6-3-voice-0-contention` is pushed EMPTY (tip == `main`) purely so a sibling
> checkout's `git branch -r | grep cp6-3` probe sees the claim; nothing ever merges it.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T17:50:57Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T08:40:00Z | 2026-08-03T13:01:03Z | 4h 21m |
| red | 2026-08-03T13:01:03Z | 2026-08-03T13:15:04Z | 14m 1s |
| green | 2026-08-03T13:15:04Z | 2026-08-03T13:51:45Z | 36m 41s |
| review | 2026-08-03T13:51:45Z | 2026-08-03T14:22:23Z | 30m 38s |
| green | 2026-08-03T14:22:23Z | 2026-08-03T15:21:50Z | 59m 27s |
| review | 2026-08-03T15:21:50Z | 2026-08-03T15:48:43Z | 26m 53s |
| green | 2026-08-03T15:48:43Z | 2026-08-03T16:00:41Z | 11m 58s |
| review | 2026-08-03T16:00:41Z | 2026-08-03T17:50:57Z | 1h 50m |
| finish | 2026-08-03T17:50:57Z | - | - |

## Acceptance Criteria

1. AC-1 VOICE 0 IS ARBITRATED, NOT MERGED. While the player explosion is ringing, all four ROM kill cues (segmentKill, spiderKill, fleaKill, scorpionKill) are REFUSED — they must not reach the engine's start path at all. A player explosion arriving while a kill cue rings INTERRUPTS it. This is the cabinet's direction and it is the OPPOSITE of plain channel-sharing: CENTI4.MAC:2437's `BEQ 52$` is the only reference to label `52$` (:2418) in the SOUNDS routine, so the kill path is unreachable while CHAN5 is non-zero. Implemented with the shared engine's `priorities`/`frameDurations` (jt5-5), which arbitrate ACROSS channels (src/shared/audio.ts:253-255).

2. AC-2 CHANNELS IS NOT EDITED, AND cp6-1's AC-5 GUARD STAYS GREEN. `tests/audit/sound-dossier.test.ts:431-478` must still pass unmodified at the end of this story. The filing's instruction to expect a CHANNELS edit and to retire that guard was written against a candidate fix that does not reproduce the cabinet; do not delete a guard on this story's authority. If the implementation appears to require a CHANNELS change, that is a signal the arbitration is being modelled the wrong way — stop and say so rather than editing the map.

3. AC-3 THE WINDOW COMES FROM THE FIXTURE, NOT FROM TASTE. The player explosion holds voice 0 for lengthFrames 19 x frameGate 4 = 76 video frames (CENTI4.MAC:1811 seeds 0x13; :2438-2439 gates on `AND I,3`); each kill cue holds 19 frames at frameGate 1. Both numbers are read from `docs/rom-study/sound.fixture.json` rather than written a second time as literals, so a dossier correction cannot silently disagree with the engine.

4. AC-4 tick() IS DRIVEN ONCE PER STEPPED FRAME, FIRST AND UNCONDITIONALLY. centipede has never called `engine.tick()` and declares no priorities today; joust is the only game that does. Without the tick the arbitration window never expires and the FIRST player death refuses every kill cue for the rest of the run. Follow joust's shape and its reasoning: `plugins/joust/src/shell/audio-dispatch.ts:98-110` ticks at the top of `playEventSounds`, before any cue, on every frame including silent ones. centipede's `playEventSounds` is already called once per stepped frame from `main.ts:203`.

5. AC-5 ONLY `pokeyVoice: 0` CUES ARE ARBITRATED — USER RULING, 2026-08-03. The arbitration set is derived from the fixture's `pokeyVoice` field, not hand-listed. The three INVENTIONS — mushroom, headBottom, waveClear, each `pokeyVoice: null` and each riding a bucket shared with an arbitrated cue — stay OUTSIDE arbitration and ring through a player death. The cabinet never sounds them, so arbitrating them would invent behaviour rather than transcribe it. A test must show an invention sounding during a death window in which a kill cue is refused, or the ruling is unproven.

6. AC-6 THE DEATH-INSTANT CHANNEL CLEAR IS MODELLED — USER RULING, 2026-08-03 (folded in). The ROM zeroes CHAN0/1/2/3/6 on the death frame itself (CENTI4.MAC:1813-1818), so the spider, flea and scorpion loops must stop ON the death frame rather than at the death pause's end — today they ring up to DEATH_DELAY = 0x30 = 48 frames (0.8s) longer than the cabinet. The march is ALREADY correct (`marchAudible` carries `s.delay === 0`; `player-died+march-stop` is a recorded pair at tests/audio-wiring.test.ts:94) and must not regress. Expect the seeded pair-composition fingerprint to MOVE: re-measure it from a run, never hand-edit the expected list.

7. AC-7 THE DOSSIER GAINS THE VOICE-0 RULE IT DOES NOT CARRY. The fixture's existing `voiceArbitration` record is POKEY voice 1 and sound.md section 2.5 is the voice-1 prose; a term scan of the fixture scores zero for 2437, AUDF0, AUDC0 and `52$`. Record voice 0's contention where cp6-1 recorded voice 1's — the contenders, the control-flow mechanism (the single reference to `52$`), the 76-vs-19-frame windows, and how our clone now models it — with citations that pass the existing citation gate. Do not disturb the voice-1 record.

8. AC-8 EVERY NEW GUARD IS MUTATION-PROVEN, WITH THE MUTANT RECORDED VERBATIM. The baseline is 1668/1668 across 89 files, and the correct fix is invisible to all of it except mechanical fixture rework — so the tests written here ARE the entire observable footprint. For each new assertion, name the exact source mutation that reddens it and paste the mutated string, so the next reader re-runs the string rather than reconstructing the intent. A 'no kill cue sounds during a death' sweep additionally needs a POSITIVE CONTROL proving the sweep can observe a kill cue at all — see the open question about the ~28-frame audible tail.

## Sm Assessment

### What this story is, in one line

The cabinet rings ONE sound when the player dies on top of a kill; we ring two. The fix
is arbitration, and the story as filed prescribes a mechanism that produces the
*opposite* of the cabinet.

### Board probes before any setup work

- `git fetch --prune` then `git branch -r | grep -Ei cp6` → **no cp6 branches**. Clean.
- Sibling `.session/` sweep across `/Users/slabgorb/Projects/a-*/` → **fired and
  returned two live sessions**: `a-1` on `jt9-5`, `a-2` on `sw8-27`. Neither is cp6-3
  and neither touches centipede. (Reading the probe's output rather than checking it
  ran — the mg1-2 glob-failure trap.)
- Local tree clean, on `main`, 5 commits behind → pulled to `be8419f` before starting.

### The description was measured, not read forward

Twelve falsifiable claims. **Every ROM claim verified line-exact** — `:2374`, `:2416`,
`:2437`, `:1813-1818` all land exactly where the filing says. That matches the standing
rule that vendored ROM source never rots. **Four claims about this repo are false**, and
the measurement budget went there, which is where it belongs.

| Claim | Verdict |
|---|---|
| Fixture's `voiceArbitration` record "put there by cp6-1 for exactly this" | **FALSE.** That record is POKEY **voice 1** (bonusLife/scorpionLoop/fleaLoop/march). A term scan of the whole fixture scores **0** for `2437`, `AUDF0`, `AUDC0`, `52$` and "voice 0". |
| `sound.md` §2.5 is the prose | **FALSE.** §2.5 is "POKEY voice 1 is contended four ways, and the march loses". The voice-0 prose is §2.2 plus the cue-table rows. |
| "the ROM reading is done" | **PARTLY.** Per-cue `pokeyVoice`/`lengthFrames`/`frameGate` are there and byte-verified. The arbitration RULE is recorded nowhere — which is now AC-7. |
| "expect to touch CHANNELS" / "retire the cp6-1 guard" | **FALSE for the fix that works.** Arbitration is cross-channel; CHANNELS need not move and the guard stays green. Now AC-2, stated as a prohibition. |
| "the loops keep running under a death" | **FALSE in both halves.** The march stops on the death frame (recorded pair, `audio-wiring.test.ts:94`); the creatures stop at the pause's end (`audio-events.test.ts:553`). Real defect is ≤48 frames of lateness. |

The last two are the dangerous ones: each would have sent a phase agent to build
something wrong while every gate stayed green.

### Executed rather than read

The story's subject is executable, so per the sw8-23 rule it was run, not reasoned about.
Three probes against the real `src/shared/audio.ts` with a fake AudioContext:

1. **Channel merge (the filed approach):** death starts, then a kill → `STOP playerDeath`,
   `START segmentKill`. The later kill **stops the ringing death**. Backwards.
2. **`priorities` + `frameDurations` + `tick()`:** the kill is **REFUSED** during the
   window; after 76 ticks the window expires and it plays; an unarbitrated loop on
   another channel is unaffected. Matches the cabinet.
3. **The same, with CHANNELS left exactly as it ships:** still refused — the arbitration
   is **cross-channel** (`src/shared/audio.ts:253-255`). This is what retires the
   "expect to touch CHANNELS" instruction, and with it the instruction to delete a guard.

That third probe is the one that mattered. The filing authorised a deletion, and nobody
reviews a deletion the story authorised.

### Blast radii, measured by applying each candidate and restoring

Baseline **1668/1668, 89 files**. Each mutation anchored with a `count == 1` assertion,
restored from a `cp` backup, verified with `cmp` + an empty `git status`.

- `priorities`/`frameDurations`/`tick()` with CHANNELS untouched → **14 red, one file**,
  all because the recording fake lacks a `tick`. `npm run lint` clean. joust already
  solved this exact fixture problem.
- Death-instant clear for the three creature loops → **2 red, two files**, both
  behavioural re-baselines that *should* move.
- Channel merge → **1 red**. Its near-zero radius is precisely the hazard: nothing in
  the tree can hear it go the wrong way.

### Two rulings went to the user; one question did not

The story's own "ONE THING TO SETTLE FIRST" (preemption vs never-together) was **not**
put to the user, because the measurement answered it: the ROM refuses the later cue, and
only one of the two candidate mechanisms expresses that. Asking would have offered a
choice that did not exist.

What did go up, each with the census attached:

- **R-1, the death-clear scope.** User chose **fold in** — my non-recommended branch.
  My stated cost for it ("~2 more points, widens into core/sim.ts's loop-edge model, the
  part with the most existing coverage") was **an unmeasured estimate and it was wrong**.
  Measured after the ruling: **2 tests**, both of which should move. Recorded in the
  context and here, because the losing branch of a question silently becomes the scope
  premise when the user picks it.
- **R-2, the three inventions.** User chose keying on the fixture's `pokeyVoice` field,
  so `mushroom`/`headBottom`/`waveClear` (all `null`) stay outside arbitration. The
  fixture's own schema supplied the house answer.

### Handed forward as questions, not as findings

- **The ~28-frame tail.** Our death pause is 48 frames and emits no one-shots at all;
  the ROM's window is 76. So most of the divergence may already be masked, leaving a
  ~28-frame tail. **I did not confirm a kill is reachable in that tail.** If it is not,
  the natural AC passes vacuously forever — hence the positive-control requirement in
  AC-8. Stated as not-knowing rather than asserted either way.
- **The attract branch.** `35$:` at `:1813` is a branch target from `BMI 35$ ;IF IN
  ATTRACT`, so an attract-mode death skips the explosion seed and runs only the clear.
  Whether our attract path has any referent for that is unchecked. TEA to identify
  before leaning on it.

### Sizing

Re-pointed 3 → 5. Filed against a shell-only channel edit that does not work; the real
build is arbitration wiring, a `tick()` call site centipede has never had, 14 fake
fixups, 2 re-baselines and the dossier record.

### Artifacts

- `sprint/epic-cp6.yaml` — description extended with a dated correction block (original
  preserved verbatim above it), 8 ACs added, points 3 → 5.
- `sprint/context/context-story-cp6-3.md` — hand-authored; ACs injected from
  `yaml.safe_load` so they are byte-identical by construction, verified by a `python3`
  `in` test rather than a grep. Carries a do-not-regenerate banner.

### Handoff to TEA (Han Solo)

Read the context first — the corrections table is the part that changes what you build.
Do not consume the fixture's `voiceArbitration` record; it is the wrong voice. Do not
edit `CHANNELS` and do not retire cp6-1's AC-5 guard. Settle the 28-frame-tail question
before writing the sweep, and carry a positive control with any "count is zero"
assertion.

Dev-port note for later phases: `lsof -nP -iTCP:5270 -sTCP:LISTEN -t` — ask for the
LISTENER, not `lsof -ti`, which returns a Chrome client and misattributes the owner.
## Tea Assessment

### RED delivered

`plugins/centipede/tests/voice0-contention.test.ts` — **23 tests, 17 red, 6 green**.
Suite **1674/1691** (every failure this file), `npm run lint` clean, orchestrator **390/0**.
Committed `e5b6357`.

Coverage: AC-1 (both directions, engine-level), AC-2 (arbitration without merging),
AC-3 (windows read from the dossier), AC-4 (the frame clock), AC-5 (the inventions ruling),
AC-6 (the death-instant clear), AC-7 (the dossier record). AC-8's mutation proofs are
GREEN's to record — the tests here are the population Dev must prove bite.

### I settled both questions SM handed forward, and one of the answers changed the design

**Q1 — the ~28-frame tail. SM was right to flag it, and the answer is worse than feared,
in a useful way.** Seeded free-runs (fire held, 30 000 frames, seven seeds):

| direction | reachable in play? | evidence |
|---|---|---|
| kill arrives DURING a ringing death | **NO** | the death pause emits **zero** one-shots (only `stepPlayingFrame` builds events); the next kill after a death landed at **+183, +286, +186, +322** frames across five seeds — never inside 76 |
| death arrives during a ringing kill | **YES** | **3 of 22** deaths had a kill cue < 19 frames earlier — gaps **5, 7, 16** |

So an AC written as "sweep real play, assert no kill sounds during a death" is **vacuous
by construction**. I did not write it. That direction is pinned at the **engine seam**,
where the window is controllable and a refusal is observable as "no source node was
created at all". The reachable direction — the death **interrupting** a ringing kill —
is the behavioural guard, and the 3/22 census is its positive control.

**This also sizes the defect honestly for the Reviewer:** what a player actually hears
today is a kill cue that keeps ringing under an explosion, not two cues starting together.

**Q2 — the attract branch is MOOT for us.** `createAttract(0x1234)` stepped 20 000 frames
emits **zero cues of any kind** (`inPlay` gates every loop edge on `phase === 'playing'`,
and attract never runs `stepPlayingFrame`). So the ROM's `BMI 35$ ;IF IN ATTRACT` at
`:1810` has no referent in our clone and nothing here should model it. Recorded as a
**non-blocking finding** below rather than built.

### Three of my own tests were green for the wrong reason — all three are fixed

I ran the greens before trusting them, and the audit was worth more than the writing:

1. **"the inventions are absent from PRIORITIES"** passed against an **undefined** map —
   `{}` has no property called anything. Now guarded by a `toBeDefined()` first.
2. **"releases voice 0 when the window expires"** passed because nothing refuses today,
   which is indistinguishable from *released*. Now asserts the refusal one frame earlier
   **in the same test**, so the release means something.
3. **"no creature voice left ringing"** counted loop edges from a **staged** spider.
   `loopEdges` takes its edge by comparing the state handed in against the state handed
   back, so a spider already audible on the way in yields `was === now` and emits **no**
   `spider-start` — the counter started at 0, stayed at 0, and the sweep proved nothing
   about a voice that was never heard. Now free-runs until the sim opens the voice, with
   that spawn as an explicitly named positive control.

The remaining 6 greens are preconditions (the dossier's voice-0 set; the 76/19 windows),
the positive control, and regression guards (the march already stops on the death frame;
cp5-1's bucket economy; cp6-1's voice-1 record intact). None is a deliverable.

### Corroboration for SM's corrections, from the tests themselves

The AC-6 red prints the death frame's actual stream as `['player-died', 'march-stop']` —
independent confirmation that **the march already stops on the death frame**, exactly as
SM's correction C-4 claimed against the filing's "the loops keep running under a death".
The creature loops are the half that is genuinely late.

### What Dev must not do

- **Do not merge the CHANNELS buckets.** `AC-2`'s test asserts `CHANNELS.playerDeath !==
  CHANNELS.segmentKill` *and* that the refusal still happens. Merging satisfies "they
  interact" while inverting the direction — a later kill would steal the explosion.
- **Do not retire `tests/audit/sound-dossier.test.ts`'s AC-5 guard.** It must still pass
  unmodified. The filing authorised deleting it; the measurement says it never needed to go.
- **Do not hand-edit `audio-wiring.test.ts`'s measured pair-composition list.** AC-6 will
  move it; re-measure it from a run.

### Delivery Findings

**F-1 (non-blocking, out of scope, needs an owner).** Our attract phase is **completely
silent** — 20 000 frames, zero cues. The cabinet's attract is not: `:1810`'s
`BMI 35$ ;IF IN ATTRACT` skips only the **CHAN5 seed**, which means the other channels do
sound during attract on the machine. That is a whole-subsystem divergence (the attract
demo's audio path), far outside cp6-3, and no cp6 story owns it. Recommend SM file it at
finish with this measurement attached.

**F-2 (non-blocking, for AC-7's implementation).** The dossier's citation sweep at
`tests/audit/sound-dossier.test.ts` walks **`voiceArbitration.cites` only**. A new
top-level voice-0 record's citations would therefore be **invisible to the citation
gate** — recorded but unverified, which is the failure mode that gate exists to prevent.
Dev must extend the sweep to the new record, not just add the record.

**F-3 (informational).** The fixture's shape is a structural TS interface with no
exhaustive top-level key assertion, so adding `voice0Arbitration` will not redden the
dossier guard on its own. That is why F-2 matters: nothing will complain.

### Handoff to Dev (Yoda)

The design is settled and measured; what remains is wiring. joust is the only precedent
and it is a close one — `plugins/joust/src/shell/audio.ts:151-167` for the maps,
`audio-dispatch.ts:98-110` for the tick placement and the reason it comes first, and
`tests/audio-dispatch.test.ts:60-72` for the fake that fixes the 14 mechanical failures
in centipede's own dispatch tests. Derive `PRIORITIES` from the dossier's `pokeyVoice`
field rather than typing the five names again — AC-1's test compares the two.
## Design Deviations

### Dev (implementation)

- **The arbitration RANKS are ours, not the ROM's — there is no priority byte to transcribe**
  - Spec source: context-story-cp6-3.md, "The precedent is exactly one game" (joust)
  - Spec text: "`plugins/joust/src/shell/audio.ts:151-167` — `PRIORITIES` / `FRAME_DURATIONS` wiring"
  - Implementation: joust's `PRIORITIES` transcribes a real ROM priority BYTE per cue
    (`SND` compares it at `SYSTEM.SRC:761-773`). Centipede has no such byte — the machine
    branches instead. So `PRIORITIES` here is a two-value encoding, `CHAN5` = 1 and `CHAN0`
    = 0, derived from the fixture's own `channel` field, which is exactly what
    `CENTI4.MAC:2437` tests.
  - Rationale: the shared engine takes numbers, and the only faithful numbers are "the
    explosion outranks the kills, strictly". Inventing a spread of ranks would read as
    transcribed data when it is not.
  - Severity: minor
  - Forward impact: none known. A later story modelling the TIMED-play alarm would touch
    voice 1, not this map.

- **`docs/rom-study/sound.fixture.json` now ships in the browser bundle**
  - Spec source: sprint/epic-cp6.yaml, AC-3
  - Spec text: "Both numbers are read from `docs/rom-study/sound.fixture.json` rather than
    written a second time as literals"
  - Implementation: implemented literally — `src/shell/audio.ts` imports the JSON and
    derives both maps from it. Vite inlines the whole ~23 kB file, all 16 prose `note`
    fields included, because its JSON plugin cannot tree-shake fields out of an object read
    by key.
  - Rationale: AC-3 and AC-5 both say *derived from the fixture*, twice, and the drift this
    closes is the story's point. Cost, rebuilt in round 2 at the base commit `63f32eb` and
    at HEAD rather than estimated from one tree: bundle **43.91 kB → 64.70 kB** (gzip
    **14.52 → 21.13 kB, +6.61 kB**), a 47.3% increase. Still the smallest game bundle in
    the cabinet — joust 139.95 kB, star-wars ~106 kB, tempest ~76 kB. (Round 1 recorded
    44.43 / 14.72 / +6.4 / 44% / joust 139.53 here and in the import comment; all six
    figures were wrong, and correcting only the comment would have left this entry
    contradicting it.)
  - Severity: minor
  - Forward impact: a `docs/` edit now changes the shipped bundle. If the size ever matters
    the fix is a build-time reduction of the fixture, not a second transcription — stated
    in the import comment so the next reader does not re-litigate it.

- **`windowFrames` is exported from the shell for no reason but observability** (round 2)
  - Spec source: sprint/epic-cp6.yaml, AC-8
  - Spec text: "EVERY NEW GUARD IS MUTATION-PROVEN, WITH THE MUTANT RECORDED VERBATIM"
  - Implementation: `const windowFrames` became `export const windowFrames` in
    `src/shell/audio.ts`. Nothing imports it but `tests/voice0-contention.test.ts`. The
    alternative offered by review was to leave it private and write in the comment that the
    null-length branch is unproven.
  - Rationale: the branch is live, not dead — `fleaLoop` already carries
    `lengthFrames: null` and lands there the day the dossier rules a loop onto voice 0 — and
    its four-line comment makes a confident behavioural claim. Round 1 proved nothing
    observed it (`? 0 :` → `? 999 :` left 1153/1153 green). Exporting is the only seam the
    module has short of mocking the JSON import, and it costs nothing: the built chunk is
    byte-identical (`main-C8-_6twG.js`, 64.70 kB) before and after.
  - Severity: minor
  - Forward impact: `src/shell/audio.ts` has one more public name. The reason is stated at
    the export so a later tidy-up does not remove it and silently re-open the branch.

- **cp6-1's §2.5 prose-vs-fixture guard was rewritten, not just extended** (round 2)
  - Spec source: sprint/epic-cp6.yaml, AC-2
  - Spec text: "CHANNELS IS NOT EDITED, AND cp6-1's AC-5 GUARD STAYS GREEN … must still pass
    unmodified at the end of this story"
  - Implementation: AC-2's guard — the CHANNELS `describe` — is untouched and **byte-identical
    between `63f32eb` and HEAD**; it moved from :467 to :482 only because `fixtureRaw()` was
    added above it. A *different* cp6-1 guard, `the prose names the same contenders the
    fixture does`, was moved out of the voice-1 `describe` and rebuilt as a table over both
    arbitration sections, with a pointer comment left where it was.
  - Rationale: that guard was keyed on `/voice\s*1/i`, so §2.6 shipped naming none of its
    five contenders and it saw nothing. Re-pointing it would have required a second copy;
    a table means a third arbitration record is enrolled by adding a row. The one-directional
    rule also had to be widened, since §2.6 legitimately names the three inventions in order
    to exclude them — the forbidden case is now "names a cue on a different numbered voice",
    which is exactly the defect §2.5 shipped.
  - Severity: minor
  - Forward impact: R2-M6 proves the voice-1 row still bites after the rewrite. A future
    arbitration record must be added to `ARBITRATION_SECTIONS` or its prose goes unchecked.

### Reviewer (audit)

- **The arbitration RANKS are ours, not the ROM's** → ✓ ACCEPTED by Reviewer: the ROM has no
  priority byte to transcribe, and deriving the two ranks from the fixture's `channel` field
  ties them to the CHAN5-vs-CHAN0 branch at `CENTI4.MAC:2437` that actually decides it.
  Inventing a spread of ranks would have read as transcribed data. The `strictly outranks`
  test and mutant M3 both bite, so the decision is enforced, not just documented.
- **`sound.fixture.json` ships in the browser bundle** → ✓ ACCEPTED by Reviewer: the DECISION
  is right and is what AC-3 and AC-5 both demand ("read from the fixture", "derived from the
  fixture's `pokeyVoice` field, not hand-listed"). Confirmed it costs nothing structurally —
  the bake still runs under plain node, `audio-manifest.ts` is untouched and import-free, and
  tsc validates the fixture at build time (mutation-proved). **Its stated EVIDENCE is not
  accepted**: four of the five figures in the rationale are wrong, and the deviation's own
  words "Measured cost, not estimated" make that a defect rather than a rounding slip. Filed
  as the [HIGH] row of the severity table. The deviation stands; its numbers must be redone.
- **UNDOCUMENTED — the story's quantitative record was taken before the rebase and not
  retaken.** Neither TEA nor Dev logged this. It is not a spec deviation but it is the root
  cause of the [HIGH]: the bundle before-figure, the joust comparison figure, the
  whole-cabinet attribution and the "1150-test project" count in the Dev Assessment were all
  true at `ba0cf65` and are all false at HEAD (`77ef628`), because the rebase pulled in the
  sibling checkout's jt9-5 commits. Severity: H.


#### Round 2 audit (the two deviations Dev logged this round)

- **`windowFrames` is exported from the shell for no reason but observability** → ✓ ACCEPTED by
  Reviewer, with a caveat that is filed as a finding rather than a rejection of the deviation.
  The reasoning is right: the branch is reachable in principle (`fleaLoop` carries
  `lengthFrames: null`, confirmed in the fixture), a live branch under a four-line confident
  comment must be observed, and exporting is the only seam short of mocking the JSON import.
  I confirmed the stated cost independently — with a matched `src/shared/audio.ts` the chunk
  is byte-identical before and after the export (`main-C8-_6twG.js`), so the export itself is
  free. **The caveat:** the seam it buys only observes half the branch — see the MEDIUM on the
  vacuous `cue(19, null)` assertion. The deviation is sound; its delivery is incomplete.
- **cp6-1's §2.5 prose-vs-fixture guard was rewritten, not just extended** → ✗ FLAGGED by
  Reviewer. The table is the right shape and AC-2's guard is genuinely untouched (byte-identical,
  verified independently). But the entry's claim that "the forbidden case is now 'names a cue on
  a different numbered voice', which is exactly the defect §2.5 shipped" is accurate about what
  is still caught and silent about what is not: §2.5 can now name any of the three inventions as
  a contender and stay green (novel mutant N1, 1157/1157). A deviation that trades coverage must
  say which coverage. Raised as a MEDIUM; the fix may be to keep the trade and disclose it.

### Reviewer (audit) — round 2 additions

- **UNDOCUMENTED:** nothing. I looked for a round-2 spec deviation Dev did not log and found
  none — the six fixes are all within the letter of the round-1 findings, and the two judgement
  calls that went beyond a literal fix (exporting `windowFrames`; rebuilding the guard as a
  table) are both logged above with rationale.


### Reviewer (audit) — round 3

- **`windowFrames` exported for observability** (Dev, round 2) → ✓ ACCEPTED, re-stamped. Round 2
  accepted this with a caveat that the seam observed only half the branch. Round 3 resolves the
  caveat correctly — not by widening the test but by establishing the other half is an equivalent
  mutant and labelling the assertion a contract pin. The export still costs nothing (chunk hash
  unchanged across the round).
- **cp6-1's §2.5 prose guard rewritten as a table** (Dev, round 2) → ✓ ACCEPTED, upgraded from
  round 2's ✗ FLAGGED. The flag was raised because the rewrite silently traded away §2.5's
  ability to catch a non-contender. Round 3 restored it with a per-row `mayNameInventions`, and
  both states are mutation-proved (R3-N1 reddens, R3-N1b reddens). The coverage loss is gone
  rather than merely disclosed, which is the better of the two fixes I offered.
- **UNDOCUMENTED:** none. Round 3's only judgement call beyond the literal findings — fixing
  three checklist range references that belong to sw8-27 rather than to cp6-3 — is disclosed in
  the Dev Assessment rather than done silently, which is the behaviour the deviation log exists
  to produce.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/centipede/src/shell/audio.ts` — reads cp6-1's fixture; derives `PRIORITIES` and
  `FRAME_DURATIONS` from `pokeyVoice` / `channel` / `lengthFrames` × `frameGate`; hands both
  to the shared engine. `CHANNELS` untouched.
- `plugins/centipede/src/shell/audio-dispatch.ts` — `SoundSurface` widened by `tick`;
  `audio.tick()` first and unconditional.
- `plugins/centipede/src/core/sim.ts` — `dying()` (`playerExplode > 0`); the spider, flea and
  scorpion audibility predicates now carry it, so their `-stop` edges land on the death frame.
- `plugins/centipede/docs/rom-study/sound.fixture.json` — the `voice0Arbitration` record.
- `plugins/centipede/docs/rom-study/sound.md` — §2.6, beside cp6-1's voice-1 §2.5.
- `plugins/centipede/docs/rom-study/claims/16-sound.json` — SND-109…SND-114 (six claims:
  `:2437`, `:2418`, `:2416`, `:2425`, `:1810`, `:2322`).
- `plugins/centipede/tests/audit/sound-dossier.test.ts` — F-2's fix: `fixtureCitations()`
  walks every arbitration record, plus a derived guard that the sweep VISITS each one.
- `plugins/centipede/tests/voice0-contention.test.ts` — three guards GREEN added (below).
- `plugins/centipede/tests/audio-dispatch.test.ts` — `tick` on the recording fake (the 14).
- `plugins/centipede/tests/audio-events.test.ts` — `trulyAudible` gains the clear.
- `plugins/centipede/tests/audio-wiring.test.ts` — the pair fingerprint, re-measured.

**Tests (round 2, re-measured after the fixes AND again after the rebase onto `5cc5bc2`):**
centipede **1157/1157**; centipede+shared **1711/1711**; orchestrator **390/390**;
`npm run lint` clean; `node scripts/build-app.mjs centipede` builds. Whole cabinet
**11 674 passed / 10 failed**, all `|star-wars|` — a sibling's sw8-27 RED, proved by
running the same 10 at `5cc5bc2` without this commit. (Round 1 recorded 1696/1696
centipede+shared; the four new tests are this round's.)

**Branch:** none
Trunk-based; committed straight to `main`.

### THE RED WAS SOUND AND STILL LEFT A THIRD OF AC-6 UNOBSERVED

The mutation battery is the deliverable AC-8 asks for, and it earned its keep: **three of
fourteen mutants survived the first pass**, all in the same place.

| # | Mutant (verbatim) | Reddens |
|---|---|---|
| M1 | delete `    priorities: PRIORITIES,` | 6, voice0-contention |
| M2 | delete `    frameDurations: FRAME_DURATIONS,` | 5, voice0-contention |
| M3 | `const EXPLOSION_RANK = 1` → `const EXPLOSION_RANK = 0` | 6, voice0-contention |
| M4 | `  (name) => CUES[name]?.pokeyVoice === 0,` → `  (name) => CUES[name]?.pokeyVoice === 0 \|\| CUES[name]?.pokeyVoice === null,` | 3, voice0-contention |
| M5 | `? 0 : cue.lengthFrames * cue.frameGate` → `? 0 : cue.lengthFrames` | 3, voice0-contention |
| M6 | `  audio.tick()\n  for (const event of events) {` → `  for (const event of events) {` | 2, voice0-contention |
| M7 | `  audio.tick()` → `  if (events.length > 0) audio.tick()` | 1, voice0-contention |
| M8 | `  inPlay(s) && !dying(s) && s.spider.pic !== SPIDER_OFF_PIC` → `  inPlay(s) && s.spider.pic !== SPIDER_OFF_PIC` | 4, across audio-events + audio-wiring + voice0-contention |
| M9 | `const dying = (s: SimState): boolean => s.playerExplode > 0` → `... => s.delay > 0` | **SURVIVED → 1** |
| M10 | `  inPlay(s) && !dying(s) && s.flea.v < FLEA_PARK_V && !isScorpion(s.flea.pic)` → drop `!dying(s) && ` | **SURVIVED → 1** |
| M11 | `  inPlay(s) && !dying(s) && isScorpion(s.flea.pic)` → drop `!dying(s) && ` | **SURVIVED → 1** |
| M12 | delete `    ['voice0Arbitration', fixture.voice0Arbitration],` from the sweep | **would have SURVIVED → 1**, sound-dossier |
| M13 | SND-109 verbatim `…;IF NO PLAYER EXPLOSION"` → `…;IF NO PLAYER EXPLOSIONS"` | 2, citations + sound-dossier |
| M14 | `"CENTI4.MAC:2437"` → `"CENTI4.MAC:2417"` in the fixture's cites | 2, sound-dossier + voice0-contention |
| M15 | delete `  if (s.playerExplode > 0) return live` from `trulyAudible` | 1, audio-events |

**M9/M10/M11 are the finding.** AC-6 names the spider, the flea AND the scorpion, and the
ROM clears `CHAN1` and `CHAN6` alongside `CHAN3`. The RED pinned the spider only, so
deleting the clear from `fleaAudible` — or from `scorpionAudible`, or keying the whole thing
on `delay` instead of `playerExplode` — left all 1150 centipede tests **green**. Two thirds
of the fix and its single most important discriminator were unobserved. Closed with three
guards in `voice0-contention.test.ts`, each paired with a no-death control:

- flea silenced by the death itself; a control frame with no death emits no `flea-stop`
- scorpion likewise
- **a WAVE clear does NOT silence them** — the M9 killer, and the one the story context
  predicted in words (`CENTI4.MAC:2319` sets `DELAY` and writes no channel)

M12 is TEA's F-2, and it would have survived too. Extending `fixtureCitations()` proves
nothing on its own — a citation the sweep never emits is one it never finds missing — so the
enrollment is now asserted directly, and DERIVED: every top-level fixture record carrying
`cites` must be visited, so the *third* record is enrolled or reddens.

### What I did NOT do, and why

- **`CHANNELS` is untouched and cp6-1's AC-5 guard passes unmodified** (AC-2). It is now at
  `tests/audit/sound-dossier.test.ts:467`; the block itself is byte-identical — the diff adds
  and removes nothing inside it, only above and below.
- **I did not hand-edit the pair fingerprint.** It was re-measured by instrumenting the test:
  all three of the seeded run's deaths (`pump 1468`, `2899`, `4306`) now emit
  `player-died+march-stop+spider-stop`, each followed by a bare `march-start` (`pump 1520`,
  `2951`) — which is why the old `march-start+spider-stop` pair vanished rather than moved.
  The measurement is written into the constant's comment.

### Whole-cabinet state, attributed — WRONG, and replaced in round 2

This section reported **11 644 passed, 10 failed in 2 files**, all `|joust|`, and called
them pre-existing on the strength of a detached worktree "at `HEAD`". That worktree
resolved to `ba0cf65` — the commit before the rebase pulled in the sibling checkout's
jt9-5 fixes — so the figures describe a tree that no longer exists. Preflight measured
`63f32eb` and got joust green; the Reviewer ran both and settled it. Same root cause as
the bundle figures: measured once, never re-taken after the rebase. Superseded by the
table under *Review round 2* below. Joust is green; nothing here touches joust or
`src/shared`.

### Review round 2 — the rejection was about CLAIMS, and every claim here was re-run

The Reviewer rejected seven findings, none of them runtime defects: the implementation
was confirmed correct and independently mutation-proven. What shipped wrong was the
prose — five false figures in a paragraph that instructs the reader they were measured.
Every number below was produced by a command in this session, not carried forward.

**The measured state of the tree, now — MEASURED TWICE, before and after a rebase.**
The push was rejected mid-handoff: a sibling checkout had landed eight commits, including
one that edits **`src/shared/audio.ts`** — the very engine this story's arbitration runs
on. Rebased onto `5cc5bc2` and re-measured everything rather than carrying the pre-rebase
figures forward, which is the mistake round 1 made.

| suite | before rebase (at `77ef628`) | after rebase (at `5cc5bc2`) |
|---|---|---|
| `npx vitest run --project centipede` | **1157 passed** (was 1153 in round 1) | **1157 passed** |
| `… --project centipede --project shared` | **1700 passed** | **1711 passed** (jt9-6 added 11 shared tests) |
| `npm run test:orchestrator` | **390 passed** | **390 passed** |
| `npm run lint` | clean | clean |
| `npx vitest run` (whole cabinet) | **11 658 passed**, 0 failed | **11 674 passed, 10 failed** — see below |

**The 10 are a sibling's RED, and I proved it rather than asserting it.** All 10 are
`|star-wars|`, in `tests/audit/sw8-27-remediation.test.ts` (8) and
`tests/core/gun-visibility-and-shape.test.ts` (2) — the sw8-27 round-2 RED landed by
`49108c5` and `191d757`. Proof: a detached worktree at `5cc5bc2`, **HEAD verified by
`rev-parse` before running** (round 1's worktree silently resolved to the wrong commit,
which is how its whole-cabinet claim went false), *without* my commit, fails the same 10
tests with the same names in the same 2 files. Three consecutive full-cabinet runs with my
commit give the identical 10. Nothing here touches star-wars.

**The jt9-6 engine change is benign for centipede, and that was already settled by the
story that made it.** `stopChannel` now calls `releaseVoice()` when it really stops the
arbitrated voice's channel — which matters here because centipede's `alert` and `impact`
each carry an arbitrated cue and an unarbitrated one. jt9-6's TEA measured that overlap
against `core/sim.ts:1042`'s 48-frame death freeze and the respawn re-lay and ruled it
**latent, not live**: the earliest `head-reached-bottom` after a `player-died` is F+169
against a 76-frame window. Their session records the ruling and explicitly files no
centipede story. Centipede is green under the new engine — 1157/1157 — so this is recorded
as an integration note, not a finding.

**[HIGH] the five bundle figures.** Rebuilt with `node scripts/build-app.mjs centipede`
in a detached worktree at the base commit `63f32eb` (node_modules symlinked) and again
here. Base **43.91 kB / 14.52 kB gzip**; HEAD **64.70 kB / 21.13 kB**. So the increase is
**47.35%**, written as 47.3%, and the gzip delta is **+6.61 kB**, not +6.4. Joust at HEAD
is **139.95 kB**. A **sixth** figure was wrong and the Reviewer did not catch it: the
comment said "the whole 19 kB file inlines", but the fixture is 23 291 bytes at HEAD and
was 19 426 at the base — this story's own record grew it, so the sentence described the
tree it was replacing. Same root cause, so it is fixed in the same pass. The two `~`
figures were checked and are right: star-wars sums to 106.19 kB over five chunks, tempest
to 75.86 kB over three. The comment now names the commits and the command, so the next
reader re-runs it instead of trusting it, and states that all 16 prose `note` fields
survive into the bundle — verified by searching the built chunk for each one, 16/16.

Rebuilt again after every edit in this round: the bundle is byte-identical
(`main-C8-_6twG.js`, 64.70 kB), so exporting `windowFrames` cost nothing and the quoted
figures still hold at the moment of handoff.

**[MEDIUM] SND-114's count.** Recounted. `grep -rn '^52[$]:'` finds five label
DEFINITIONS in revision.v4 — CENTI4.MAC:622, :1076, :2065, :2418 and CENIR4.MAC:388 — so
four besides SOUNDS' own, not five, and **20** across the whole vendored tree. The claim
now says four, names all four, gives the tree-wide count and records the grep.

**[MEDIUM] voice 0 had no independent ROM recount.** Added the voice-1 pair, pointed at
voice 0, in `tests/audit/sound-dossier.test.ts`. The recount is not a copy: voice 1 has
four writers and four contenders, one apiece, while voice 0 has **two** writers and
**five** contenders, because the four kill cues are four names over the one general
explosion at `19$`. That asymmetry is the thing a reader gets wrong, so the writer count
is pinned first and the contender set is then recovered from it.

**[MEDIUM] §2.6 named none of its contenders.** It now names all five in its opening
paragraph, and says why the count differs from the writer count. The cp6-1 guard was
keyed on `/voice\s*1/i` and blind to §2.6; it is now a **table** of arbitration sections,
one row per record, so a third record is enrolled by adding a row. The rule had to be
generalised, not just re-pointed: §2.6 deliberately names `mushroom`, `headBottom` and
`waveClear` to rule them OUT, and a guard that forbade naming a non-contender would have
deleted the paragraph recording the user's 2026-08-03 ruling. So the forbidden case is
narrowed to what §2.5 actually shipped — naming a cue that rides a **different numbered
voice** — which `pokeyVoice` decides without a hand-maintained exclusion list.

**[LOW] the `windowFrames` degrade.** Proved, not admitted. `windowFrames` is now
exported from `src/shell/audio.ts` for that single purpose, with the reason at the export
so nobody "cleans it up", and pinned directly. It is worth proving rather than disclaiming
because it is not dead: `fleaLoop` already carries `lengthFrames: null` and would land in
that branch the day the dossier ruled a loop onto voice 0. The Reviewer's exact surviving
mutant now reddens.

**[LOW] the double cast.** `loadFixture() as unknown as Record<string, unknown>` is gone.
Replaced by a second reader, `fixtureRaw()`, which parses the file as data — a single cast
from `JSON.parse`'s `any`, exactly as `loadFixture()` does. That is not just cast-golf:
the one test using it asks which top-level records carry `cites`, and its whole subject is
a record `SoundFixture` might not name, so viewing the file through that interface begged
the question.

**[LOW] the flea fixture.** Both `as SimState` casts dropped (lint clean without them),
and `pic: 0x0c` replaced with the imported `FLEA_PARK_PIC`. The Reviewer's diagnosis is
confirmed at the source: `fleaAudible` only asks `!isScorpion(pic)` (`core/sim.ts:430`),
so any low byte passed, and the sim's real band is `0x1c`–`0x1f` (`flea.ts:66`).

**AC-8 — the round-2 mutation battery.** Eight mutants, run one at a time against the
delivered code, files backed up and restored by `cp` because the deliverable is
uncommitted. **Zero survivors.** Every string below is the literal edit.

| # | Mutant (verbatim) | Reddens |
|---|---|---|
| R2-M1 | drop `      "fleaKill",` from `voice0Arbitration.contenders` | 3 — `voice0Arbitration.contenders is EXACTLY the set of cues on voice 0`, the voice-0 prose row, and cp6-3 AC-7's cue-map agreement |
| R2-M2 | `"voiceCite": "CENTI4.MAC:2445"` → `"voiceCite": "CENTI4.MAC:2433"` | 3 — incl. `…EXACTLY the set of cues on voice 0` |
| R2-M3 | `STA\\s+AUDF` → `STX\\s+AUDF` in `audfWriters` | 4 — both `exactly TWO writers of POKEY voice 0` and voice 1's pair |
| R2-M4 | §2.6 `` and `playerDeath` rides the second `` → `and playerDeath rides the second` | 1 — `POKEY voice 0: the prose names the same contenders voice0Arbitration does` |
| R2-M5 | §2.6 gains `` `spiderLoop` contends too. `` | 1 — same row, the wrong-voice direction |
| R2-M6 | §2.5: both `` `march` `` → `march` | 1 — `POKEY voice 1: …` (proves the pre-existing row still bites through the table rewrite) |
| R2-M7 | `? 0 : cue.lengthFrames * cue.frameGate` → `? 999 : …` | 1 — the Reviewer's own surviving mutant, now dead |
| R2-M8 | `cue.lengthFrames * cue.frameGate` → `cue.lengthFrames + cue.frameGate` | 4 |

Two probes reported GREEN on the first pass and **neither was a survivor** — both were
edits that failed to land, caught by grepping for the mutated string rather than trusting
the exit code. R2-M1 used a 4-space indent against a 6-space file. R2-M6 removed one of
**two** backticked `` `march` `` mentions in §2.5, so the guard was still correctly
satisfied. Re-run with the edit asserted in the mutating script (`assert old in s`), both
redden. Recorded because "a mutation that survives may just be a no-op" is a repo lesson
this round re-earned.

### Delivery Findings

- **Conflict** (non-blocking): TEA's F-1 rests on a reading of `CENTI4.MAC:1810` that the
  dossier's own claims contradict — the cabinet's attract is **silent too**, so our silent
  attract is not a divergence. `SOUNDS` opens by testing `MODE` (`CENTI4.MAC:2329`, claim
  SND-007), and in attract it loads 0 into all four `AUDC` registers (`:2331`, SND-008) and
  `RTS`es at `:2336` (SND-009, "attract mode is silent BY ROM DESIGN"). `:1810`'s
  `BMI 35$` skips the `CHAN5` *seed*; the routine that would sound it never runs in attract
  anyway. Affects the finding SM was asked to file at finish — recommend it be filed as
  *confirmation that our attract matches*, or not filed. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs:61`
  and `:167` both say "audio.ts imports @shared/audio at :25-28". That span was already stale
  before this story and is now `:28-31`. It is prose inside an error message, not an
  assertion, so nothing reddens. Affects `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs`
  (re-anchor or drop the line numbers). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the shared engine's window is a plain frame countdown, so a
  cue REFUSED because a higher one is ringing is dropped, not queued. That matches
  `CENTI4.MAC:2437` exactly (the block is skipped, nothing is remembered), so it is correct
  here — recorded only because a reader coming from joust's `SND` may expect a queue.
  Affects `src/shared/audio.ts` (no change wanted). *Found by Dev during implementation.*

### Dev (round 2)

- **Gap** (non-blocking): nothing in the suite pins the bundle figures the import comment
  quotes, so they can only rot again — this round found a **sixth** wrong one the review
  did not catch (the fixture is 23 291 bytes, the comment said 19 kB), because a figure
  correct when written became false when this story's own record grew the file. A cheap
  guard would build `dist/centipede` and assert the chunk is under a stated ceiling; it is
  out of scope here because it is a new build-time gate, not a correction. Affects
  `plugins/centipede/src/shell/audio.ts:40-54` and whatever suite would own such a check.
  *Found by Dev during round-2 rework.*
- **Question** (non-blocking): I confirm the Reviewer's third finding and did **not** act on
  it, per their scoping — `expectPopulated(fixtureCitations().length, 20, …)` at
  `tests/audit/sound-dossier.test.ts` now guards a population of 86, and the line predates
  this story. Raising it is a one-token edit, but it belongs to whoever owns that floor's
  rationale, not to a rework round that did not touch the line. Affects
  `plugins/centipede/tests/audit/sound-dossier.test.ts`. *Found by Dev during round-2 rework.*
- **Question** (non-blocking): **one full-cabinet run reported 11 failures where three
  identical runs before and after it reported 10**, and I did not capture the eleventh's
  name — that invocation grepped only the summary line. Three subsequent `npx vitest run`
  passes give exactly the same 10 star-wars failures, so I cannot reproduce it and will not
  claim it does not exist. Recorded because the repo has a known flake class of precisely
  this shape (a suite that writes into the tree another suite reads, sw8-23), and because an
  unnamed one-off is worth a line in someone's notes rather than a shrug. Affects nothing
  identified; whoever next sees an off-by-one full-cabinet count should capture `FAIL` lines,
  not just the summary. *Found by Dev during round-2 rework.*
- **Improvement** (non-blocking): the round-2 battery had **two** probes report GREEN whose
  edits had silently failed to apply (wrong indentation; a second backticked mention in the
  same section). Both would have been recorded as surviving mutants by a script that trusted
  its own `sed`. The fix was asserting the match inside the mutating script and grepping for
  the mutated string — worth adopting in any battery, since a failed edit and a real survivor
  are indistinguishable from the test count alone. Affects nothing in the tree; a practice
  note for `.claude` sidecars. *Found by Dev during round-2 rework.*

**Handoff:** To review.

## Review Correlation

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| 1 | reviewer | [HIGH] Five figures wrong in a paragraph asserting they were MEASURED (`audio.ts:41-47`) | EXISTING_CHECK + NEW_CHECK | #17 Comments asserting a mechanism nobody re-ran | Dev missed #17's "where the claim is cheap to run, RUN it". #17 does not reach the sub-class the correction exposed — a figure true when typed and false at commit close because the same diff moved its subject — so added as check **#20** |
| 2 | reviewer | [MEDIUM] SND-114 says `52$` recurs in five other routines; it is four | EXISTING_CHECK | #17 | Dev missed existing check — a countable claim, never counted |
| 3 | reviewer | [MEDIUM] No independent ROM recount of voice-0 contenders (`audfWriters` called with `1` only) | EXISTING_CHECK | #19 Population filtered by a neighbouring field | Dev missed existing check. #19's own origin is cp6-1 I-H4, the same fixture — "N of N mutations caught from a battery aimed at the fields you were thinking about is a statement about the battery's aim" |
| 4 | reviewer | [MEDIUM] §2.6 names none of its five contenders; the cp6-1 guard is keyed on `/voice\s*1/i` and cannot see it | EXISTING_CHECK | #19, second bullet | Dev missed existing check — "a sweep that enumerates one REGION of a structure when sibling regions carry the same kind of data. Walk the structure, not the region you had in mind while writing it" |
| 5 | reviewer | [LOW] `windowFrames`'s null-length degrade is unproven (`0`→`999` leaves 1153 green) under a confident four-line comment | EXISTING_CHECK | #17 | Dev missed existing check — the comment describes behaviour nothing ran |
| 6 | reviewer | [LOW] `as unknown as Record<string, unknown>` with no reason at the site | EXISTING_CHECK | #1 Type safety escapes | Dev missed existing check — #1 names the double-cast bypass explicitly |
| 7 | reviewer | [LOW] Two needless `as SimState` casts, and `pic: 0x0c` is a picture the sim cannot produce | EXISTING_CHECK | #1 (casts) + #18 (fails by PASSING) | Dev missed both — the fixture encodes a state the machine cannot enter and passes only because `fleaAudible` never reads the range |
| 8 | reviewer | Delivery finding: 7-of-9 reviewer subagents disabled in this repo | PROCESS | — | Not Dev's to change; the Reviewer already filed it and it is repeated in this session's findings for SM |
| 9 | reviewer | Delivery finding: `expectPopulated(…, 20, …)` guards a population of 86 | NOT_APPLICABLE | #15-adjacent | Explicitly scoped out by the Reviewer (line predates this story, untouched by this diff); re-filed as a Dev round-2 Question rather than changed |

### Signal Summary
- **External findings: 0** — no PR, no external reviewer, no bot. Trunk-based; nothing was pushed for outside review.
- **CI findings: 0** — no CI run for this work yet (the deploy workflow fires on a `<app>-vX.Y.Z` tag, not on a push to `main`), so there is no run to read. `npm run lint` and both suites were run locally instead.
- **Internal findings: 9** (7 severity-ranked review rows + 2 of the Reviewer's own delivery findings)
- **New checks added: 1** — `#20 A quantity measured from an artifact the SAME diff changes`, from an internal finding, so **no `[EXT]` prefix**. It earned its place by catching a sixth wrong figure the review itself had not found.
- **Existing checks missed: #17 ×3, #19 ×2, #1 ×2, #18 ×1.** #17 is the repeat offender and its own origin note already says "Replacing a false claim with a second confident one repeats the defect being fixed" — which is why every figure in this round was produced by a command in-session and the commands are named in the comment.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (contradicted Dev's joust attribution) | confirmed 1, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 6 violations over 19 checks + 5 project rules | confirmed 6, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 pre-filled as disabled per `pf settings get workflow.reviewer_subagents`)
**Total findings:** 7 confirmed, 0 dismissed, 0 deferred

Both returning subagents made claims I did **not** take at face value. The preflight's
headline conclusion ("the pre-existing-joust claim does NOT hold") was wrong in its
reasoning and right in its result, and the rule-checker's `52$` recount was right but
undercounted the scope. Every finding below was re-measured by me before being confirmed.
The preflight also mis-described four files as "new" that are modified, and named the
inlined file as `16-sound.json` at `audio.ts:55` when it is `sound.fixture.json`; those
inaccuracies are noted and not carried forward.

### Rule Compliance — the 19 TypeScript checks, enumerated

| # | Check | Verdict |
|---|---|---|
| 1 | Type safety escapes | **2 violations** — `as unknown as Record<string, unknown>` (sound-dossier.test.ts) with no reason at the cast site; two `as SimState` casts that tsc proves unnecessary (removed both, `npm run lint` clean) |
| 2 | Generic/interface pitfalls | Compliant — `Partial<Record<SoundName, number>>` mirrors the engine's own optional manifest fields (src/shared/audio.ts:82,87) |
| 3 | Enum anti-patterns | N/A — no enum touched |
| 4 | Null/undefined handling | Compliant — `windowFrames` uses an explicit `=== null` test, not a falsy check, so a legitimate `0` is not mistaken for absent |
| 5 | Module/declaration | Compliant — `.json` extension present, `resolveJsonModule` set (tsconfig.json:11), lint clean |
| 6 | React/JSX | N/A |
| 7 | Async/Promise | N/A — nothing added is async |
| 8 | Test quality | Compliant on the mechanical checks; see #15 for the one unproven branch |
| 9 | Build/config | N/A — no config file touched |
| 10 | Type-level input validation | Compliant, and stronger than the check asks: this is a static import, so tsc structurally validates the fixture at build time — **proved by mutation** (`"pokeyVoice": 0` → `"zero"` gives TS2322 at audio.ts:165) |
| 11 | Error handling | N/A — no try/catch/throw added |
| 12 | Performance/bundle | **1 violation** — the untree-shakable 19 kB import is a knowing trade, but the figures justifying it are wrong (see #17) |
| 13 | Fix-introduced regressions | N/A — initial GREEN, not a fix round |
| 14 | Derived EDGES in one branch | **Compliant, and the correct exemplar.** The `!dying(s)` gate went into the three predicates `LOOP_VOICES` already sweeps at `stepSim`'s single exit (sim.ts:995-1000), not into `stepDeathFrame`. This check's own origin is cp5-1's creature-loop leak; the fix rides the model that leak produced |
| 15 | Guards mutation-tested | **1 violation** — `windowFrames`'s null-length degrade: `0` → `999` leaves 1153/1153 green |
| 16 | Accessible names | N/A |
| 17 | Comments asserting an un-rerun mechanism | **5 violations** — four bundle figures and one ROM routine count, all measured wrong (below) |
| 18 | Defect in the test apparatus | Compliant — the contenders comparison is two independently-authored sides, not a fixture echoing itself |
| 19 | Population filtered by a neighbouring field | **1 violation (parity gap)** — `fixtureCitations()` is FIXED and mutation-proven, but `audfWriters()` is still only ever called with `voice=1` (sound-dossier.test.ts:1243,1254), so voice 0's contender set has no independent ROM recount |

Project rules: core purity holds (`dying()` reads only `SimState`; purity suite green);
`src/shared/` untouched; `audio-manifest.ts` untouched and still import-free (bake suite
green); no `scripts/` change.

## Reviewer Assessment — Round 1 (superseded by Round 2 below; kept verbatim)

**Verdict:** REJECTED

Only `preflight` and `rule_checker` are enabled in this repo. The domains tagged
`[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` below were assessed by
**me directly**, not by a subagent — I am not claiming coverage I did not have.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[DOC]` `[RULE]` | **Five quantitative claims are wrong, in a paragraph that tells the reader they were measured.** The comment reads "the cost is MEASURED, not waved at". Rebuilt at the base commit `63f32eb` and at HEAD: before is **43.91 kB / 14.52 kB gzip**, not 44.43 / 14.72; the increase is **47.3%**, not "44%"; joust at HEAD is **139.95 kB**, not 139.53. Only the after-figures (64.70 / 21.13) are right. Root cause: the before-figure was taken by stubbing the import out of the *post*-change tree instead of building the base commit, and the joust figure was taken at `ba0cf65` before the rebase moved the world. | `plugins/centipede/src/shell/audio.ts:41-47` | Rebuild at `63f32eb` and at HEAD; quote those numbers. Keep the `~` convention: figures given bare must be exact |
| [MEDIUM] `[RULE]` | **A false claim inside the gated citation ledger.** SND-114 says the `52$` spelling "recurs in **five** other routines". In revision.v4 it is **four** (CENTI4.MAC:622, 1076, 2065 plus CENIR4.MAC:388, excluding SOUNDS' own at 2418); across the whole vendored tree it is far more than five. The `verbatim` and line are byte-correct, so the byte gate cannot see this — which is exactly the defect class AC-7's ledger exists to prevent | `plugins/centipede/docs/rom-study/claims/16-sound.json` (SND-114) | Correct the count, or drop the parenthetical — the claim stands without it |
| [MEDIUM] `[TEST]` `[RULE]` | **Voice 0 has no independent ROM recount of its contender set, where voice 1 does.** `audfWriters(lines, voice)` exists and is called with `1` at :1243 and :1254 only. Voice 0's five contenders are checked against the fixture's own `pokeyVoice` field and nothing else — fixture-internal agreement, not ROM recovery. (Mitigated, not closed, by the pre-existing `pokeyVoice EQUALS the voice the cited write targets` test at :1219, which does reach voice-0 cues.) | `plugins/centipede/tests/audit/sound-dossier.test.ts:1183,1243,1254` | Call `audfWriters(centi4(), 0)` and require `voice0Arbitration.contenders` to equal the recovered set, as :1243 does for voice 1 |
| [MEDIUM] `[DOC]` `[TEST]` | **§2.6 names none of its five contenders, and nothing checks that it does.** Measured: the voice-0 section backticks `mushroom`, `headBottom`, `waveClear` — the three NON-contenders — and **zero** of `playerDeath`, `segmentKill`, `spiderKill`, `fleaKill`, `scorpionKill`. cp6-1 built a two-directional prose-vs-fixture contender guard for §2.5 precisely because §2.5 shipped naming `spiderLoop` as a contender when it is on voice 3; that guard keys on `/voice\s*1/i` and cannot see §2.6 | `plugins/centipede/docs/rom-study/sound.md` §2.6; guard at `tests/audit/sound-dossier.test.ts:1313` | Name the five contenders in §2.6, and generalise the guard to both sections (it must tolerate a section that deliberately names non-contenders to exclude them) |
| [LOW] `[TEST]` `[RULE]` | AC-8 says every new guard is mutation-proven; `windowFrames`'s null-length degrade is not. `0` → `999` leaves **1153/1153** green. The branch is unreachable with the current fixture, yet carries a confident four-line comment describing its behaviour | `plugins/centipede/src/shell/audio.ts:190-191` | Either prove it (inject a null-length voice-0 cue through a seam) or say plainly in the comment that it is unreachable today and unproven |
| [LOW] `[TYPE]` `[RULE]` | `as unknown as Record<string, unknown>` — checklist #1's named double-cast bypass. The reason is legitimate (an `interface` has no implicit index signature, so a single cast is not comparable) but is nowhere at the cast site | `plugins/centipede/tests/audit/sound-dossier.test.ts:1051` | State the reason on the line, or restructure to avoid the double cast |
| [LOW] `[TEST]` `[SIMPLE]` | Two `as SimState` casts are unnecessary — **verified**: removed both, `npm run lint` clean. And `pic: 0x0c` is not a picture the sim can produce: real flea pictures are `FLEA_PARK_PIC \| 0..3` = `0x1c`–`0x1f` (flea.ts:66,275). It passes only because `fleaAudible` never checks the range. The sibling `withScorpion` does it right, with the imported `SCORP_PIC_LOW` | `plugins/centipede/tests/voice0-contention.test.ts:524-530` | Drop the two casts; use `FLEA_PARK_PIC` |

### The implementation itself is correct — that is not what this rejects

Every acceptance criterion's *behaviour* is met and independently mutation-proven. I
re-ran the battery's key rows myself rather than trusting the session's table.

- `[VERIFIED]` **AC-2 holds exactly.** cp6-1's AC-5 guard block is **byte-identical** — extracted the `describe` from `63f32eb` and from HEAD and compared: 1663 chars, equal. `CHANNELS` is untouched.
- `[VERIFIED]` **The fixture is type-checked at build time**, so a malformed dossier fails `npm run lint` — the only type check in the release path — rather than producing wrong audio silently. Proved by mutation: `"pokeyVoice": 0` → `"zero"` gives `TS2322` at audio.ts:165. This is stronger than the runtime validation checklist #10 asks for.
- `[VERIFIED]` `[EDGE]` **The arbitration cannot silence a loop.** `voiceChannel` is set only when an arbitrated cue starts, and the only arbitrated cues live on `alert` and `impact`; the cross-channel steal at src/shared/audio.ts:253-255 can therefore only ever stop those two buckets. Every sustained voice is on a `voice-*` bucket. No march, spider, flea or scorpion loop can be cut by this change.
- `[VERIFIED]` `[EDGE]` **No spurious `-start` at respawn.** `createSpider` always returns `pic: SPIDER_OFF_PIC` (spider.ts:212), so closing the voice at the death frame cannot make the respawn re-open it.
- `[VERIFIED]` **Every caller survives the widened `SoundSurface`.** main.ts:203 passes the real engine; audio-gesture-gate.test.ts uses `createAudio()`; wiring and hot-path wrap the real module. Nothing hands `playEventSounds` a `tick`-less object.
- `[MEASURED]` `[EDGE]` **I bounded what a player actually hears.** Seven seeds × 30 000 frames, fire held: 21 deaths, and the *only* cue landing inside any 76-frame post-death window across all of them is `shot-fired` — its own bucket, unarbitrated. So the arbitration's forward direction (explosion refuses kills) is unreachable in ordinary play, independently corroborating TEA's reachability work, and the audible change is confined to a death interrupting a ringing kill plus the loops closing ~48 frames earlier. That also retires my own devil's-advocate worry that an `alert`-bucket invention could cut the explosion short: `headBottom`/`waveClear` never land in the window.
- `[VERIFIED]` `[SEC]` **No security surface.** Data flow: input → pure core → `GameEvent` (closed union) → dispatch → engine → WebAudio. Nothing user-controlled reaches a sink; the only new dependency is a repo-local JSON resolved at build time. No runtime parse of untrusted data, no secrets, no network beyond the fixed R2 base URL.
- `[VERIFIED]` `[SILENT]` **The `windowFrames` zero-degrade is not a silent failure in effect.** Traced: `voiceFrames === 0` fails `tick()`'s guard so the voice is never released, but it equally fails the refusal test at :232, so nothing is ever wrongly refused and the next arbitrated cue reclaims the voice. The behaviour matches the comment. Its *only* problem is that it is unproven (LOW, above).
- `[VERIFIED]` `[RULE]` **Checklist #14 compliance is exemplary**, and worth naming because this check's origin is cp5-1's creature-loop leak in this very file: the gate went into the predicates that `LOOP_VOICES` sweeps centrally, not into a branch.

### The whole-cabinet claim in the Dev Assessment is now false, and I settled why

Dev's `### Whole-cabinet state, attributed` says 10 joust tests fail and calls them
pre-existing, "proved… a detached worktree at HEAD (`ba0cf65`)". Preflight reported the
opposite. Neither was lying; they measured different commits, and I ran both:

| commit | joust |
|---|---|
| `ba0cf65` (what Dev's worktree actually resolved to) | **10 failed** / 2523 passed |
| `63f32eb` (what preflight used) | 2533 passed |

The sibling checkout's jt9-5 commits fixed joust, and Dev's rebase pulled them in. **HEAD
is green: 11 654 / 11 654 across the cabinet**, confirmed twice, plus four consecutive
clean `--project joust` runs. The session's section is stale and reads as though the
cabinet still ships 10 red tests — same root cause as the HIGH above: numbers taken at
`ba0cf65` and never re-taken after the rebase. It should be corrected in the same pass.

### Devil's Advocate

Argue this is broken. The strongest case is that the story shipped a **47% bundle
regression on the strength of numbers nobody re-ran** — and the paragraph justifying it
says "MEASURED, not waved at", which is an instruction to the next reader not to check.
That is worse than an admitted guess: a guess invites verification, a false claim of rigor
forbids it. The repo has a numbered check for exactly this (#17), whose origin note says
"Replacing a false claim with a second confident one repeats the defect being fixed", and
the story's own SM assessment opens by cataloguing four false claims in the filing. The
story that exists to stop confident-but-wrong claims shipped five of them.

Second: the arbitration may be **ceremony**. I measured that the forward direction is
unreachable — 21 deaths, zero kill cues in any window. So a 47% bundle increase, a new
per-frame call, a fixture record and 66 lines of dossier buy one audible change (a death
cutting off a kill, 3 deaths in 22) plus a 48-frame timing correction. A hostile reader
would say the CHANNELS-merge Dev rejected produces that same audible change more cheaply.
The answer is that it produces it *backwards* for the unreachable direction and would be
wrong the moment play reaches it — but that answer is an argument about faithfulness, not
about what anyone hears today, and the story should own that rather than imply otherwise.

Third: what would a confused maintainer do? They would read `pic: 0x0c` and believe
that is a flea picture. It is not — the sim only ever produces `0x1c`–`0x1f`. The test
passes because the predicate under test never looks at the range, so the fixture encodes
a state the machine cannot enter, and the next person to widen `fleaAudible` to check the
picture band will find a test that was green for a reason that no longer exists. That is
checklist #18's failure-by-passing, in miniature.

Fourth: a stressed reader. `voice0Arbitration` is now guarded by *this story's own* test
file and by a citation sweep — but the exhaustiveness of its contender set rests on the
fixture agreeing with itself. Voice 1 gets a ROM recount. If the fixture were ever wrong
about which cues write `AUDF0`, nothing here would notice, and that is the precise shape
of cp6-1's I-H4.

None of this is a runtime defect. All of it is the deliverable — claims — being wrong.

### Delivery Findings

- **Conflict** (non-blocking): Dev's F-1 conflict entry is **correct and I confirm it** — TEA's F-1 (our silent attract is a divergence) is contradicted by claims SND-007/008/009: `SOUNDS` tests `MODE` at `:2329`, zeroes all four `AUDC` at `:2331` and `RTS`es at `:2336`, so the cabinet's attract is silent too. SM should not file TEA's F-1 as a divergence. Affects the finish-phase filing decision. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the reviewer subagent roster is 7-of-9 disabled in this repo (`pf settings get workflow.reviewer_subagents`), so `edge_hunter`, `silent_failure_hunter`, `test_analyzer`, `comment_analyzer`, `type_design`, `security` and `simplifier` never run. Every finding in this review beyond the mechanical came from the rule-checker or from me. Affects `.pennyfarthing` settings (someone should decide whether that roster is intentional). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `expectPopulated(fixtureCitations().length, 20, …)` now guards a population of 86. The floor was already loose before this story and this diff did not touch the line, so it is out of scope here — but checklist #15 names exactly this ("bounds far looser than the measured value"). Affects `plugins/centipede/tests/audit/sound-dossier.test.ts:1025`. *Found by Reviewer during code review.*

**Handoff:** Back to Dev for fixes.
## Subagent Results — Round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 2 (1 useful, 1 wrong) | confirmed 1, dismissed 1, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (1 confirmed, 1 wrong) | confirmed 2, dismissed 1, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 + 3 informational | confirmed 3, dismissed 1, deferred 2 |

**All received:** Yes (4 enabled returned, 5 disabled)
**Total findings:** 6 confirmed, 3 dismissed (with rationale), 2 deferred

**The roster is NOT what round 1 recorded.** Round 1 wrote "only `preflight` and `rule_checker`
are enabled" and filed a Delivery Finding saying 7 of 9 are off. `pf settings get
workflow.reviewer_subagents`, run now, returns `comment_analyzer: true` and `security: true` as
well — four enabled, five disabled. No file in the repo declares the setting (`grep -rn
reviewer_subagents` over the tree finds nothing), so I cannot tell whether it changed between
rounds or round 1 misread it, and I am not asserting either. I record what I measured. The
`comment_analyzer` being live is not incidental: it is the specialist that caught the blocker.

**Where subagents were wrong, and I checked rather than relayed:**

- **preflight** reported "+4 claims added (SND-109…SND-112)". Six were added — SND-109 through
  **SND-114** (108 → 114 claims, `git show 63f32eb:…16-sound.json`). Dismissed.
- **rule_checker** and **comment_analyzer** both attributed the bundle drift to
  "environment/tooling-version drift", rule_checker reasoning that joust also drifted "even
  though this diff touches nothing in joust". That inference is wrong, and the correction is the
  whole point of the finding: **joust imports `@shared/audio` too**. See F-1.
- **comment_analyzer** reported the checklist's "`#14-#20` cross-references are consistent".
  They are not — `sed -n '324p'` still reads `#14-#19`. rule_checker caught it; I confirmed it
  by hand. Dismissed comment_analyzer's clean verdict on that line.

## Reviewer Assessment — Round 2 (superseded by Round 3 below; kept verbatim)

**Verdict:** REJECTED

Round 1 rejected this story because a paragraph asserting it had been measured contained five
wrong figures. Six of the seven findings are properly fixed, and I re-derived each rather than
trusting the table. The seventh — the figures — **is wrong again**, by the same mechanism, in
the commit that added a checklist entry to prevent it.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[DOC]` `[RULE]` | **The bundle figures are stale again, and the session claims they were re-verified when they were not.** The rebase onto `5cc5bc2` pulled in jt9-6's 13-line addition to `src/shared/audio.ts` — which centipede bundles. Measured at the committed HEAD in a worktree whose `rev-parse` I checked against the repo: **64.71 kB / 21.14 kB gzip**, not 64.70 / 21.13; the delta is **+6.62 kB**, not +6.61; the increase is **47.37%** → 47.4%, not 47.3%; **joust is 139.97 kB**, not 139.95. Not a rounding argument: reverting *only* `src/shared/audio.ts` to its `63f32eb` state regenerates the Dev's exact chunk **hash** `main-C8-_6twG.js` at 64.70/21.13, while the real HEAD builds `main-beT9ldva.js`. So the session's "Rebuilt again after every edit in this round: the bundle is byte-identical … the quoted figures still hold at the moment of handoff" is false — the build was the one thing not re-run after the rebase. Both specialists blamed "tooling drift"; that is refuted by the hash experiment and by joust importing `@shared/audio`. Mirrored in **6 places** (`audio.ts:46,47,50`; session `:308-310`, `:331`, `:512-514`, `:524`) | `plugins/centipede/src/shell/audio.ts:41-54` | Re-take every bare figure at the final commit, **after** any rebase, and sweep all six mirrors. Also state that the `63f32eb` base predates jt9-6, so `43.91 → 64.71` now spans two changes (the fixture import alone is 43.91 → 64.70 with a matched engine — measured). **Strongly consider switching these to `~` figures**: this comment quantifies a bundle that depends on `src/shared/`, which every game imports and any sibling story may touch, so bare exact figures are a standing trap that will re-break on the next shared-engine commit |
| [MEDIUM] `[TEST]` `[RULE]` | **The new `windowFrames` guard is half vacuous — the frameGate branch is still unobserved.** Novel mutant N7: delete `\|\| cue.frameGate === null` and the suite stays **1157/1157 green**, edit confirmed landed. Cause: the fourth assertion is `expect(shellWindowFrames(cue(19, null))).toBe(0)`, and in JS `19 * null === 0`, so it passes identically with the guard removed. The round-1 LOW asked for the degrade to be proven; the `lengthFrames` half is (R2-M7 kills it), the `frameGate` half is not — and it now carries a comment saying it is. Checklist #18, "the defect is in the test apparatus, and it fails by PASSING" | `plugins/centipede/tests/voice0-contention.test.ts:302`; guard at `plugins/centipede/src/shell/audio.ts:203` | Make the case discriminate — assert a value the coercion cannot produce (e.g. `cue(19, null)` must equal `0` *and* `cue(0, 4)` / a non-zero-yielding pairing behave as stated), or drop the clause if it is genuinely unreachable and say so. Re-run N7 and require red |
| [MEDIUM] `[TEST]` | **Generalising the prose guard silently weakened §2.5, and the deviation entry does not disclose it.** Novel mutant N1: add `` `mushroom` `` to §2.5 as though it contended — **1157/1157 green**. cp6-1's rule was "every named cue must be a contender"; the new `wrongVoice` filter exempts any cue with `pokeyVoice === null` in **every** section, so all three inventions may now be named as contenders anywhere. The Dev's deviation entry says the forbidden case is "exactly the defect §2.5 shipped" — true, but it omits the coverage §2.5 lost. R2-M6 proves only the *unnamed-contender* direction still bites for voice 1 | `plugins/centipede/tests/audit/sound-dossier.test.ts:1436`; deviation at `.session/cp6-3-session.md` | Either scope the exemption to the section that needs it (a per-row field in `ARBITRATION_SECTIONS`, derived not hand-listed), or keep it and **say in the deviation entry what §2.5 no longer catches**. A guard rewrite that loses coverage is a deviation; an undisclosed one is the finding |
| [MEDIUM] `[DOC]` `[RULE]` | **Check #20's origin note misstates the incident it cites — and so does its twin in the dev sidecar.** Both say the "19 kB" figure was "true when it was typed and false by the time the commit closed". It was never true of the tree it shipped in: `77ef628` grew the fixture to **23 291 bytes and wrote the "19 kB" wording in the same commit** (`git show --stat 77ef628 -- …sound.fixture.json`; the base was 19 426). So it described the *parent* tree and was already false at the instant it shipped. This matters because #20 is now institutional memory for every future TypeScript review, and its founding story is the one thing in it nobody re-ran — checklist #17, inside the check written to stop #17 | `.pennyfarthing/gates/lang-review/typescript.md:270-276`; `.pennyfarthing/sidecars/dev/gotchas.md` | Re-tell it accurately: the figure was measured against the parent tree and never against the one it shipped in. The check's genuinely-validated bullet is the third one — "a number taken at a ref that later moved" — which is precisely what F-1 above demonstrates today; anchor the origin on that |
| [LOW] `[RULE]` | **cp6-3 left one of the checklist's four range references stale**, and I am scoping this carefully because the file moved under me mid-review. When this story raised the checklist to 20 checks it updated three references and missed the fourth: `#14-#19` in the `<pass>` block's `fix-regressions` detail. That one is cp6-3's. Since then sw8-27's `d61438e` appended checks **#21-#24** and updated **no** reference at all, so three more (`#14-#20` ×2 and `(20 checks)`) are now stale too — **those are not this story's**, and cp6-3 should not be asked to fix them. Line numbers re-taken after the rebase | `.pennyfarthing/gates/lang-review/typescript.md:420` (was :324 before the rebase) | Bump `#14-#19` → the current top check. Whoever owns sw8-27 should sweep the other three; better still, stop quoting the range in four places |
| [LOW] `[TYPE]` `[RULE]` | `section as string` is a bare, unjustified cast. `dossierSection()` returns `string \| null`; vitest's `.not.toBeNull()` is a runtime assertion tsc does not read as a type guard, so the compiler still sees a nullable at the cast site. Safe at runtime — but this is checklist #1, three lines from `fixtureRaw()`, whose whole purpose this round was replacing an unexplained cast with a justified one | `plugins/centipede/tests/audit/sound-dossier.test.ts:1426` | Narrow with `if (section === null) throw …`, or state the reason on the line as `fixtureRaw()` does |

### Six of seven round-1 findings are properly fixed — I re-derived every one

- `[VERIFIED]` **AC-2 holds, and I checked it independently of the Dev's claim.** Extracting the cp6-1 AC-5 `describe` by brace-matching from `63f32eb` and from HEAD gives byte-identical text (1660 chars both). The `CHANNELS` object literal is byte-identical too (`diff` of the `sed`-extracted block returns nothing). It moved :467 → :482 only because `fixtureRaw()` was inserted above.
- `[VERIFIED]` **SND-114 is right now.** `grep -rn '^52[$]:' reference/atari-source/centipede` → 20 tree-wide; in revision.v4, `CENTI4.MAC:622`, `:1076`, `:2065` and `CENIR4.MAC:388` besides SOUNDS' own `:2418`. Four, as the claim now says, with all four locations named. Both specialists reproduced this.
- `[VERIFIED]` `[TEST]` **The voice-0 ROM recount is real, and it closes the loop rather than adding a second opinion.** The chain is now `shell(pokeyVoice === 0)` ↔ `voice0Arbitration.contenders` ↔ `ROM(STA AUDF0 writers)`; before this round the last link did not exist. Novel mutant N6 (loop bound `2451` → `2440`, dropping the explosion's `:2445`) reddens both new tests — so the recount reads the ROM, not the fixture's opinion of it.
- `[VERIFIED]` `[TEST]` **The two-writers-five-contenders asymmetry is pinned before the set is**, which is the right order: a reader who assumes writers and contenders correspond mis-derives the set, and `audfWriters(centi4(), 0)` → `[2423, 2445]` is asserted first.
- `[VERIFIED]` **§2.6 now names all five contenders**, set-equal to `voice0Arbitration.contenders` — confirmed by parsing the section and the fixture independently. The three inventions are still named, deliberately, and that paragraph is worth keeping (see the MEDIUM above for what it cost).
- `[VERIFIED]` **The double cast is gone and its replacement is better than cast-golf.** `fixtureRaw()` reads the file as data; the test's subject is a record `SoundFixture` might not name, so viewing it through that interface begged the question. Novel mutant N4 (`fixtureRaw()` returns `{}`) reddens the record-visit sweep, so it is load-bearing.
- `[VERIFIED]` **The flea fixture is fixed at the source, not papered over.** `FLEA_PARK_PIC` (`flea.ts:66`) replaces `0x0c`; both `as SimState` casts are gone and `npm run lint` is clean without them. `fleaAudible` (`sim.ts:430-431`) only asks `!isScorpion(pic)`, which is exactly why the old byte passed.
- `[VERIFIED]` `[SEC]` **No security surface.** Independently assessed and clean. `fixtureRaw()` mechanically matches check #10's `JSON.parse(...) as T` text, and I am dismissing that on the rule's own scope: #10's heading is *"Security: type-level input validation"* and its bullets name user input and API responses. This is a git-committed, hand-authored fixture on a fixed repo-relative path, read inside a test, and the caller narrows with `Array.isArray(...)` before use. Two specialists reached the same conclusion separately.
- `[VERIFIED]` `[TEST]` **The alias is the right call, not clutter.** `windowFrames as shellWindowFrames` avoids colliding with the test file's own `windowFrames(name)`, which throws where the shell's degrades — checklist #18's "one concept, two helpers" handled correctly.
- `[MEASURED]` **My own novel battery: 9 mutants, edits asserted, 3 survivors.** N2 (section end-detection `#{2,4}` → `#{2}`, so §2.5 swallows §2.6), N3 (voice-1 row pointed at `voice0Arbitration`), N4, N5 (dropping the invention exemption), N6, N8 (`winner` flipped to `segmentKill`) all redden — so the table, the accessors, the section splitter and `winner` are all genuinely pinned. The survivors are N1 and N7 (the two MEDIUMs above) and **N9**: changing SND-114's corrected count from four to seven leaves 1157/1157 green. N9 is not a new defect — it is round 1's own observation that the byte gate sees `verbatim` and line only — but it is worth stating plainly that **the fix corrected the instance without closing the class**, so the next wrong number in a claim's prose will ship exactly as this one did.
- `[VERIFIED]` **The cabinet is now fully green, and the 10 failures were never this story's.**
  When I began, `npx vitest run` gave 11 674 passed / 10 failed, all `|star-wars|` in
  `sw8-27-remediation.test.ts` (8) and `gun-visibility-and-shape.test.ts` (2), added by
  `49108c5`/`191d757`. The Dev proved the attribution with a `rev-parse`-verified worktree at
  `5cc5bc2`, preflight reproduced it, and three consecutive full runs gave the identical 10.
  **Re-measured after sw8-27's own GREEN landed mid-review (`6153c8d`): 11 684 passed, 0 failed,
  1 todo, 757 files.** centipede 1157/1157, orchestrator 390/390, lint clean. I re-took this
  rather than leave the earlier figure standing — which is the discipline this review is about.

### Deferred, not dismissed

- `expectPopulated(contenders.size, 4, …)` is exact for voice 1 and loose by one for voice 0 (true count 5). The compound assertions still catch a dropped contender (R2-M1 reddens that test), so the guard is not defeated — but the floor is looser than the measured value for one of the two populations it serves. Checklist #15, LOW, and cheap to make per-row.
- `ARBITRATION_SECTIONS` has no in-file assertion on its own length, so shrinking it would silently register fewer tests rather than fail. Mitigated in practice by this repo's habit of pinning whole-suite counts, which is how R2-M6 was even legible.

### Devil's Advocate

Argue I am wrong to reject. The strongest case: the numbers are off by **ten bytes**. Nobody's
experience of the arcade changes; no test is weaker for it; the qualitative claim the paragraph
exists to make — the bundle grows by roughly half and is still the cabinet's smallest — is
independently confirmed true. Rejecting a 5-point story over 0.01 kB, twice, looks like a
reviewer who has found a rule and is enjoying it, and the repo's own proportionality note warns
that a prose cluster is a follow-up rather than a block.

I have weighed that and I still reject, for a reason that is not about the ten bytes. The
defect is not the figure, it is the **sentence next to it**: the session states the bundle was
rebuilt and "the quoted figures still hold at the moment of handoff." That is a claim of
verification that was not performed on the tree being handed off, and it is the fourth time in
this story that a confident assertion has outrun its measurement. A wrong number invites the
next reader to check; a wrong number under a claim of having checked instructs them not to.
Round 1's own Devil's Advocate wrote that, and the story then reproduced it.

The second case against me: maybe the requirement is unreasonable. I think that is half right,
and it is why the fix I ask for is not merely "re-take the number". A comment quoting exact
sizes for a bundle assembled from `src/shared/` — a directory every game imports and any
sibling story may touch — is a claim that a *third party's commit* cannot falsify, and that is
not true. jt9-6 falsified it in a few hours without touching centipede. Demanding bare exactness
here manufactures a trap the `~` convention already exists to defuse, and the honest fix may be
to stop making the exact claim rather than to keep re-taking it.

What would a confused maintainer do? Read `expect(shellWindowFrames(cue(19, null))).toBe(0)`,
believe the missing-gate branch is covered, delete `|| cue.frameGate === null` during a tidy-up,
and ship green. JS hands them `19 * null === 0` and the suite agrees. That is the same
failure-by-passing shape as round 1's `pic: 0x0c`, in the very test written to close round 1's
finding — which is the pattern worth naming out loud: **each round's fix has carried the next
round's defect of the same class.** `0x0c` passed because the predicate never read the range;
`cue(19, null)` passes because multiplication never sees the null. Both are honest assertions
measuring nothing.

Third: what does a stressed reader lose by my rejecting? Very little. Every fix here is
mechanical, the implementation is untouched and correct, and I am not asking for a redesign.

### Rule Compliance — the 20 TypeScript checks, applied to the round-2 diff

| # | Check | Verdict |
|---|---|---|
| 1 | Type safety escapes | **1 violation** — `section as string` (LOW, above). `fixtureRaw()`'s single cast is compliant and is the round-1 fix; `windowFrames` has no cast |
| 2 | Generic/interface pitfalls | Compliant — `ARBITRATION_SECTIONS.record` is a specific signature, not `Function`; `contenders` could be `readonly` but the check scopes to parameters |
| 3 | Enum anti-patterns | N/A — no enum in the diff |
| 4 | Null/undefined handling | Compliant — `record(fixture)?.contenders ?? []`, `pokeyVoice !== null` (explicit, so voice `0` is not read as absent), `lengthFrames === null` not falsy. **But see the MEDIUM:** the *test* of that handling is defeated by numeric coercion |
| 5 | Module/declaration | Compliant — `windowFrames` exports fine with an unexported parameter type under `--noEmit`; lint clean |
| 6 | React/JSX | N/A |
| 7 | Async/Promise | N/A |
| 8 | Test quality | **1 violation** — the vacuous `cue(19, null)` assertion (MEDIUM). Otherwise compliant: casts removed, `FLEA_PARK_PIC` imported |
| 9 | Build/config | Compliant — no config touched |
| 10 | Security: input validation | Compliant — `fixtureRaw()` matches the text, not the scope; dismissed with rationale above |
| 11 | Error handling | N/A — no catch in the diff |
| 12 | Performance/bundle | Compliant as a decision (accepted round 1, unchanged). The **figures** are #17/#20 territory — see F-1 |
| 13 | Fix-introduced regressions | **1 violation** — `typescript.md:324` (LOW). And the meta-observation: the round-2 fix for the `windowFrames` LOW introduced a vacuous assertion, which is exactly what #13 exists to catch |
| 14 | Derived edges in one branch | N/A — `sim.ts`/`audio-dispatch.ts` untouched this round |
| 15 | Guards mutation-tested / loose bounds | **Mostly compliant, 1 gap** — R2-M1…M8 all verified by me; the `expectPopulated(…, 4, …)` floor is loose by one for voice 0 (deferred). N7 shows one new assertion is not mutation-proof |
| 16 | Accessible names | N/A |
| 17 | Comments asserting an un-rerun mechanism | **2 violations** — the bundle paragraph (HIGH) and check #20's own origin note (MEDIUM). Everything else re-ran clean: `windowFrames`' doc, SND-114, §2.6's names, the cited test names |
| 18 | Test apparatus fails by PASSING | **1 violation** — the `cue(19, null)` assertion (MEDIUM). The alias handling is exemplary compliance |
| 19 | Population filtered by a neighbouring field | Compliant — the voice-0 recount is the fix for round 1's instance; `audfWriters` takes the voice as a parameter and pre-filters nothing |
| 20 | Quantity measured from an artifact the same diff changes | **1 violation, reflexively** — the check's first review catches the diff that added it (HIGH, F-1) |

**Handoff:** Back to Dev for fixes.

### Delivery Findings — Reviewer (round 2)

- **Gap** (non-blocking): **a comment quoting exact bundle sizes cannot be kept true by the
  story that writes it.** `plugins/centipede/src/shell/audio.ts:41-54` quantifies a bundle
  assembled from `src/shared/`, which every game imports; jt9-6 falsified five of its figures
  within hours without touching centipede. Either the repo accepts `~` figures for anything
  downstream of `src/shared/`, or it needs a build-time assertion that owns the number. Affects
  `plugins/centipede/src/shell/audio.ts` and any future comment quoting a bundle size.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): **the citation ledger still cannot see a wrong number in a claim's
  prose.** Round 1 found SND-114's count wrong; the fix corrected the instance, and novel mutant
  N9 (four → seven in the corrected text) leaves 1157/1157 green. The byte gate validates
  `source.file`/`line`/`verbatim` and only non-emptiness of `claim`, so the class round 1 named
  is still open. Affects `plugins/centipede/tools/audit/check-citations.mjs` (a claim asserting a
  COUNT could carry the command that produces it and be re-run). *Found by Reviewer during code
  review.*
- **Question** (non-blocking): **the reviewer subagent roster does not match what round 1
  recorded, and nothing in the repo declares it.** `pf settings get workflow.reviewer_subagents`
  returns four enabled (`preflight`, `comment_analyzer`, `security`, `rule_checker`); round 1
  recorded two and filed a finding saying seven of nine were off. `grep -rn reviewer_subagents`
  over the tree finds no declaration, so the setting's provenance is untraceable from the
  checkout and neither round can be audited against the other. Affects `.pennyfarthing` settings
  (someone should decide the roster AND put it somewhere a reviewer can cite). *Found by
  Reviewer during code review.*
- **Improvement** (non-blocking): `reviewer-preflight` miscounted the claims added by this story
  (+4, SND-109…SND-112; actually +6, SND-109…SND-114), and both `rule_checker` and
  `comment_analyzer` independently proposed "environment/tooling-version drift" for a bundle
  delta whose real cause is a sibling story's edit to `src/shared/audio.ts`. All three were
  caught by re-deriving rather than relaying. Worth noting for whoever tunes these briefs: none
  of the three specialists checked whether the *other* games in the comparison also import the
  changed shared module. Affects the reviewer subagent prompts. *Found by Reviewer during code
  review.*

### Round-2 review addendum — the tree moved under the review, twice

Recorded because this story is about figures outliving their measurement, and a review that
did not apply the same rule to itself would be worthless.

While this review was running, a sibling checkout landed sw8-27's GREEN round 2 (`6153c8d`,
`d61438e`, `43f94ff`). Two things I had already written became false, and both are corrected
above rather than left standing:

1. **The cabinet's 10 star-wars failures are gone** — sw8-27 fixed its own RED. `npx vitest run`
   is now **11 684 passed / 0 failed / 1 todo**. The attribution work was still correct and is
   still worth keeping: it is why nobody spent this review hunting a centipede regression.
2. **The checklist finding needed re-scoping.** `d61438e` appended checks **#21-#24** and updated
   none of the four range references, so three references that were correct when cp6-3 finished
   are now stale through no fault of this story. cp6-3 owns exactly one — the `#14-#19` that was
   already stale — and the finding now says so, at its re-taken line number.

**What did NOT change: the HIGH.** I rebuilt at the new HEAD (`ea7a6a8`, worktree `rev-parse`
verified against the repo) and centipede is still **64.71 kB / 21.14 kB gzip**, joust still
**139.97 kB**, chunk still `main-beT9ldva.js`. The sibling's commits touch no file under
`src/shared/` (`git log f1b756f..origin/main -- src/shared/` is empty), so nothing about F-1
moves. The figures in `audio.ts` remain wrong, and the session still claims they were verified
at handoff.

## Review Correlation — Round 3

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| 1 | reviewer | [HIGH] Bundle figures stale again after the rebase; session claimed they were verified at handoff | EXISTING_CHECK | **#20** (the check this story added in round 2) | Dev missed the check it had just written. Fixed by removing the exact claim, not by re-taking it — and #20 gained the bullet this round earned: *a figure for an artifact built out of SHARED code cannot be kept exact by the story that writes it* |
| 2 | reviewer | [MEDIUM] The `frameGate` half of the new `windowFrames` guard is vacuous (`19 * null === 0`) | NOT_APPLICABLE | #18-adjacent | **Not a coverage hole — an EQUIVALENT MUTANT**, proved by enumerating the domain (one differing cell, `-0` vs `0`, `Object.is`-only). No checklist change: the existing #15/#18 already say to mutation-test, and the lesson here is the opposite one — do not manufacture a kill. Documented in the source and the test instead |
| 3 | reviewer | [MEDIUM] Generalising the prose guard silently weakened §2.5 | EXISTING_CHECK | #13 Fix-introduced regressions | Dev missed existing check — a fix for §2.6 removed coverage from §2.5. Exemption is now per-row, and both directions are mutation-proved (R3-N1, R3-N1b) |
| 4 | reviewer | [MEDIUM] Check #20's origin note misstates its own founding incident | EXISTING_CHECK | #17 | Dev missed existing check, inside the check written to enforce it. Origin re-told; the dev sidecar's twin entry corrected the same way |
| 5 | reviewer | [LOW] `#14-#19` range reference stale | EXISTING_CHECK | #13 | Fixed — and all four references reconciled to `#24`, since sw8-27 had since made three more stale |
| 6 | reviewer | [LOW] `section as string` unjustified cast | EXISTING_CHECK | #1 | Dev missed existing check. Replaced with a real narrowing (`if (section === null) expect.fail(…)`), mutation-proved live by R3-N2 |
| 7 | reviewer | Delivery: exact figures for shared-code artifacts are a standing trap | NEW_CHECK | — | Folded into **#20** as a new bullet rather than a new check — same class, and a #25 would have split it |
| 8 | reviewer | Delivery: the citation ledger still cannot see a wrong number in a claim's prose | PROCESS | — | Out of scope (round 1 named it, round 2 re-confirmed it); carried in Delivery Findings for SM |
| 9 | reviewer | Delivery: subagent roster undeclared anywhere in the repo | PROCESS | — | Not Dev's to change; carried in Delivery Findings |

### Signal Summary
- **External findings: 0** — trunk-based, no PR, no external reviewer or bot.
- **CI findings: 0** — the deploy workflow fires on a `<app>-vX.Y.Z` tag, not on a push to `main`, so there is no run to read. Verified locally instead.
- **Internal findings: 9** (6 severity-ranked rows + 3 Reviewer delivery findings)
- **New checks added: 0; one existing check EXTENDED.** #20 gained the shared-code bullet and a corrected origin. No `[EXT]` prefix — internal source.
- **Existing checks missed: #20 ×1 (its own author), #13 ×2, #17 ×1, #1 ×1.** The repeat pattern across all three rounds is #17/#20: a claim outrunning its measurement. Round 3 answers it structurally — the claim was removed rather than re-made, which is the only fix that survives the next sibling commit.

## Dev Assessment — Round 3

**Implementation Complete:** Yes. Four review findings fixed, two of them by changing what the
code CLAIMS rather than what it does — which is what all three rounds have actually been about.

**Tests:** centipede **1157/1157**; centipede+shared **1711/1711**; whole cabinet
**11 684/11 684** (0 failed, 1 todo, 757 files — the star-wars RED that was red during round 2
was fixed by its own story mid-review); orchestrator **390/390**; `npm run lint` clean.

**Branch:** none
Trunk-based; committed straight to `main` as **`67d305c`** (plus `92361d3`/`f810f4c` for
the review's two prose fixes). No PR — this repo does not use them.

### THE EXACT FIGURES ARE GONE, AND THAT IS THE FIX

The comment now reads `~44 kB` → `~65 kB`, `~47%`, `joust ~140 kB`. Not a retreat from
measurement — a correction to what is measurable. This paragraph quantifies a bundle assembled
partly from `src/shared/`, which all seven games import, so an exact figure in it is a claim
that **no story touching centipede can keep true**. It was falsified twice in three rounds: once
by measuring the base wrong, and once by a rebase pulling in jt9-6's 13-line edit to
`src/shared/audio.ts` — every digit moved while centipede itself was untouched. The comment now
carries the recipe and tells the reader to take their own number.

**The exact pair lives here instead, pinned to SHAs, where it cannot rot into a source comment.**
Measured LAST, after the final edit, in a worktree whose `rev-parse` I checked against the repo:

| commit | centipede chunk | gzip | joust |
|---|---|---|---|
| `63f32eb` (before this story) | 43.91 kB | 14.52 kB | — |
| `67d305c` (this commit, as published) | **64.71 kB** (`main-beT9ldva.js`) | **21.14 kB** | **139.97 kB** |

That is +20.80 kB raw, +6.62 kB gzipped, **47.37%**. (The table first said `6c58cbe`; a rebase
onto jt9-7 rewrote that SHA to `67d305c` before it was ever published, so I rebuilt at the
real one and re-took both figures — identical chunk hash, because jt9-7 touches no file this
bundle is built from. A SHA-pinned figure is only honest if the SHA is the one that shipped,
and this is the third time in this story that a rebase moved a number's ground.) Note the base predates jt9-6, so the pair
spans two changes; with a matched `src/shared/audio.ts` the fixture import alone costs 43.91 →
64.70 kB (measured by reverting only that file in a worktree — which also regenerates the
round-2 chunk hash `main-C8-_6twG.js`, and is how the review proved the drift was the rebase
rather than "tooling drift").

### THE frameGate CLAUSE IS AN EQUIVALENT MUTANT — the review's N7 was right to survive

The review found that deleting `|| cue.frameGate === null` leaves 1157/1157 green and called the
assertion vacuous. It is, and the reason matters more than the fix: `19 * null === 0` in JS, so
with any numeric length the two programs agree. Enumerated over `{null, 0, 1, 4, 19, -3, 255}`
squared, they differ in **one cell** — `(-3, null)` returns `-0` without the clause and `0` with
it, distinguishable only by `Object.is`. So no meaningful test can kill it.

I did not manufacture a kill. Asserting on `-0` would redden the mutant while proving nothing
about the rule the line exists to state. The clause stays (it expresses the contract the type
allows instead of leaning on a coercion), the assertion is relabelled a **contract pin**, and
both the source comment and the test say plainly which half is mutation-proven and which is not.
`lengthFrames === null` remains proven — `0` → `999` still reddens.

### THE §2.5 COVERAGE IS BACK, AND THE FLAG IS PROVED LOAD-BEARING

Round 2's N1 — naming `mushroom` in §2.5 as a contender — passed, because the invention
exemption was global. It is now a per-row `mayNameInventions`, false for §2.5 and true for §2.6.
Both directions proved this round:

| # | Mutant (verbatim) | Result |
|---|---|---|
| R3-N1 | §2.5 gains `` The `mushroom` also contends here. `` | **REDDENS** `POKEY voice 1: …` — the round-2 survivor is dead |
| R3-N1b | `mayNameInventions: true` → `false` on the voice-0 row | **REDDENS** `POKEY voice 0: …` — §2.6 genuinely needs it, so the flag is not decoration |
| R3-N2 | `const at = lines.findIndex(…)` → `const at = -1` | **REDDENS** both rows — the new `expect.fail` narrowing is live, not dead code |

### What else changed

- `section as string` is gone; `if (section === null) expect.fail(…)` narrows properly, so tsc
  sees a `string` without a cast (checklist #1).
- Check #20's origin note is re-told. It said the "19 kB" figure was "true when typed and false
  by commit close"; it was never true of the tree it shipped in — `77ef628` grew the fixture to
  23 291 bytes **and** wrote the wording in the same commit. The check gained the bullet this
  round actually earned (a figure for an artifact built out of shared code), and the dev sidecar's
  twin entry is corrected the same way.
- All four checklist range references reconciled to `#24`. cp6-3 owned one stale reference
  (`#14-#19`); sw8-27's `d61438e` appended `#21-#24` and updated none, so three more had gone
  stale. The review scoped the fix to cp6-3's one; I fixed all four, because leaving known-wrong
  counts in the file whose newest check is about known-wrong counts would be absurd — flagged
  here rather than done silently.

### Delivery Findings

### Dev (round 3)

- **Improvement** (non-blocking): the checklist's check-range is quoted in **four** places
  (`:104`, `:391`, `:431`, `:496`) and every story that appends a check must update all four.
  cp6-3 missed one, sw8-27 missed all four. It should be derived, or stated once. Affects
  `.pennyfarthing/gates/lang-review/typescript.md`. *Found by Dev during round-3 rework.*
- **Question** (non-blocking): two stories appended to the same numbered checklist within hours
  (`#20` here, `#21-#24` in sw8-27) with no coordination. It worked only because sw8-27 branched
  after `#20` landed; simultaneous work would have produced two `#21`s and a silent merge. Affects
  `.pennyfarthing/gates/lang-review/*.md` (numbering may need to stop being positional).
  *Found by Dev during round-3 rework.*

**Handoff:** To review.
## Reviewer Assessment

**Verdict:** APPROVED

Round 3, reviewed at the user's direction **without the subagent fan-out** — a proportionate
pass over a diff whose entire content is four claim-fixes and one per-row flag. I say that
plainly rather than implying coverage I did not buy: `preflight`, `comment_analyzer`, `security`
and `rule_checker` were NOT run this round. What I did instead is below, and every line of it
was executed.

**Data flow traced:** unchanged this round and re-confirmed by reading — keyboard input → pure
core (`src/core/`) → `GameEvent` closed union → `audio-dispatch` → shared engine → WebAudio. The
only new *code* in round 3 is a boolean field on a test-local table and a null-narrowing in a
test. No production behaviour moved: `git diff 56c8d59..HEAD -- plugins/centipede/src` touches
comments only, and the built chunk is byte-identical (`main-beT9ldva.js`) across the round.

**Pattern observed:** the round-3 fix for the bundle figures is the only one of the three
attempts that can survive a sibling's commit, because it stops making the claim instead of
re-making it. `plugins/centipede/src/shell/audio.ts:40-62`.

### All four findings are closed, and I re-ran each rather than reading the table

- `[VERIFIED]` **F-1 (HIGH), the figures.** The exact figures are gone; the paragraph is `~44 kB`
  → `~65 kB`, `~47%`, `joust ~140 kB`. The two exact numbers that remain (`64.70 → 64.71`,
  `139.95 → 139.97`) are a *historical record of the drift*, immutable and correctly stated. The
  exact pair now lives in the session file pinned to a SHA — and when the Dev's rebase rewrote
  that SHA, they rebuilt and re-pinned rather than leave it dangling, which is the first time in
  this story a figure survived a rebase. Verified the pointer resolves: `sprint/archive/` is
  where finish puts the session, and it holds 559 files in exactly that form.
- `[VERIFIED]` **F-2 (MEDIUM), the frameGate clause — and my finding was half wrong.** I called
  the assertion vacuous. It is, but the Dev established something better than a fix: it is an
  **equivalent mutant**. Enumerating `{null,0,1,4,19,-3,255}` squared, the guarded and unguarded
  programs differ in exactly one cell (`-3, null` → `-0` vs `0`, `Object.is`-only). I re-ran that
  enumeration myself. So no meaningful test can kill it, and the right answer was to say so, not
  to manufacture a kill by asserting on `-0`. Both the source and the test now name which half is
  mutation-proven and which is a contract pin. **Accepting a correction to my own finding is the
  outcome here, not a concession** — the fix I asked for would have made the suite worse.
- `[VERIFIED]` **F-3 (MEDIUM), the §2.5 weakening.** The exemption is per-row. I re-ran the
  round-2 survivor myself: naming `` `mushroom` `` in §2.5 now **reddens** `POKEY voice 1: …`.
  And the flag is not decoration — flipping §2.6's row to `false` reddens `POKEY voice 0: …`, so
  both states are load-bearing. cp6-1's original rule is back for §2.5 without deleting §2.6's
  ruling paragraph.
- `[VERIFIED]` **F-4 (MEDIUM), check #20's origin.** Re-told accurately: `77ef628` grew the
  fixture to 23 291 bytes *and* wrote the "19 kB" wording, so it described the parent tree. The
  dev sidecar's twin entry carries the same correction. The check also gained the bullet this
  story actually earned — a figure for an artifact built out of shared code.
- `[VERIFIED]` **F-5 (LOW), the range references.** All four now read `#14-#24` / `(24 checks)`.
  The Dev fixed three that were sw8-27's rather than cp6-3's and **flagged that they had done
  so** instead of quietly widening scope. Correct call and correctly disclosed.
- `[VERIFIED]` **F-6 (LOW), the cast.** `section as string` is gone. I proved the replacement is
  a real narrowing rather than an incidental pass: neutering `expect.fail(…)` to `void 0` makes
  tsc emit `TS2345: Argument of type 'string | null' is not assignable to parameter of type
  'string'` at `sound-dossier.test.ts:1452`. The cast was genuinely removed, not hidden.

### Two defects I found in round 3 — and fixed rather than opening round 4

Both were unfounded claims in the Dev's new comment, the same class the story keeps producing,
and both were one sentence. Opening a fourth round for them would have cost more than the
defects. Recorded here so the edit is not silent:

- "It roughly **HALVES the headroom**" quantified nothing — there is no budget for the headroom
  to be half of. Now: "adds about half again to this game's bundle", which is what ~44 → ~65 says.
- "lives in **this story's session file**" pointed at `.session/`, which is gitignored and moves
  at finish. Now `sprint/archive/cp6-3-session.md`. A pointer that does not resolve is the same
  defect as a figure that does not reproduce.

### Devil's Advocate

Argue this should not ship. The strongest case is that round 3 solved the figures problem by
**deleting the evidence**: a story whose whole justification was "the cost is measured, not waved
at" now waves at it with four tildes. A hostile reader would say three review rounds converted a
precise claim into an imprecise one and called that progress, and that the real lesson — take the
measurement last — was available in round 2 for free.

I do not accept it, and the reason is falsifiability rather than taste. An exact figure here is
not a stronger claim than an approximate one; it is an **unkeepable** one. It was falsified twice
by things centipede never touched, and would have been falsified a third time by the jt9-7 rebase
had the Dev not been checking. A claim that any of seven sibling stories can break is not
evidence, it is a tripwire pointed at whoever edits this file next. The exact pair still exists,
pinned to a SHA, in the archived session — which is precisely where a figure that describes one
moment in history belongs, and not in a comment that claims to describe the present.

Second attack: is the equivalent-mutant argument a rationalisation for leaving a branch untested?
I checked this rather than accepted it, because it is exactly the shape of a convenient
conclusion. It is not: the enumeration is exhaustive over the type's domain, I re-ran it, and the
single differing cell needs `Object.is` to see. The honest description of that clause is
"redundant but intent-revealing", and the code now says so in those words.

Third: what would a confused maintainer do? Read `mayNameInventions: false` on §2.5 and wonder
whether it is dead configuration. R3-N1b answers them — flipping it reddens — and the field's
docblock says which section needs which and why. That is the question this story failed to
answer three times in a row, answered.

What I cannot claim: five specialists did not run this round, so `[EDGE]`, `[SILENT]`, `[TEST]`,
`[TYPE]` and `[SIMPLE]` were assessed by me alone, on a diff small enough that I read every line
of it. On a larger diff I would not have accepted that trade.

**Handoff:** To SM for finish-story

### Reviewer (code review) — round 3

- **Improvement** (non-blocking): this story took **three review rounds on one paragraph**, and
  every round's fix carried the next round's defect of the same class — `pic: 0x0c` passed
  because the predicate never read the range, `cue(19, null)` passed because multiplication never
  saw the null, and each corrected figure was falsified by something the author did not control.
  The pattern is worth a retro item: a claim about a measurement is a deliverable with no test,
  and this repo currently has no gate that fails when one is wrong. Affects the sprint's retro
  and `.pennyfarthing/gates/` (a figure-bearing comment could carry a re-runnable command the way
  a claim carries a citation). *Found by Reviewer during code review.*
- **Question** (non-blocking): four sibling stories (jt9-6, jt9-7, sw8-27, cp6-3) were in flight
  in separate checkouts against one trunk during this review, and two of them moved ground under
  it — jt9-6's `src/shared/audio.ts` edit falsified cp6-3's figures, and sw8-27 appended
  `#21-#24` to the same numbered checklist cp6-3 had just extended. Nothing broke, but the
  checklist collision was avoided only by luck of ordering. Affects `.pennyfarthing/gates/lang-review/*.md`
  (positional numbering does not survive concurrent authorship). *Found by Reviewer during code
  review.*