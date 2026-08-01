# Story jt5-5: Sound PRIORITY arbitration — @shared/audio steals, the machine refuses

## Summary

Joust's sound subsystem must implement the machine's single-voice priority arbitration. The ROM rejects interruptions from lower-priority cues while a higher-priority cue is sounding within its frame-duration window. The shared audio engine has no priority notion and always steals (last-write-wins). This story adds optional priority and frame-duration fields to `src/shared/audio.ts` and wires joust's already-recorded priorities through.

## Background

> ⚠ **CORRECTIONS BELOW: The epic description is PARTLY WRONG.** Facts verified against JOUSTRV4.SRC. Read the numbered corrections (R1-R5) alongside the problem statement.

### The Problem

Joust's machine has **ONE sound voice arbitrated by PRIORITY**. The SND routine compares an incoming priority byte against the sounding cue's recorded priority:

```
SYSTEM.SRC:765-768  (byte-exact; the misspellings are Williams's own)
765: 1$	LDB	STMR		SOUND STILL SOUNDING
766: 	BEQ	SN1NS		 BR=NO SOUND
767: 	CMPA	SPRI		OK TO INTERUPT THIS PIRORITY SOUND?
768: 	BLO	NOSND		 BR=NO
```

**If the new priority is higher-or-equal, the old cue is interrupted; if lower, it is refused.** The interruption window is a **frame countdown** (`STMR`), not the .wav's playback length.

The shared engine's channels have no priority concept and always steal (last-write-wins on a channel). joust currently maps each distinct ROM priority to its own channel, a fence that prevents lower priorities from interrupting higher ones — but it does not implement the mechanism. A priority-40 `enemyDeath` and a priority-80 `playerDeath` sit on different channels today, so neither can refuse the other. That is a lucky accident, not the machine's algorithm.

### The ROM Mechanism (`reference/williams-source/joust/SYSTEM.SRC:761-773`)

Reproduced BYTE-EXACT. Williams's own misspellings (`PIRORITY`, `INTERUPT`) are theirs — do not
silently correct them when quoting, and note that `:764` and `:773` carry no trailing comment:

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

The key sequences:

1. **:765-768 (`1$` to the `BLO`):** the comparison runs ONLY if `STMR != 0` (something is
   sounding). `BLO` refuses a strictly-lower priority; equal-or-higher falls through and is accepted.

2. **:769-772 (`SN1NS`, the acceptance path), and read `:770-771` carefully.** `STA STMR` stores the
   **constant 1** loaded at :770 — it does NOT store the table's duration byte. The real duration
   arrives a frame later from `EXECST` at `:183` (`STB STMR`, where B came from `LDD ,X++` at :179).
   So the accept path arms a 1-frame tick that causes the sender to fetch the table's first
   (code, duration) pair on the very next frame. A port that seeds the window with the duration at
   accept-time gets the first frame's window wrong.

3. **`EXECST` frame routine (`SYSTEM.SRC:173-187`):** each frame, if `STMR != 0`, `DEC STMR`
   (:175). Only when it reaches 0 does the sender load `SNDPTR` (:177) and pull the next
   `(code, duration)` pair (:179). `SNDPTR` is zeroed (:181) only when the fetched pair's
   continuation bit is CLEAR (`BMI 1$` at :180) — i.e. at the END of the table, not on every
   expiry. Once the table ends, `STMR` runs down and stays 0, so `STMR == 0` ⟺ nothing sounding,
   and the next incoming sound is accepted unconditionally.

> ⚠ **R1 — ROUTINE EXTENT IS TRUNCATED:** The epic description cites `:761-768` as "the surrounding routine". That is only the REFUSAL half. The full routine is `:761-773`, including the ACCEPTANCE path. This repo has been burned three times by truncated extent citations that manufacture corroboration. The shipped comment at `plugins/joust/src/shell/audio.ts:164` also cites `:761-772`, missing the NOSND RTS.

> ⚠ **R2 — THE WINDOW GATE IS EXPLICIT:** If `STMR == 0`, the priority comparison is SKIPPED entirely (`:766 BEQ SN1NS`). The machine's interruption window is therefore a **frame countdown**, not "for as long as audio is audible". STMR is seeded from the ROM table's duration byte and decremented each frame by EXECST.

> ⚠ **R3 — BLO IS UNSIGNED:** Branch if Lower (unsigned). An EQUAL priority interrupts. A test must pin this — "refuses a lower priority" is correct, "refuses an equal one" would be wrong.

