---
story_id: "jt5-5"
jira_key: "jt5-5"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-5: Sound PRIORITY arbitration — @shared/audio steals, the machine refuses

## Story Details
- **ID:** jt5-5
- **Jira Key:** jt5-5
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T15:02:07Z
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T14:03:18Z | 2026-08-01T14:19:27Z | 16m 9s |
| red | 2026-08-01T14:19:27Z | 2026-08-01T14:38:44Z | 19m 17s |
| green | 2026-08-01T14:38:44Z | 2026-08-01T14:51:56Z | 13m 12s |
| review | 2026-08-01T14:51:56Z | 2026-08-01T15:02:07Z | 10m 11s |
| finish | 2026-08-01T15:02:07Z | - | - |

## Story Acceptance Criteria

**DERIVED CRITERIA — no upstream acceptance_criteria in sprint YAML; these are SM-authored proposals for TEA to challenge and refine.**

1. **Optional priority + optional frame-duration on the shared engine's manifest, additive and backward-compatible.** `src/shared/audio.ts` adds two optional fields to the sound manifest shape: `priority?: number` and `frameDuration?: number`. These fields are optional; the six games that pass neither (tempest, asteroids, battlezone, red-baron, centipede, star-wars) keep today's always-steal behaviour, proven by a test that replays a known scenario and asserts no behaviour change. Only joust provides these fields.

2. **Priority comparison gates channel occupation only while the frame window runs.** When `frameDuration` is set on a sounding cue, its frame countdown (`STMR` in the ROM, a per-frame decrement seeded from the duration) gates the priority comparison. A higher-or-EQUAL incoming priority DOES interrupt; a strictly-lower one is REFUSED. Once the frame window expires (`frameDuration` countdown reaches 0), ANY priority interrupts unconditionally — the machine's `STMR == 0` path. A test pins that a priority-40 cue running for 20 frames refuses a lower-priority sound for those 20 frames, then accepts it on frame 21.

3. **joust wires its already-recorded priorities and frame durations through.** `plugins/joust/src/shell/audio.ts` already records all 13 distinct priorities in `CUE_SOURCES`; the frame durations must come from the ROM sound-table `verbatim` strings, the ONLY place they exist today (`CueSource` has a `priority` field but NO duration field). The row format is `<priority>,<code>,<duration>`, so `SNEDIE FCB 040,!N$16!.$7F,20` is priority **40** / **20 frames** and `SNPDIE FCB 080,!N$16!.$7F,20` is priority **80** / **20 frames**. The concrete pin is the epic's own headline case: while a priority-80 `playerDeath` is still inside its 20-frame window a priority-40 `enemyDeath` is REFUSED, and on the frame after that window expires the same `enemyDeath` is ACCEPTED. Two traps measured at setup: a cue's priority is NOT its duration (different columns of the same row), and 80 is NOT the maximum — `extraMan`/`SNREPL` (:8089) is priority **100**. The full set is 6, 9, 10, 20, 40, 45, 50, 65, 66, 67, 70, 80, 100.

4. **The SYSTEM.SRC routine extent is corrected everywhere.** The epic description's routine citation `:761-768` is INCOMPLETE and WRONG. The full `SND` routine is `SYSTEM.SRC:761-773`, including the acceptance path (:769-773). The shipped comment at `plugins/joust/src/shell/audio.ts:164` also cites `:761-772` (missing NOSND/RTS). Both become `SYSTEM.SRC:761-773` — word for word identical.

5. **Claim JT53-004 is fixed on BOTH axes: re-cited and verified.** The claim in `plugins/joust/docs/rom-study/claims/audio.json` asserts "SNELWD priority 006 sits below the player wing pair's 010, so a buzzard's wingbeat never steals the knight's own". (i) **RE-CITE onto the mechanism:** the current cite (:8108) is a table-definition row that cannot support a consequence about refusal windows. The cite becomes the mechanism that implements refusal: `SYSTEM.SRC:761-773` (the SND routine and its STMR window gate). (ii) **VERIFY the clause, not merely assert it:** once this story lands the arbitration logic, the claim becomes testable in the port. A test proves that during an active priority-80 playerDeath window, a priority-06 enemyWingDown CANNOT interrupt. The citation gate re-opens only quoted lines and cannot see a claim's body — the gate going green is NOT evidence here. Build the verification test explicitly. **Schema constraint measured at setup:** all 27 claims in `audio.json` carry `source.line` as a single **int**, so a RANGE cite (`:761-773`) is not expressible in that field — cite ONE line (`:767`, the `CMPA SPRI` row, is the natural anchor) and carry the extent in the claim body. `SYSTEM.SRC` is already an accepted `source.file` in that set alongside `JOUSTRV4.SRC`, so the file swap itself is safe. Splitting into two claims (keep :8108 for the priority-006 fact it genuinely supports; add a new claim for the never-steals consequence anchored on the mechanism) is open to TEA — the AC requires the consequence stop resting on :8108, not a specific edit shape.

6. **The >=128 "always sent" path is deliberately absent, with reason recorded.** `SYSTEM.SRC:762`'s `BMI 1$   SOUND PIRORITYS OF 128 TO 255 ARE ALWAYS SENT` skips only the end-of-game mute at :763-764 (`LDB GOVER / BPL NOSND`) — it does NOT bypass the priority comparison at :765-768. It is dead for joust's cue set because the highest recorded priority is 100. The shared engine omits this path; record why in a comment: joust's maximum priority is 100, so the >=128 branch is an unreachable **Williams** system-ROM safeguard (joust is a Williams title, not Atari), omitted as dead code rather than overlooked.

7. **No regressions.** The joust vitest project and the orchestrator suite both stay green with zero failures — baseline measured at setup: **2026** (`npx vitest run --project joust`) and **358** (`npm run test:orchestrator`). This story ADDS tests, so those counts must RISE, never merely match. Lint clean (`npm run lint`), build clean, no debug code.

## Measured Background (User Rulings & Corrections)

### User Ruling 1 — PLACEMENT: The Arbitration Goes in the Shared Engine

The shared engine (`src/shared/audio.ts`) gets the optional priority fields and arbitration logic. This was chosen over a joust-side wrapper. This is a **deliberate override** of CLAUDE.md:337 ("Extract into src/shared only once a second game proves the duplication is real") — the user selected this placement with full knowledge that zero other games have priority needs. The addition MUST be **optional and backward-compatible**: the six games that pass no priority must behave exactly as they do today (always steal).

### User Ruling 2 — SOUNDING WINDOW: ROM Frame Durations, Not .wav Length

The window during which a sounding cue can refuse lower priority is a **frame countdown** seeded from the ROM table's duration byte, per SYSTEM.SRC:173-187 (`EXECST` frame routine). NOT the decoded .wav's playback length. This is decisive because jt5-2 (the samples) is still backlog — no .wav exists yet — so a playback-length window cannot be built today. The frame-count window is deterministic and testable without audio decode.

**CONSEQUENCE:** The shared engine has NO clock at all today (event-driven via `onended`). A frame-duration window therefore needs BOTH an optional priority AND an optional per-sound frame duration, plus a caller-driven tick/advance entry point. That is a larger surface than a joust-side wrapper would have been; it is the accepted cost of Ruling 1.

### Measured Corrections (R1-R4 verified against `reference/williams-source/joust/SYSTEM.SRC`; R5 against `JOUSTRV4.SRC`)