> ⚠ **R4 — >=128 PATH IS DEAD FOR JOUST:** the `BMI 1$` at `SYSTEM.SRC:762` ONLY skips the end-of-game mute at :763-764; it does NOT bypass the priority comparison at :765-768. The 13 distinct priorities actually recorded in `CUE_SOURCES` are **6, 9, 10, 20, 40, 45, 50, 65, 66, 67, 70, 80, 100** — max 100, so the >=128 branch is unreachable for joust's cue set and the shared engine deliberately omits it. (For orientation: 6 = enemy wing pair, 10 = player wing pair, 9/20 = enemy/player thud, 40/80 = enemy/player death, 100 = `extraMan`/`SNREPL`.)

### Why This Matters Now (User Ruling Context)

**User Ruling 1:** The arbitration goes in `src/shared/audio.ts`, NOT in a joust-side wrapper. This is a deliberate override of CLAUDE.md:337 ("Extract into src/shared only once a second game proves the duplication is real"). The user chose it with the census in hand: zero other games need priority (battlezone has 13 imports but zero priority references; same for star-wars, tempest, asteroids, red-baron, centipede). **This addition MUST be optional and backward-compatible** — the six games that pass no priority keep today's always-steal behaviour, proven by test.

**User Ruling 2:** The window is a **ROM frame duration**, not the .wav's playback length. jt5-2 (samples) is still backlog, so a playback-length window cannot exist yet. The frame-count window is deterministic and testable with no audio decode. **CONSEQUENCE:** The shared engine has NO clock today. Adding a frame-duration window needs a new tick/advance entry point callers must invoke every frame.

### The Current Port State

**From jt5-1 (shipped):**
- `plugins/joust/src/shell/audio.ts` has a SOUNDS manifest mapping logical names to baked filenames
- CHANNELS map gives each distinct ROM priority its own voice
- CUE_SOURCES records 17 cues across 13 distinct priorities (player wing 010, enemy wing 006, enemy death 040, player death 080, player thud 020, enemy thud 009, egg-laid 001, egg-collected 002, etc.)

**Problem:** The CHANNELS fence prevents lower priorities from interrupting, but it does NOT model the machine's algorithm. If a priority-40 cue and a priority-80 cue were on the SAME channel (as they should be on a real machine), the port's implementation would steal on both, whereas the ROM refuses the 40 to the 80.

### Priorities Recorded in CUE_SOURCES

Verified against JOUSTRV4.SRC:8051-8131 (the sound table):

```
Priority 001: egg-laid       (nest, SNELYD :8112)
Priority 002: egg-collected  (grab, SNECRE :8117)
Priority 006: enemy wing     (buzzard SNELWD :8108, SNELWU :8107)
Priority 009: enemy thud     (SNETHD :8106)
Priority 010: player wing    (knight SNPLWD :8126, SNPLWU :8125)
Priority 020: player thud    (SNPTHD :8124)
Priority 040: enemy death    (buzzard SNEDIE :8116)
Priority 050: wave clear     (SNEWVE :8120)
Priority 060: player 2 materialise (SNPCR2 :8119)
Priority 070: player 1 materialise (SNPCR1 :8116)
Priority 080: player death   (knight SNPDIE :8115)
Priority 100: lava troll grab (SNEGRO :8121)
```

**HIGHEST PRIORITY IS 100.** The >=128 high-byte path is dead code.

### Frame Durations (Parsed from ROM Verbatim Strings)

Each sound table entry is `FCB priority, sound_code_pairs…` where each pair is `code, duration_frames`. Example:

```
:8126  SNPLWD  FCB 010,!N$20!.$7F,90     PLAYERS WING DOWN SOUND
       → priority 010, duration 90 frames

:8107  SNELWU  FCB 006,!N$21!.$7F,60    ENEMIES WING UP SOUND
       → priority 006, duration 60 frames
```

> ⚠ **R5 — DURATIONS LIVE ONLY IN VERBATIM STRINGS:** CueSource has a `priority` field. The durations are embedded in the table's `verbatim` string (the `!N$XX! … , YY` pairs). Parsing them requires a regex that extracts the duration bytes from the FCB definition. If a cue has no `verbatim` entry (i.e., is marked an invention), its `frameDuration` is undefined — it behaves like the six games that pass no priority (always steals).

## Acceptance Criteria (DERIVED — the epic YAML holds none)

> ⚠ **CORRECTION (TEA, RED phase 2026-08-01) — AC3's stated METHOD is refuted for 2 of the 17 cues.**
> The AC text below is reproduced **verbatim and has not been edited**; read this note with it.
> AC3 says the frame durations "must come from the ROM sound-table `verbatim` strings, the ONLY
> place they exist today". That holds for 15 cues and is **wrong for two**, silently:
> the table format header (`JOUSTRV4.SRC:8045-8049`) states *"IF M.S.BIT SET ON SOUND,
> SOUND,LENGTH"* — a pair whose code carries `+$80` is followed by another, which the assembler may
> place on the **next line**. `SNPCR1` (`playerMaterialise`) runs `:8116-8118` and is
> 30+255+165 = **450** frames; `SNPTED` (`pteroDeath`) runs `:8091-8093` and is 15+15+7+7+90 =
> **134**. Both cited rows parse cleanly to **30**, and both are byte-perfect — the citation gate
> re-opens the quoted line and cannot see that a reading of it is 15x short.
> **Take durations from each table's FULL extent**, following `+$80` continuations across lines.
> `does NOT truncate the two multi-line tables to their cited row` in
> `plugins/joust/tests/audio-priority.test.ts` fails specifically against the verbatim-only method.
> Full entry — with the second deviation (arbitration must span channels, not sit inside one) and
> the third (AC4's epic-description half is review-verified rather than test-guarded) — in
> `.session/jt5-5-session.md` → **Design Deviations → TEA (test design)**.

1. **Optional priority + optional frame-duration on the shared engine's manifest, additive and backward-compatible.** `src/shared/audio.ts` adds two optional fields to the sound manifest shape: `priority?: number` and `frameDuration?: number`. These fields are optional; the six games that pass neither (tempest, asteroids, battlezone, red-baron, centipede, star-wars) keep today's always-steal behaviour, proven by a test that replays a known scenario and asserts no behaviour change. Only joust provides these fields.

2. **Priority comparison gates channel occupation only while the frame window runs.** When `frameDuration` is set on a sounding cue, its frame countdown (`STMR` in the ROM, a per-frame decrement seeded from the duration) gates the priority comparison. A higher-or-EQUAL incoming priority DOES interrupt; a strictly-lower one is REFUSED. Once the frame window expires (`frameDuration` countdown reaches 0), ANY priority interrupts unconditionally — the machine's `STMR == 0` path. A test pins that a priority-40 cue running for 20 frames refuses a lower-priority sound for those 20 frames, then accepts it on frame 21.

3. **joust wires its already-recorded priorities and frame durations through.** `plugins/joust/src/shell/audio.ts` already records all 13 distinct priorities in `CUE_SOURCES`; the frame durations must come from the ROM sound-table `verbatim` strings, the ONLY place they exist today (`CueSource` has a `priority` field but NO duration field). The row format is `<priority>,<code>,<duration>`, so `SNEDIE FCB 040,!N$16!.$7F,20` is priority **40** / **20 frames** and `SNPDIE FCB 080,!N$16!.$7F,20` is priority **80** / **20 frames**. The concrete pin is the epic's own headline case: while a priority-80 `playerDeath` is still inside its 20-frame window a priority-40 `enemyDeath` is REFUSED, and on the frame after that window expires the same `enemyDeath` is ACCEPTED. Two traps measured at setup: a cue's priority is NOT its duration (different columns of the same row), and 80 is NOT the maximum — `extraMan`/`SNREPL` (:8089) is priority **100**. The full set is 6, 9, 10, 20, 40, 45, 50, 65, 66, 67, 70, 80, 100.

4. **The SYSTEM.SRC routine extent is corrected everywhere.** The epic description's routine citation `:761-768` is INCOMPLETE and WRONG. The full `SND` routine is `SYSTEM.SRC:761-773`, including the acceptance path (:769-773). The shipped comment at `plugins/joust/src/shell/audio.ts:164` also cites `:761-772` (missing NOSND/RTS). Both become `SYSTEM.SRC:761-773` — word for word identical.

5. **Claim JT53-004 is fixed on BOTH axes: re-cited and verified.** The claim in `plugins/joust/docs/rom-study/claims/audio.json` asserts "SNELWD priority 006 sits below the player wing pair's 010, so a buzzard's wingbeat never steals the knight's own". (i) **RE-CITE onto the mechanism:** the current cite (:8108) is a table-definition row that cannot support a consequence about refusal windows. The cite becomes the mechanism that implements refusal: `SYSTEM.SRC:761-773` (the SND routine and its STMR window gate). (ii) **VERIFY the clause, not merely assert it:** once this story lands the arbitration logic, the claim becomes testable in the port. A test proves that during an active priority-80 playerDeath window, a priority-06 enemyWingDown CANNOT interrupt. The citation gate re-opens only quoted lines and cannot see a claim's body — the gate going green is NOT evidence here. Build the verification test explicitly. **Schema constraint measured at setup:** all 27 claims in `audio.json` carry `source.line` as a single **int**, so a RANGE cite (`:761-773`) is not expressible in that field — cite ONE line (`:767`, the `CMPA SPRI` row, is the natural anchor) and carry the extent in the claim body. `SYSTEM.SRC` is already an accepted `source.file` in that set alongside `JOUSTRV4.SRC`, so the file swap itself is safe. Splitting into two claims (keep :8108 for the priority-006 fact it genuinely supports; add a new claim for the never-steals consequence anchored on the mechanism) is open to TEA — the AC requires the consequence stop resting on :8108, not a specific edit shape.

6. **The >=128 "always sent" path is deliberately absent, with reason recorded.** `SYSTEM.SRC:762`'s `BMI 1$   SOUND PIRORITYS OF 128 TO 255 ARE ALWAYS SENT` skips only the end-of-game mute at :763-764 (`LDB GOVER / BPL NOSND`) — it does NOT bypass the priority comparison at :765-768. It is dead for joust's cue set because the highest recorded priority is 100. The shared engine omits this path; record why in a comment: joust's maximum priority is 100, so the >=128 branch is an unreachable **Williams** system-ROM safeguard (joust is a Williams title, not Atari), omitted as dead code rather than overlooked.

7. **No regressions.** The joust vitest project and the orchestrator suite both stay green with zero failures — baseline measured at setup: **2026** (`npx vitest run --project joust`) and **358** (`npm run test:orchestrator`). This story ADDS tests, so those counts must RISE, never merely match. Lint clean (`npm run lint`), build clean, no debug code.

## Known Hazards

### Hazard A — The Shared Engine Has NO Clock Today
`src/shared/audio.ts` is event-driven and has no frame-tick mechanism. Implementing frame-duration windows requires adding a new entry point (e.g., `tick()` or `advance(frameDurationMs)`) that callers must invoke every frame. joust will call it; every other game that ignores the priority/frameDuration fields keeps working as-is.

### Hazard B — User's Deliberate Override of CLAUDE.md:337
The addition is optional and backward-compatible, but it violates the shared-extraction threshold (no other game needs priority). User accepted this override consciously with the census in hand.

### Hazard C — Claim JT53-004 Cannot Be Verified by Citation Gate Alone
The claim's body says something stronger than what its cited line can prove. A test is required to verify the clause, not just assert it. The gate going green is NOT evidence here.

## Related Stories

- **jt5-1** (upstream, shipped): seam scaffolding (manifest, dispatch, guard forbids lower-priority cues until emitters exist)
- **jt5-2** (downstream, backlog): samples and R2 upload
- **jt5-3** (sibling, shipped): wing edge detector and four new event kinds
- **jt5-4** (sibling, shipped): thud cues (collision physics + sound)

## Repos
- arcade (monorepo: plugins/joust/src/shell/audio.ts, src/shared/audio.ts, plugins/joust/tests/)

## Technical Approach & Scope

### In Scope (Load-Bearing)
1. Add `priority?: number` and `frameDuration?: number` fields to the shared engine's sound manifest schema
2. Implement a frame-window gate: when frameDuration is set, only allow interruption if incoming priority >= sounding priority
3. Add a tick/advance entry point to the shared engine so callers can decrement frame counters
4. Wire joust's CUE_SOURCES to populate both fields from the ROM sound tables
5. Test the priority arbitration explicitly: higher-or-equal interrupts, lower refuses (while window is open)
6. Correct the SYSTEM.SRC citation from :761-768 to :761-773 in epic description and shipped comments
7. Re-cite claim JT53-004 onto :761-773 and add a verification test

### Out of Scope (Described in Related Stories)
- Changing the channel map strategy (that stays as-is while this story runs)
- Synthesizing .wav files (jt5-2)
- Extending this to any game beyond joust (backward compatibility is the gate)

## Definitions

- **Priority arbitration window:** The frame countdown (`STMR` in the ROM, `frameDuration` in the port) during which a sounding cue can refuse lower-priority interruptions
- **STMR / frame-duration countdown:** A per-frame counter seeded from the ROM sound table's duration byte, decremented each frame by the EXECST routine. When it reaches 0, the sounding cue expires and ANY priority is accepted.
- **BLO (Branch if Lower, unsigned):** A priority-equal to the sounding cue's DOES interrupt; only strictly-lower priorities are refused
- **Backward-compatible:** Any game that passes no `priority` and no `frameDuration` behaves exactly as it does today (always steals)