**R1 — Routine Extent is Truncated:**
The description calls out `:761-768` as "the surrounding routine". That is only the REFUSAL half. The full `SND` routine is `SYSTEM.SRC:761-773`. Reproduced BYTE-EXACT below — Williams's own misspellings (`PIRORITY`, `INTERUPT`) are theirs and must not be silently corrected, and `:764`/`:773` carry no trailing comment at all:
```
761: SND	LDA	,X+		GET SOUND PIRORITY
762: 	BMI	1$		SOUND PIRORITYS OF 128 TO 255 ARE ALWAYS SENT
763: 	LDB	GOVER		NO SOUNDS 0 TO 127 DURING END OF GAME
764: 	BPL	NOSND
765: 1$	LDB	STMR		SOUND STILL SOUNDING
766: 	BEQ	SN1NS		 BR=NO SOUND
767: 	CMPA	SPRI		OK TO INTERUPT THIS PIRORITY SOUND?
768: 	BLO	NOSND		 BR=NO
769: SN1NS	STA	SPRI		NEW PIRORITY
770: 	LDA	#1		ALLOW FOR NEXT SOUND
771: 	STA	STMR
772: 	STX	SNDPTR		SAVE SOUND TABLE ADDRESS
773: NOSND	RTS
```
Lines 769-772 are the acceptance path and `:773` is the shared exit. A truncated extent manufactures false corroboration. Note `:771` (`STA STMR`) stores the constant **1** loaded at :770 — it does NOT load the table's duration; the duration is loaded a frame later by `EXECST` at `:183` (`STB STMR`). Getting that ordering wrong would put the first frame's window at the wrong length.

**R2 — STMR is the Gate, Not Audio Playback:**
`STMR` is a **per-frame countdown**, driven by the frame routine `EXECST` at `:173-187`. The machine loads the duration byte from the ROM table and counts down each frame. When `STMR == 0`, the priority comparison is SKIPPED entirely (`:766 BEQ SN1NS`). This is how the machine implements a deterministic frame-based window, not a playback-length window.

**R3 — BLO is Unsigned, so EQUAL Priority DOES Interrupt:**
`BLO` (Branch if Lower, unsigned) refuses a **strictly lower** priority. An **equal** priority interrupts. Any test must pin this.

**R4 — >=128 Path is Dead for joust:**
The high-byte check at `:762` only bypasses the game-over mute. It does NOT bypass the priority comparison (`:765-768`). Joust's highest priority is 100; this path is unreachable dead code and is deliberately omitted.

**R5 — CueSource Has Priority But No Duration Field:**
`CueSource` in `plugins/joust/src/shell/audio.ts` carries a `priority` field. The **frame durations exist only inside the `verbatim` strings**, e.g.:
```
'SNEDIE\tFCB\t040,!N$16!.$7F,20\tENEMY DIES'   → priority 040, duration 20 frames
'SNELWD\tFCB\t006,!N$20!.$7F,60\t...'          → priority 006, duration 60 frames
```
The 38-table set is at `JOUSTRV4.SRC:8051-8131` under a format header at `:8045-8049`.

## Known Hazards

**HAZARD A — The Shared Engine Has NO Clock Today:**
`src/shared/audio.ts` is event-driven and has no frame-tick mechanism. Implementing frame-duration windows requires adding a new entry point (e.g., `tick()` or `advance(frameDurationMs)`) that callers must invoke every frame. joust will call it; every other game that ignores the priority/frameDuration fields keeps working as-is.

**HAZARD B — The Deferred Array May Require Updating:**
If any audio cues are deferred because emitters do not yet exist, the deferred array in `plugins/joust/tests/audio-events.test.ts` may need checking to ensure this story's new cue interactions don't conflict with existing scaffolding.

## Sibling Contention

Two other checkouts are live on this repo:
- **a-2** was on cp5-1 (centipede audio)
- **a-3** landed uf1-14 (star-wars)

Neither touches `plugins/joust/**` or `src/shared/audio.ts` in the visible range. At review, check for any sibling races on the shared engine.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)

- **Improvement** (non-blocking): an unarbitrated cue routed to the arbitrated voice's channel
  stops that voice without releasing its window, so a silent voice goes on refusing. REPRODUCED at
  review. Unreachable in the tree today (joust arbitrates all 17 cues; no other game passes
  `priorities`), which is why it did not block. Affects `src/shared/audio.ts` (release the voice
  inside `stopChannel`, which both paths share, rather than only in `stopLoop`).
  **Filed as jt5-15** (2pt, p3). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the sound-table extent problem is bigger than two cues.
  `CueSource` cites one `FCB` row, but any table whose last pair carries `+$80` continues past it,
  and nothing mechanically stops the next transcription reading a cited row as a whole table.
  Affects `plugins/joust/src/shell/audio.ts` (`CueSource` wants an extent field or a second
  citation). Already **owned by jt5-6** per TEA's and Dev's findings — confirmed jt5-6 exists in
  `sprint/epic-jt5.yaml` and names `SNPCR2` at ":8119, the same $12 opener at a different offset",
  which is the same three-line shape. *Found by Reviewer during code review.*
- **DISMISSED, not filed** — Dev's Gap "nothing anchors joust's frame to the machine's frame".
  It is anchored, and was before this story: `plugins/joust/src/core/frame.ts:85` defines
  `FRAME_HZ = 8_000_000 / (512 * 260)` = **60.0962 Hz**, the Williams 8 MHz master clock over a
  512x260 raster, and `pumpFrames` (`src/shell/timebase.ts:21`) steps on exactly that. So
  `SNPCR1`'s 450 frames is 7.488s and `SNPDIE`'s 20 is 0.333s — the ROM's own durations, at the
  ROM's own rate. No story needed. *Assessed by Reviewer during code review.*

- **Note for SM (not a finding):** a sibling checkout ran `just release-all` DURING this review, so
  **`joust-v0.0.12` already contains this story's arbitration** (`feat(jt5-5)` is an ancestor of the
  tag) and it is deployed. The review round landed after the tag and is therefore NOT in v0.0.12 —
  but `git diff joust-v0.0.12..HEAD -- plugins/joust/src src/shared/audio.ts` shows **no non-comment
  source lines changed**, so production behaviour is identical and no re-release is needed for
  correctness. Worth knowing at finish rather than discovering from the tag list.


### Dev (implementation)

- **Improvement** (non-blocking): `CueSource` cannot express a table that spans more than one ROM
  line, and two of joust's seventeen do. It holds a single `Citation`, so `FRAME_DURATIONS` had to
  live beside it as a second transcription rather than inside it. Affects
  `plugins/joust/src/shell/audio.ts` (`CueSource` needs an optional extent — a `lines: [from, to]`
  or a second citation — so a table's length is cited where its priority already is). **Owned by
  jt5-6**, which transcribes `SNPCR2` (:8119-8121, the same three-line shape as `SNPCR1`) and will
  need the extent anyway. *Found by Dev during implementation.*
- **Question** (non-blocking): joust's `CHANNELS` map no longer decides anything for the seventeen
  arbitrated cues, since they now share one voice. It is kept because the shared engine still routes
  every sound by channel and because a channel per priority is still an honest description of which
  cues share a voice — but a reader will take it for live routing. Affects
  `plugins/joust/src/shell/audio.ts` (`CHANNELS`); the header comment now says so explicitly, which
  may be enough. Raised so the Reviewer can rule rather than left implicit. *Found by Dev during
  implementation.*
- **Gap** (non-blocking): nothing anchors joust's frame to the machine's frame rate. The windows are
  counted in `pumpFrames` steps, so a `450`-frame `SNPCR1` is only 7.5s if a stepped frame is
  1/60s. `plugins/joust/src/shell/timebase.ts` exists and neither this story nor its tests cite it.
  TEA raised the same question during test design; recording it again because implementation made it
  concrete — the durations are now real numbers in shipped code. Affects
  `plugins/joust/src/shell/audio.ts` (`FRAME_DURATIONS` assumes the ROM's frame == a stepped frame).
  **Needs filing** if the Reviewer agrees it is worth a story. *Found by Dev during implementation.*

### TEA (test design)

- **Gap** (non-blocking): the two multi-line sound tables are a general hazard, not a jt5-5 one.
  `SNPCR1` (:8116-8118) and `SNPTED` (:8091-8093) continue past their cited `FCB` row via the
  `+$80` continuation bit, and `CUE_SOURCES` cites only the defining row for all 17 cues. Any
  future claim about how long a joust cue lasts — not just this story's window — reads 30 where
  the ROM says 450 and 134. Affects `plugins/joust/src/shell/audio.ts` (`CueSource` records a
  single `Citation` per table and has no way to express a multi-line extent). **Owned by jt5-6**,
  which already names `SNPCR2` at ":8119, the same $12 opener at a different offset — '30+13'"
  and must transcribe that table's full extent for exactly this reason; the jt5-6 description
  should gain the `+$80` rule. *Found by TEA during test design.*
- **Improvement** (non-blocking): joust's channel map becomes vestigial for arbitrated cues.
  Once all 17 cues share the machine's one arbitrated voice, `CHANNELS`' thirteen `prio-N`
  entries no longer decide anything — they were jt5-1's fence, and this story replaces the fence
  with the mechanism. Leaving them is harmless but they will read as live routing to the next
  person. Affects `plugins/joust/src/shell/audio.ts` (`CHANNELS` + the header comment at :28-46,
  which still describes the fence in the present tense). Deliberately NOT in this story's scope:
  the shared engine still needs `channels` for every unarbitrated name, so removing joust's map
  is a separate decision. **Needs filing if Dev does not fold it into AC4's comment sweep.**
  *Found by TEA during test design.*
- **Question** (non-blocking): nothing establishes that joust's frame is the ROM's frame.
  The windows are counted in `pumpFrames` steps, so they are only faithful if a stepped frame is
  the machine's frame. `plugins/joust/src/shell/timebase.ts` exists and jt5-5 never cites it.
  A 450-frame `SNPCR1` is 7.5s at 60Hz — audible enough that a wrong timebase would be obvious,
  which is why this is a question and not a blocker. Affects
  `plugins/joust/tests/audio-priority.test.ts` (the clock tests assert cadence, not rate).
  *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **`FRAME_DURATIONS` is a hand-transcribed map, not derived from `CUE_SOURCES` like `PRIORITIES`**
  - Spec source: context-story-jt5-5.md, AC3
  - Spec text: "the frame durations must come from the ROM sound-table `verbatim` strings, the ONLY
    place they exist today"
  - Implementation: `PRIORITIES` IS derived from `CUE_SOURCES` (so the priority has one spelling in
    this repo, as the AC asks). `FRAME_DURATIONS` is a separate literal map, each entry commented
    with its table's FULL extent.
  - Rationale: TEA's deviation established that a `verbatim` row is not the table for `SNPCR1`
    (:8116-8118, 450 frames) or `SNPTED` (:8091-8093, 134) — a `+$80` code continues onto the next
    line. Deriving from `verbatim` would have produced 30 for both. `CueSource` holds exactly one
    `Citation`, so there is nowhere in the existing structure to put a multi-line extent; extending
    `CueSource` would have touched all 17 records and every citation test for a change no AC asked
    for.
  - Severity: minor
  - Forward impact: two transcriptions of the ROM tables now exist — `CUE_SOURCES.source.verbatim`
    (the defining row) and `FRAME_DURATIONS` (the summed extent). They are consistent but not
    mechanically tied; `tests/audio-priority.test.ts` pins the totals. **jt5-6** should fold the
    extent into `CueSource` when it transcribes `SNPCR2`, which has the same shape.

- **Four existing recording fakes and centipede's engine stub gained `tick`**
  - Spec source: the tests TEA wrote — `plugins/joust/tests/audio-priority.test.ts`
  - Spec text: "`playEventSounds` advances the clock exactly ONCE per call, BEFORE it plays any of
    that frame's cues"
  - Implementation: `SoundPlayer` widened from `Pick<AudioEngine, 'play'>` to
    `Pick<AudioEngine, 'play' | 'tick'>`; `tick: () => {}` added to the fakes in
    `audio-dispatch.test.ts`, `audio-flap.test.ts`, `audio-thud.test.ts` (x2) and to the
    `AudioEngine` stub in `plugins/centipede/tests/audio-wiring.test.ts`.
  - Rationale: the collaborator interface genuinely gained a method, so a fake that omits it is an
    incomplete fake. The tempting alternative — `audio.tick?.()` — was rejected: it would let a
    production wiring that never ticks pass every test, which is precisely the defect the AC exists
    to prevent. None of the ticks is RECORDED, because every sweep in those files counts "one effect
    per event kind" and a per-frame clock is not an effect of an event.
  - Severity: minor
  - Forward impact: any future fake of this seam must implement `tick`. centipede declares no
    priorities, so its engine never arbitrates and the tick is inert there.

- **The epic description gained a settled-rulings note beyond AC4's literal ask**
  - Spec source: context-story-jt5-5.md, AC4
  - Spec text: "the epic description's `:761-768` ... becomes `SYSTEM.SRC:761-773`"
  - Implementation: corrected both extent references AND appended one sentence recording that the
    description's "Options:" either/or was ruled before setup.
  - Rationale: AC4 required rewriting the field anyway, and leaving an explicitly open either/or in
    the tracked description after it was decided is the stale-description trap this epic has been
    bitten by. The original text is otherwise untouched, including the `:761-768` reference that now
    appears only inside the clause explaining why it is wrong.
  - Severity: minor
  - Forward impact: none — `sprint/` is tracking, not shipped code, and nothing machine-reads it.


### TEA (test design)

- **AC3's stated parsing method is refuted for 2 of 17 cues; tests pin full-table totals instead**
  - Spec source: context-story-jt5-5.md, AC3
  - Spec text: "the frame durations must come from the ROM sound-table `verbatim` strings, the ONLY
    place they exist today"
  - Implementation: the suite asserts durations summed across each table's FULL extent, following
    `+$80` continuations across ROM lines, and adds `does NOT truncate the two multi-line tables to
    their cited row` which fails specifically against the verbatim-only method.
  - Rationale: the format header (`JOUSTRV4.SRC:8045-8049`) states "IF M.S.BIT SET ON SOUND,
    SOUND,LENGTH" — a `+$80` code is followed by another pair, which the assembler may place on the
    next line. `SNPCR1` is :8116-8118 (30+255+165 = **450**) and `SNPTED` is :8091-8093
    (15+15+7+7+90 = **134**); both cited rows parse cleanly to **30**. The verbatim strings are
    byte-perfect and still the wrong length, so the AC's method would have shipped a 15x error on
    the transporter cue with a green citation gate.
  - Severity: major
  - Forward impact: `CUE_SOURCES` cannot express a multi-line extent (one `Citation` per table), so
    Dev must either transcribe the totals as data with the extent in a comment, or add a second
    citation. Filed as a Delivery Finding against **jt5-6**, which transcribes `SNPCR2` — the
    adjacent multi-line table — and would hit this next.

- **Arbitration is tested as ONE voice spanning channels, which AC1's wording does not state**
  - Spec source: context-story-jt5-5.md, AC1/AC3
  - Spec text: "Optional priority + optional frame-duration on the shared engine's manifest" /
    "a priority-40 enemyDeath is refused while a priority-80 playerDeath is still within its window"
  - Implementation: names carrying a `priorities` entry share a single arbitrated voice regardless
    of their `channels` entry; `arbitrates ACROSS channels` asserts it directly and carries a
    fixture guard that the two cues are on different channels.
  - Rationale: AC1 names the fields but not the scope, and per-channel arbitration satisfies its
    literal words while making AC3's pin unreachable — `enemyDeath` is on `prio-40` and
    `playerDeath` on `prio-80`, so they would never meet and every refusal test would pass
    vacuously. The machine has one voice (`SPRI` is a single byte), so one voice is also the
    faithful reading.
  - Severity: minor
  - Forward impact: joust's 13 `prio-N` channels stop deciding anything for arbitrated cues — see
    the Delivery Finding above.

- **AC4's epic-description half is left to review, not test-guarded**
  - Spec source: context-story-jt5-5.md, AC4
  - Spec text: "the epic description's `:761-768`, and the shipped comment at
    plugins/joust/src/shell/audio.ts:164's `:761-772`, both become `SYSTEM.SRC:761-773`"
  - Implementation: `audio-priority-source.test.ts` guards the two SOURCE files
    (`src/shell/audio.ts`, `tests/audio-rom-citations.test.ts`). The epic YAML description is
    corrected as a tracking edit and verified at review, with a standing guard that no source file
    reintroduces `:761-768`.
  - Rationale: a permanent test asserting one story's sprint-YAML prose would outlive the story and
    redden on any legitimate re-wording; `sprint/` is tracking, not shipped code, and the joust
    vitest project is rooted at `plugins/joust`. The regression the guard actually needs to stop is
    the wrong extent reaching the SOURCE, which is covered.
  - Severity: minor
  - Forward impact: Reviewer must confirm the epic description was updated —
    `pf sprint story field jt5-5 description` must not contain `:761-768`. It is not machine-checked.

---

## SM Setup Assessment (2026-08-01)

Setup measured the epic description's falsifiable claims BEFORE `sm-setup` ran, then audited
`sm-setup`'s own output. Both passes found defects. Recorded here because the archived session is
the permanent record and `sprint/epic-jt5.yaml` still carries the original description.

### Epic description: verified vs refuted

VERIFIED byte-exact: `CMPA SPRI` / `BLO NOSND` at `SYSTEM.SRC:767-768`; `SND LDA ,X+` at :761;
higher priority wins; `grep -ci priorit src/shared/audio.ts` == **0**; 17 cues / 13 distinct
priorities in `CUE_SOURCES`; enemyDeath 40 and playerDeath 80 on separate channels today.

REFUTED or incomplete — R1-R5 in Measured Background above. The two that matter most:

- **R1 (truncated extent).** "the surrounding routine is :761-768" is wrong; `SND` is
  **:761-773**. :761-768 is the refusal half only, dropping `SN1NS` (:769-772) and `NOSND RTS`.
  The shipped comment at `plugins/joust/src/shell/audio.ts:164` says `:761-772` — also short.
  This is the third truncated-extent defect in this epic; it manufactures corroboration, because a
  reader who checks only the cited span sees the omission as absence.
- **R2 (the omitted mechanism).** `SPRI` is consulted ONLY while `STMR` != 0 (:765-766). `STMR` is
  a per-frame countdown seeded from the table's duration byte and driven by `EXECST`
  (:173-187). The arbitration window is a ROM frame count, not "while audio is audible" — which
  is what makes Ruling 2 buildable today.

### Post-`sm-setup` audit — three defects found in the DERIVED acceptance criteria

The story carried `acceptance_criteria: null`, so `sm-setup` derived all seven. Its facts were
mostly sound and its arithmetic was not (the documented pattern). Corrected in the epic YAML,
this session, and the context file; the three files were then re-verified by parsing, not grepping.

1. **AC3 confused priority with duration and inverted the mechanism.** It read "a priority-40
   `enemyDeath` (**40 frames**)" — `SNEDIE FCB 040,!N$16!.$7F,20` is priority 40, duration **20**.
   Worse, it asserted a sounding priority-80 `playerDeath` "ACCEPTS all lower priorities, both
   during and after its window" — backwards, and the exact inversion of the epic's own headline
   case. It also called 80 "the highest priority in the set"; `extraMan`/`SNREPL` is **100**.
   AC3 as written contradicted AC5, which had the same scenario right.
2. **AC6 called the >=128 branch "an unreachable Atari-era safeguard."** Joust is a **Williams**
   title. A wrong attribution in a ROM-fidelity repo.
3. **AC7 encoded an invented test count** ("joust 1979/1979"). Measured: joust is **2026**,
   orchestrator **358**. Beyond the wrong number, pinning an exact count is self-defeating for a
   story that adds tests — rewritten as "zero failures, counts must RISE from the setup baseline."

4. **The ROM blocks in both files were PARAPHRASES presented as source** — and the context file
   labelled its block "verified byte-exact" over text that was not. They silently corrected
   Williams's own misspellings (`PIRORITY`→`PRIORITY`, `INTERUPT`→`INTERRUPT`), replaced :763's
   real comment with an invented "GAME-OVER MUTE CHECK", and hung editorial notes off :771 and
   :769 where the ROM has none. In a repo whose entire audit gate is byte-exact verbatim quotation,
   a fake-verbatim block in the permanent record is worse than no block: it reads as evidence.
   Both are now genuinely byte-exact, and that is *proven* — a script re-opened all **30** quoted
   ROM lines across the two files against `reference/williams-source/joust/SYSTEM.SRC` and found
   **0 mismatches**.
   Two mechanism errors rode along inside those blocks and are also fixed: (a) ":769-773 …
   STMR is loaded from the new sound table's duration byte" — it is not; :770-771 stores the
   **constant 1**, and the duration arrives a frame later from `EXECST:183`; (b) "when STMR
   reaches 0, set SNDPTR = 0" — `SNDPTR` is zeroed at :181 only when the fetched pair's
   continuation bit is clear, i.e. at the END of the table, not on every expiry.

Also noted for TEA, not a defect: all 27 claims in `plugins/joust/docs/rom-study/claims/audio.json`
carry `source.line` as a single **int**, so AC5's re-cite cannot be expressed as a range.
`SYSTEM.SRC` is already an accepted `source.file` there, so the file swap is safe.

### Rulings and their cost

Both either/ors were settled with the user before setup, so the RED phase is specifiable.
**Ruling 1 places the arbitration in `src/shared/audio.ts`** — a deliberate override of
CLAUDE.md:337 ("extract into src/shared only once a second game proves the duplication is real"),
made with the census in hand: six of the seven games importing `@shared/audio` have zero priority
notion, and joust is the cabinet's only single-voice-by-priority machine. It is a decision, not an
oversight; it should not be re-litigated at review. The addition must be optional and
backward-compatible so the other six behave exactly as they do today.

**Ruling 2 (ROM frame durations) is larger than it looks under Ruling 1:** the shared engine has no
clock at all today — it is event-driven via `onended`. A frame-duration window therefore needs an
optional priority AND an optional per-sound duration AND a caller-driven tick. That is the accepted
cost of putting it in the shared engine rather than in a joust-side wrapper.

### Board state at setup

Sibling probes clean: no `jt5-5` remote branch, no `jt5-5` session in any `a-*` checkout (a-2 holds
cp5-2, a-3 holds sw8-13), no open PRs. cp5-2 is centipede audio and imports `@shared/audio` — an
additive optional field will not collide, but Dev should expect `src/shared/tests/audio*.test.ts`
to be the shared surface and re-run after any rebase.
---

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `src/shared/tests/audio-priority.test.ts` — the mechanism: the comparison, the window, and
  backward compatibility for the six cabinets that pass no priorities. 27 tests, **18 failing**.
- `plugins/joust/tests/audio-priority.test.ts` — joust's numbers: 17 priorities, 17 full-table
  frame windows, the story's headline pin, and the frame clock's cadence and order.
  15 tests, **12 failing**.
- `plugins/joust/tests/audio-priority-source.test.ts` — AC4/AC5/AC6, which are claims about prose.
  8 tests, **5 failing**.

**Tests Written:** 50 tests covering 7 ACs — 35 failing, 15 keep-behaviour guards.
**Suites:** joust 2049 (2032 pass, 17 new failures — the pre-existing **2026** all still pass);
shared 528 (510 pass, 18 new failures — the pre-existing **501** all still pass);
orchestrator **358/358** unchanged. `npm run lint` exits 0.

### The two ROM facts the story omitted, and why they were unbuildable without

AC2 could not have been written from the description alone. `SPRI` is consulted **only** while
`STMR != 0` (`SYSTEM.SRC:765-766`) — with nothing sounding, no comparison happens at all — and
`STMR` is a per-frame countdown seeded from the sound table's duration byte and decremented by
`EXECST` (`:173-187`, `DEC STMR` at `:175`). Without the first, "refuses a lower priority" reads as
unconditional and a priority-6 wingbeat could never follow a priority-100 extra man. Without the
second there is no window to refuse *during*. Both are pinned, along with `BLO` being unsigned
strictly-lower, so an **equal** priority interrupts — the single easiest thing here to get backwards.

### The finding that changes the story's method

**AC3's "durations parsed from the ROM verbatim strings" is wrong for 2 of the 17 cues, and
silently so.** The table format header (`JOUSTRV4.SRC:8045-8049`) states "IF M.S.BIT SET ON SOUND,
SOUND,LENGTH": a pair whose code carries `+$80` is followed by another, which the assembler may put
on the next line. Two cues do exactly that:

| cue | table | cited row | true extent | frames |
|---|---|---|---|---|
| `playerMaterialise` | `SNPCR1` | :8116 → **30** | :8116-8118 | 30+255+165 = **450** |
| `pteroDeath` | `SNPTED` | :8091 → **30** | :8091-8093 | 15+15+7+7+90 = **134** |

Both cited rows are byte-perfect and both are the wrong length — a 15x error on the transporter cue
that the citation gate cannot see, because the gate re-opens the quoted line and has no view of what
a reading of that line claims. `does NOT truncate the two multi-line tables to their cited row`
fails specifically against the verbatim-only method. Logged as a major deviation; the general hazard
(every `CueSource` cites one row, and `CueSource` cannot express a multi-line extent) is filed as a
Delivery Finding against **jt5-6**, which transcribes the adjacent `SNPCR2` and would hit it next.

### Two design points the ACs left open, settled in the tests

- **Arbitration spans channels.** AC1 names the fields but not the scope, and a per-channel
  implementation satisfies its literal words while making AC3's pin unreachable — `enemyDeath` sits
  on `prio-40` and `playerDeath` on `prio-80`, so they would never meet and every refusal test would
  pass vacuously. `arbitrates ACROSS channels` asserts it directly and carries a fixture guard that
  the two channels really do differ. One voice is also the faithful reading: `SPRI` is one byte.
- **Only a sound that actually STARTS may claim the window.** The machine cannot have this problem;
  our samples can be undecoded or 404'd. If an accepted-but-silent cue seized the voice it would
  refuse real audio behind it — audible silence caused by an inaudible sound, which would ship green
  and be blamed on the samples. Pinned by `an accepted cue whose sample failed to load claims no window`.

### Rule Coverage

| Rule (`gates/lang-review/typescript.md`) | Test(s) | Status |
|---|---|---|
| #2 generic pitfalls — `Record<string, T>` widening | `keys neither new map by a bare string` | passing (regression guard) |
| #2 optional-field contract | `declares an optional priorities/frameDurations map` | failing |
| #4 `x \|\| default` where `x` can be `0` | `priority 0 is arbitrated as the LOWEST` / `duration 0 opens a window that is already closed` | failing / passing (guard) |
| #4 destructuring optional fields without defaults | `a priority with NO duration entry degrades` | passing (guard) |
| #1 type-safety escapes on the engine source | existing `audio-source-rules.test.ts` (unchanged, still green) | passing |
| #8 test quality — no vacuous assertions | per-file RED audits; `>= 128` strengthened to require a populated map | n/a |

**Rules checked:** 5 of the 9 checklist sections apply to this diff; #3 (enums), #6 (JSX) and #9
(build config) have no surface here, and #7 (async) is untouched — the new code paths are synchronous.

**Self-check:** 1 vacuous test found and fixed. `passes no priority >= 128` originally passed over an
**empty** priorities map — "no priority exceeds 127" is trivially true of no priorities at all, so it
would have gone green against an engine that never learned to arbitrate. It now asserts all 17 are
declared, and that the maximum is exactly 100. No `let _ =`, no `assert(true)`, no assertion that
holds regardless of behaviour; every keep-behaviour guard names in-file the specific wrong
implementation it would catch.

**One harness bug caught and fixed mid-phase:** the first joust helper monkeypatched the imported
`@shared/audio` namespace, which is frozen — 13 of 15 tests died with
`Cannot set property createAudioEngine of [object Module] which has only a getter`. That is a broken
test, not a RED one, and it would have read as RED at a glance. Replaced with `vi.mock` +
`vi.hoisted`; all 35 failures are now assertion failures on the behaviour under test.

**Handoff:** To Dev for implementation.

### Reviewer (audit)

**TEA — `FRAME_DURATIONS` from full extents, not `verbatim`** → ✓ **ACCEPTED.** Independently
re-derived at review by parsing `JOUSTRV4.SRC:8051-8131` and following `+$80` continuations:
`SNPCR1` :8116-8118 = 30+255+165 = **450**, `SNPTED` :8091-8093 = 15+15+7+7+90 = **134**, and the
other fifteen are single-row. The mutation battery confirms both are load-bearing rather than
decorative — truncating either to its cited row (30) reddens 2 tests each (M12, M13). This was the
most valuable finding of the story.

**TEA — arbitration spans channels** → ✓ **ACCEPTED**, and the fixture guard inside
`arbitrates ACROSS channels` (asserting the two channels really differ) is what stops the whole
refusal suite passing vacuously. Removing the cross-channel steal reddens 2 tests (M8).

**TEA — AC4's epic-description half left to review, not test-guarded** → ✓ **ACCEPTED**, and
DISCHARGED: `pf sprint story field jt5-5 description` now cites `:761-773` twice, and the single
surviving `:761-768` sits inside the clause explaining why that span is wrong. A permanent test over
sprint-tracking prose would have been the wrong instrument.

**Dev — `FRAME_DURATIONS` hand-transcribed rather than derived** → ✓ **ACCEPTED.** `CueSource`
holds one `Citation` and cannot express a multi-line extent, so deriving was not available without
reshaping all 17 records. Each entry carries its extent in a comment and the totals are pinned. The
structural fix is filed against jt5-6, which meets the same shape in `SNPCR2` (:8119-8121).

**Dev — five fakes/stubs gained `tick`** → ✓ **ACCEPTED**, and the reasoning is the important part:
`audio.tick?.()` would have let a production wiring that never ticks pass the entire suite. Verified
the ticks are unrecorded, so no "one effect per event kind" sweep was weakened — and confirmed by
mutation that the clock tests still bite (M10 ticking after the cues, M11 never ticking: 2 each).

**Dev — epic description gained a settled-rulings note beyond AC4** → ✓ **ACCEPTED.** Proportionate:
the field was being rewritten anyway and an unmarked either/or that has been decided is the
stale-description trap this epic has already been bitten by.

**UNDOCUMENTED (Reviewer) — AC1 names singular scalar fields; the code ships plural per-cue maps.**
AC1 says "adds two optional fields ... `priority?: number` and `frameDuration?: number`"; the
manifest actually gained `priorities?: Partial<Record<N, number>>` and `frameDurations?`. Neither
TEA nor Dev logged this. It is nonetheless CORRECT and I am not flagging it: a priority is a
property of a CUE, not of a cabinet, so scalars could not express joust's thirteen; TEA's tests
settled the shape and `sounds`/`channels` already establish the per-cue-map idiom. Severity: **Low**
— recorded only so the archive shows the AC's literal wording was superseded deliberately rather
than drifted past.

---

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shared/audio.ts` — optional `priorities`/`frameDurations` on the manifest, `tick()` on the
  engine, and the arbitration itself: one voice across channels, refuse-before-building, claim the
  voice only on a source that actually starts, release it on `stopLoop` and on window expiry.
- `plugins/joust/src/shell/audio.ts` — `PRIORITIES` (derived from `CUE_SOURCES`), `FRAME_DURATIONS`
  (transcribed at full table extent), both passed to the engine; the header rewritten from
  fence-to-mechanism; the SND extent corrected to `:761-773`; the unported `>=128` branch documented.
- `plugins/joust/src/shell/audio-dispatch.ts` — `playEventSounds` carries the frame clock, ticking
  once per call, before the frame's cues.
- `plugins/joust/docs/rom-study/claims/audio.json` — JT53-004 split; new JT55-001 cites the
  comparison that performs the refusal.
- `plugins/joust/tests/audio-rom-citations.test.ts` — the copied contract comment's `:761-772`.
- `plugins/joust/tests/{audio-dispatch,audio-flap,audio-thud}.test.ts`,
  `plugins/centipede/tests/audio-wiring.test.ts` — `tick` added to four fakes and one stub.
- `sprint/epic-jt5.yaml` — AC4's description half, plus the settled-rulings note.

**Tests:** **10821/10821 passing** (full `npx vitest run`, all apps) — joust 2049/2049,
shared 528/528, centipede 1033/1033. Orchestrator **358/358**. `npx tsc --noEmit` exits **0**.
`node scripts/build-app.mjs joust` builds clean. The joust citation gate verifies **911** claims,
including the new JT55-001 whose verbatim re-opens byte-exact against `SYSTEM.SRC:767`.

**Branch:** `main` (trunk-based) — commit `3262d56`.

### AC status

| AC | Status | Evidence |
|---|---|---|
| 1 optional + backward-compatible | met | six priority-free cabinets unchanged; centipede's 1033 and every other game's suite green with no edit beyond one test stub |
| 2 higher-or-equal interrupts, lower refused, only while the window runs | met | `src/shared/tests/audio-priority.test.ts` 27/27 |
| 3 joust wires priorities + full-table windows; the headline pin | met | `plugins/joust/tests/audio-priority.test.ts` 15/15 |
| 4 routine extent corrected everywhere | met | source guard 8/8; epic description rewritten (`:761-773` twice) |
| 5 JT53-004 fixed on both axes | met | split + re-cited to `SYSTEM.SRC:767`; the clause is now executed, not asserted |
| 6 `>=128` absent with the reason recorded | met | header comment names 128 and 100; source guard asserts no "Atari" misattribution |
| 7 no regressions, counts RISE | met | joust 2026 → 2049, shared 501 → 528, orchestrator 358 unchanged; lint and build clean |

### Two judgement calls worth the Reviewer's attention

**The interface widened rather than degraded.** `SoundPlayer` went from `Pick<AudioEngine, 'play'>`
to `Pick<AudioEngine, 'play' | 'tick'>`, which broke five existing fakes. The cheap fix was
`audio.tick?.()`; it was rejected because it would let a production wiring that never ticks pass
every test in the suite — the exact defect AC3's clock tests exist to catch. Fixing the fakes costs
five lines and keeps the failure mode impossible.

**The refusal happens before anything is built**, not by starting a source and stopping it. That is
what makes `a REFUSED cue is not merely muted` pass, and it also means a refused LOOP never registers
a pending start — so a low-priority loop requested during a high-priority window is dropped, not
parked to fire late. joust plays no loops, so nothing exercises that path today; it is the behaviour
the ROM implies (`SND` returns at `NOSND` having touched nothing) and it is worth a second opinion.

**Handoff:** To Reviewer (this workflow runs setup → red → green → review → finish; there is no
separate verify phase).
---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | run directly by the Reviewer, not spawned (see note); tests/lint/build/tree/debug-code all clean |
| 2 | reviewer-edge-hunter | Yes | findings | 2 | confirmed 1 (shared-channel silent window → jt5-15), dismissed 1 (negative counter — equivalent mutant) |
| 3 | reviewer-silent-failure-hunter | Yes | clean | none | the engine's silent-degrade is deliberate and pre-existing; the ONE new swallow-shaped path (refuse-before-build) is the specified behaviour |
| 4 | reviewer-test-analyzer | Yes | findings | 1 | confirmed 1 (a test named for a property it cannot observe) — FIXED in place |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (CHANNELS doc comment still asserted "unconditional steal") — FIXED in place |
| 6 | reviewer-type-design | Yes | clean | none | both new maps are `Partial<Record<N, number>>`, generic-keyed; `??` not `\|\|` on both lookups |
| 7 | reviewer-security | Yes | clean | none | no auth, tenancy, secrets, user input or network surface in the diff; the only I/O is the pre-existing sample fetch |
| 8 | reviewer-simplifier | Yes | clean | none | ~40 lines of logic across 3 state variables and one helper; no abstraction added beyond what the tests demand |
| 9 | reviewer-rule-checker | Yes | clean | none | see `### Rule Compliance` — the typescript checklist walked rule by rule |

**All received:** Yes (1 of 9 enabled; the other 8 are `false` in `workflow.reviewer_subagents`, so
their domains were assessed directly by the Reviewer rather than claimed as covered)

**Total findings:** 4 confirmed, 1 dismissed (with evidence), 0 deferred

> **How this table was produced, stated plainly.** `pf settings get workflow.reviewer_subagents`
> reports `preflight: true` and the other eight `false`. Per this project's standing instruction not
> to use the Agent tool unless asked, `reviewer-preflight` was not spawned either — its mechanical
> checks were run directly instead. So NO row above is a subagent's report. Each is the Reviewer's
> own assessment of that specialist's domain, which the agent definition requires when a specialist
> does not run ("you cannot claim coverage from a subagent that failed"). The substitute for the
> missing specialists was a **mutation battery**, below, because re-reading one's own diff reliably
> finds nothing.

### Mutation battery — 18 mutations, 17 caught, 1 survivor

With eight specialists disabled, the only trustworthy way to ask "can these tests fail?" is to break
the code and watch. Each mutation was applied to committed source, `--project shared --project joust`
was run, and the source restored.

| # | Mutation | Failing tests | |
|---|---|---|---|
| M1 | equal priority now REFUSED (`<` → `<=`, i.e. BLO → BLS) | 1 | caught |
| M2 | compare even with the window closed (`> 0` → `>= 0`) | 2 | caught |
| M3 | drop the window gate entirely | 2 | caught |
| M4 | `?? 0` → `\|\| 30` on the duration lookup | 2 | caught |
| M5 | claim the voice even when nothing started | 3 | caught |
| M6 | `tick()` no longer decrements | 5 | caught |
| M7 | `tick()` runs the counter negative (floor removed) | 0 | **SURVIVED** |
| M8 | no cross-channel steal on accept | 2 | caught |
| M9 | `stopLoop` no longer frees the voice | 1 | caught |
| M10 | joust ticks AFTER the frame's cues | 2 | caught |
| M11 | joust never ticks | 2 | caught |
| M12 | `SNPCR1` truncated to its cited row (450 → 30) | 2 | caught |
| M13 | `SNPTED` truncated to its cited row (134 → 30) | 2 | caught |
| M14 | `priorities` no longer passed to the engine | 7 | caught |
| M15 | `frameDurations` no longer passed | 7 | caught |
| M16 | `enemyThud` 31 → 30 (drops the `$00,1` extender) | 1 | caught |
| M17 | `enemyMaterialise` 91 → 90 | 1 | caught |
| M18 | `PRIORITIES` derived from the wrong field | 2 | caught |

**M7 is an equivalent mutant, not a hole.** A negative counter and a zero one cannot be told apart
through the public surface: every read is `voiceFrames > 0`, and an accept reassigns the field
outright, so the floor changes no observable behaviour. Confirmed by probe. The defect was therefore
in the TEST, which was named `the window does not go negative` — a property it cannot see. Renamed to
`over-ticking an idle voice leaves later arbitration intact`, with the equivalence recorded so the
next reader does not re-derive it. The floor stays in `tick()` as intent.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

| Rule | Instances in diff | Verdict |
|---|---|---|
| #1 type-safety escapes | `src/shared/audio.ts`: none. Tests: one `as unknown as ArbitratingEngine` in the shared suite | **compliant** — the engine source is clean (guarded by `audio-source-rules.test.ts`); the single test cast is documented and immediately repaid by `exposes tick() on the engine surface`, a RUNTIME check that the method the cast promises exists |
| #2 generic pitfalls | `priorities?`, `frameDurations?` | **compliant** — both `Partial<Record<N, number>>`, keyed by the generic; a `Record<string, number>` guard is now pinned in the suite |
| #3 enum anti-patterns | none in diff | n/a |
| #4 `\|\|` where `0` is valid | 2 lookups: `manifest.priorities?.[name]`, `manifest.frameDurations?.[name] ?? 0` | **compliant** — `??` used on both, and both directions are tested (`priority 0 is arbitrated as the LOWEST`, `duration 0 opens a window that is already closed`). M4 proves the test bites |
| #4 `Map.get()` unchecked | `live.get(channel)` (`stopChannel`), `buffers.get(file)` | **compliant** — both guarded (`if (!prev) return`, `if (!buffer)`); pre-existing, unchanged |
| #5 `.js` on relative imports | `audio-dispatch.ts`, the two new joust test files | **compliant** — `../src/shell/audio.js`, `../core/events.js` |
| #6 React/JSX | none | n/a |
| #7 async/promise | none added — every new path is synchronous | n/a |
| #8 test quality | 50 new tests | **compliant after one fix** — 15 pre-GREEN passes are each documented in-file with the wrong implementation they would catch; one overclaiming test name found and renamed; no `let _ =`, no `assert(true)` |
| #9 build/config | none | n/a |

### Observations

- `[VERIFIED]` **the clock actually runs in production, on every frame.** `src/main.ts:198` calls
  `playEventSounds(audio, game.events)` inside the `pumpFrames` callback, and it is the ONLY audio
  call site in joust besides `audio.resume()` at :174 (grepped). The call is unconditional, so a
  frame with no events still ticks — which matters, because a window must expire during silence.
  `audio-dispatch.ts:95` ticks before the loop, so the order is EXECST-then-SND. M11 (never tick)
  and M10 (tick last) both redden.
- `[VERIFIED]` **the timebase is the machine's.** `core/frame.ts:85`
  `FRAME_HZ = 8_000_000 / (512 * 260)` = 60.0962 Hz — the Williams 8 MHz clock over a 512x260
  raster — and `shell/timebase.ts:21` steps on exactly that. So the ROM's frame counts are the
  ROM's durations: `SNPCR1` 450 = 7.488s, `SNPDIE` 20 = 0.333s. This is what dismisses Dev's
  timebase Gap; it was anchored by jt1-1 before this story.
- `[VERIFIED]` **backward compatibility is real, not asserted.** Neither new key appears in any
  other game's `createAudioEngine` call (grepped all seven `plugins/*/src/shell/audio.ts`), and with
  `priorities` absent every new branch is gated behind `priority !== undefined`. The whole cabinet
  is green: 10821/10821 vitest, and centipede — the one other game touched — is 1033/1033.
- `[DOC]` **CONFIRMED and FIXED IN PLACE:** the `CHANNELS` doc comment
  (`plugins/joust/src/shell/audio.ts:118-124`) still read "the engine's *unconditional steal* can
  only ever replace a sound the machine would also have let through". After this story the steal for
  these cues is arbitrated, not unconditional — a false statement about the exact mechanism the
  story changed, sitting on the map whose role changed, and the first thing a reader of `CHANNELS`
  meets. Dev rewrote the file header to say the fence was superseded and left this one behind.
  Rewritten to say what is still true (the grouping is one channel per ROM priority, and the engine
  still routes by channel) and what is not (the channel no longer decides who wins).
- `[TEST]` **CONFIRMED and FIXED IN PLACE:** `the window does not go negative` named a property no
  test could observe (M7). Renamed; see the battery note.
- `[EDGE]` **CONFIRMED, filed as jt5-15:** an unarbitrated cue sharing the arbitrated voice's
  channel silences it without releasing its window. Reproduced. Unreachable in this tree.
- `[SIMPLE]` `[VERIFIED]` **no over-engineering.** Three module-scope variables, one four-line
  helper, four insertion points. No config, no strategy object, no per-channel arbitration groups —
  the machine has one voice and the code has one voice. `releaseVoice()` earns itself: three call
  sites, and M9 shows the `stopLoop` one is load-bearing.
- `[VERIFIED]` **the refusal leaves no trace, which is the subtle half.** The early return at
  `audio.ts:232` precedes the buffer lookup, so a refused cue creates no node AND registers no
  pending loop — a low-priority loop requested inside a high-priority window is dropped, not parked
  to fire late. That matches `SND` returning at `NOSND` having touched nothing. joust plays no
  loops so nothing exercises it today; flagged in Dev's assessment and I agree with the reading.
- `[VERIFIED]` **citations survive.** `plugins/joust/tools/audit/check-citations.mjs` verifies
  **911** claims including the new `JT55-001`, whose `verbatim` re-opens byte-exact against
  `SYSTEM.SRC:767`. The split is honest: `:8108` kept only the priority-006 fact it supports.
- `[VERIFIED]` **no debug code, clean tree.** `git diff` for the story contains no `console.log`,
  `debugger`, `TODO`, `.only(` or `.skip(`. The one working-tree change at review time was
  `complete-phase`'s own `status: in_review` stamp.

### Devil's Advocate

Argue this is broken. The strongest case starts where the story is proudest: the two multi-line
tables. 450 and 134 were derived by a script *I* also wrote, at review, from the same file — if the
`+$80` reading is wrong, TEA, Dev and Reviewer are all wrong together and the tests enshrine it. So
check it by hand rather than by rerunning the same parser. `SNPCR1` :8116 is `070,!N$12!+$80,30`;
`+$80` sets the MS bit; the header at :8046 says "IF M.S.BIT SET ON SOUND, SOUND,LENGTH" — another
pair follows. :8117 `!N$14!+$80,255` — set again, another follows. :8118 `!N$00!.$7F,165` — `.$7F`
masks the bit OFF, so the table ends. 30+255+165 = 450, and the ROM's own comments ("PLAYER FADING
IN") describe a long fade that 30 frames could not cover. It holds. Note also that `!N$00` is the
"DOES NOT DISTURBE THE SOUND, BUT EXTENDS TIMER" code, so those trailing 165 frames are *pure
window* with no new sound — which is precisely why the window and the audio are different lengths
and why Ruling 2 (frames, not `.wav` length) was right.

Where else could it hurt? A malicious or confused caller cannot reach much: there is no user input
here, no network beyond the pre-existing sample fetch, and `tick()` takes no argument. The
worst a caller can do is never tick — and then the first cue holds the voice forever and the game
goes silent after one sound. That is the scariest failure mode in this diff, it is a wiring error
rather than a logic one, and it is exactly what M11 covers. A stressed browser is the other angle:
if `decodeAudioData` never resolves, every cue is unloaded, no source starts, the voice is never
claimed, and the game is silent but not stuck — verified by the load-failure test.

The honest residual risk is aesthetic and unmeasurable here: a 450-frame window means a transporter
materialise refuses almost everything for 7.5 seconds, including a player death at priority 80
(70 < 80, so *that* one gets through — but eggs at 45 and thuds at 20 do not). That is what the
machine did, and jt5-2 has not baked a sample to listen to, so nobody has actually *heard* it. It is
faithful by construction and unverified by ear. I am approving on the ROM, not on the sound, and
that limit belongs in the record.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** core emits `game.events` (pure sim) → `pumpFrames` steps once per 1/60.0962s
→ `playEventSounds` ticks the voice, then maps each moment to a `SoundName` → `audio.play(cue)` →
the shared engine looks up `priorities[cue]`, refuses if strictly lower than a voice still inside
its window, otherwise steals the voice across channels, starts the buffer, and re-arms the window
from `frameDurations[cue]`. Safe because every step is total: an unknown kind returns `null` behind
the `never` guard, an unloaded sample no-ops without claiming the voice, and no path throws.

**Pattern observed:** derive-don't-retype — `PRIORITIES` is built from `CUE_SOURCES`
(`plugins/joust/src/shell/audio.ts:434-441`) so the priority has exactly one spelling in the repo,
and M18 proves the tests would catch a wrong derivation. `FRAME_DURATIONS` could not follow the
pattern and the comment above it explains why, which is the right way to depart from one.

**Error handling:** unchanged and still total — `src/shared/audio.ts:257` swallows a `createBufferSource`
failure so one bad sound cannot crash a frame, and the new state is written only inside that `try`
after `source.start()` returns, so a throw leaves the voice unclaimed rather than half-claimed.

**Findings:** 2 fixed in place (a stale comment, an overclaiming test name — both prose, the class
this epic has spent three prior review rounds on, and neither worth a rework cycle), 1 filed as
**jt5-15** (unreachable today), 1 dismissed with line-level evidence. No Critical, no High.

**Handoff:** To SM for finish-story
---

## Impact Summary

**Blocking:** 0 blocking items. One review round, APPROVED at round 1; no finding was ever raised
as blocking, so nothing here is a reopened or stale objection.

**What shipped.** The shared SFX engine learned to REFUSE a sound. `src/shared/audio.ts` gained two
optional manifest maps (`priorities`, `frameDurations`) and a `tick()`, implementing joust's
single-voice priority arbitration from `SND` (`SYSTEM.SRC:761-773`): a strictly lower priority is
refused while a sounding cue's frame window is still open, equal-or-higher interrupts, and with the
window closed no comparison happens at all. Arbitrated cues share ONE voice across channels, because
the machine has one. joust passes all 17 priorities (derived from `CUE_SOURCES`) and all 17 frame
windows, and `playEventSounds` carries the clock at the machine's own cadence and order.

**The finding that mattered most.** The story's stated method — read each cue's duration off its
cited `verbatim` row — is wrong for two of the seventeen, and wrong silently. A pair whose code
carries `+$80` is followed by another, possibly on the next ROM line (`JOUSTRV4.SRC:8045-8049`), so
`SNPCR1` is `:8116-8118` = **450** frames and `SNPTED` is `:8091-8093` = **134**, where both cited
rows parse cleanly to **30**. Byte-perfect citations carrying a 15x-wrong reading; the citation gate
cannot see it, because it re-opens the quoted line and not the claim. Caught in RED, pinned by a test
that fails specifically against the single-line shortcut, and confirmed at review by hand.

### Every finding's disposition

| Finding | Raised by | Disposition |
|---|---|---|
| Multi-line tables are a general hazard; `CueSource` cannot express an extent | TEA, Dev, Reviewer (all three) | **owned by jt5-6** — and jt5-6's description was EXTENDED at finish to carry the `+$80` rule, both tables' real extents, and the instruction to fold `FRAME_DURATIONS` back into `CueSource`. An owner that does not know the finding is not an owner. |
| Unarbitrated cue on the arbitrated voice's channel silences it without releasing the window | Reviewer | **filed as jt5-15** (2pt, p3, `repos: arcade`). Reproduced; unreachable in this tree. |
| joust's `CHANNELS` map is now vestigial for arbitrated cues | TEA, Dev | **resolved in-story** — the Reviewer found its doc comment still asserted an "unconditional steal" and rewrote it. The map stays: the engine still routes by channel. No story needed. |
| Nothing anchors joust's frame to the machine's frame | TEA, Dev | **dismissed with evidence** — `core/frame.ts:85` already derives `FRAME_HZ = 8_000_000/(512*260)` = 60.0962 Hz from the Williams raster, and `pumpFrames` steps on it. `SNPCR1`'s 450 frames = 7.488s. Anchored by jt1-1, before this story. |
| A test named for a property it cannot observe | Reviewer (mutation M7) | **fixed in place**, renamed, with the equivalence recorded. |

Nothing was descoped without an owner: two findings point at **jt5-6**, one is **jt5-15**, one was
fixed here, one was refuted.

**Verification at finish.** `npx tsc --noEmit` exits 0; `npx vitest run` 10821/10821 across all apps;
`npm run test:orchestrator` 359/359; `just build-all` clean; 911 joust citation claims verified;
working tree clean, no open PRs, nothing unpushed.

**One thing the record should not hide.** A sibling ran `just release-all` mid-review, so
`joust-v0.0.12` already contains and deployed this arbitration. The review round landed after that
tag, but `git diff joust-v0.0.12..HEAD -- plugins/joust/src src/shared/audio.ts` changes **no
non-comment source line**, so production behaviour matches `main` and no re-release is needed.

**And the honest limit.** This is approved on the ROM, not on the sound. jt5-2 has baked no samples,
so no window has ever been heard — a 450-frame transporter cue is faithful by construction and
unverified by ear.
