# Story jt5-3: The FLAP — the two-edge wing cue, and the release-edge detector the core lacks

## Summary
Joust's signature sound is a two-edge cue that plays on both the press AND release of the flap button. The current core detects press edges but lacks state to detect falling (release) edges. This story adds a release-edge detector to src/core and emits two new event kinds per party (player wing-down, player wing-up, enemy wing-down, enemy wing-up).

## Background

### The ROM Mechanism (from JOUSTRV4.SRC, verified)

Joust uses a **two-loop coroutine** for each airborne bird, not a per-frame edge test:

1. **FLAPLP** (:6163-6180) — "WINGS ARE DOWN LOOP (FLAP PRESSED)"
   - At :6168-6169 checks if button still held; if released → GOFLIP
   - At :6170 `FLAPS2` label (below the sound cue)

2. **GOFLIP** (:6182-6184) — Plays wing-UP sound on the RELEASE edge
   - `LDX PDECSN,U / LDX DSNWU,X / JSR VSND`
   - Branches into FLIPLP

3. **FLIPLP** (:6190-6210) — "WINGS ARE UP LOOP (FLAP RELEASED)"
   - At :6195-6196 checks if button still pressed; if pressed → GOFLAP
   - At :6197 `FLIPS2` label (below the sound cue)

4. **GOFLAP** (:6212) → **FLAST2** (:6216-6218) — Plays wing-DOWN sound on the PRESS edge
   - `LDX PDECSN,U / LDX DSNWD,X / JSR VSND`
   - Branches into FLAPLP

**Edge-to-Cue Mapping:**
- **PRESS** (flapHeld transitions false → true) → DSNWD (wing DOWN sound)
- **RELEASE** (flapHeld transitions true → false) → DSNWU (wing UP sound)

### The Four ROM Sound Tables
All are stored per-species (player vs enemy) via the decision block's DSNWU/DSNWD offsets:

```
:8125  SNPLWU  FCB  010,!N$21!.$7F,90    PLAYERS WING UP SOUND     (priority 010)
:8126  SNPLWD  FCB  010,!N$20!.$7F,90    PLAYERS WING DOWN SOUND   (priority 010)
:8107  SNELWU  FCB  006,!N$21!.$7F,60    ENEMIES WING UP SOUND     (priority 006)
:8108  SNELWD  FCB  006,!N$20!.$7F,60    ENEMIES WING DOWN SOUND   (priority 006)
```

The priority bytes (player 010, enemy 006) belong in jt5-3's CUE_SOURCES (jt5-5 handles arbitration).

### Current Core State
The core already receives **both**:
- `input.flap` — the **rising edge** (press) via shell input.ts:45 (`flap: flapHeld && !prevFlap`)
- `input.flapHeld` — the **level** (current state) consumed at flight.ts:292 for gravity logic

The **gap**: the core persists no previous-frame `flapHeld` level in state, so it cannot compute the **falling edge** (held → released). This story adds that detector.

### Why No Sound on Take-Off
At flight entry (:6154-6157), the ROM branches directly to FLAPS2 (below FLAPLP's cue) or FLIPS2 (below FLIPLP's cue), skipping both GOFLIP and GOFLAP sound cues. A naive detector that emits on the first frame of flight would **over-fire** relative to the ROM. The initial wing state is selected without a cue.

### The 1982 Typo (confirmed, three corroborations)
:6217 reads `LDX DSNWD,X    GET WING UP SOUND` — **trust the symbol DSNWD, not the comment**. The comment is a copy-paste of :6183's, which is genuinely DSNWU. Corroborated by:
- :118-119 RMB declarations (DSNWU vs DSNWD)
- :8125-8126 / :8107-8108 table comments
- The control flow (FLIPLP branches to GOFLIP on button press, which reads DSNWU)

**Cite the symbol, not the comment line.**

## Acceptance Criteria (DERIVED — the epic YAML holds none)

1. **Core sees both edges.** The core adds a previous-frame `flapHeld` field to `FlightState`, captures it on every step, and uses it to detect the falling edge. A test pins that a press (false → true) and release (true → false) are computed correctly on their respective frames.

2. **Four event kinds emitted per party.** The core emits `EventKind` discriminated union with four new values: `player-wing-down`, `player-wing-up`, `enemy-wing-down`, `enemy-wing-up`. Each is emitted ONLY on its transition (no per-frame re-emission). A test stages a flap sequence and asserts the cues appear on the exact frames of the edges.

> ⚠ **AC-3 IS REFUTED — do not implement it.** TEA re-opened the ROM during RED
> and found the opposite. `STFLY` ("START TO FLY", :6123) ends
> `INC PACCX,U   MAKE WINGS SHOW UP (1 FRAME), THEN DOWN` (:6134) followed by
> `JMP FLAST2` (:6135) — a jump straight onto the wing-down `JSR VSND` at
> :6216-6218. **Taking off DOES play the wing-down cue.** The silent routine is
> `STFALL` ("START TO FALL", :6139), whose tail at :6154-6157 branches to
> `FLAPS2`/`FLIPS2`, the labels below each loop's `JSR VSND` — that is a bird
> walking off a cliff, not one taking off. SM's setup brief quoted STFALL's tail
> and mislabelled it take-off; the error is SM's, not the story's. The AC text
> below is left unedited so the record shows what was proposed and what replaced
> it. The binding version is in the session file's Design Deviations, and the
> RED tests in `plugins/joust/tests/audio-flap.test.ts` encode the corrected
> behaviour.

3. **No cue on take-off.** The first frame of flight (transition from grounded to airborne) does NOT emit a wing cue, regardless of button state. A test pins that a player entering flight mid-flap generates the step result without a wing event on frame 1.

4. **Four-cue emission sequence is correct.** A test sequences press → release → press → release and asserts the exact order and frames of the four cues: wing-down, wing-up, wing-down, wing-up.

5. **Enemy edge detection works despite inverted input model.** The enemy's `flapHeld` in `PlayerInput` is assigned `decision.flap` (the **edge**, not the **level**). Despite this, the falling-edge detector must still emit correctly on the frame when `decision.flap` transitions from `true` to `false`. A test pins that an enemy with repeated single-frame flaps emits wing-down on odd frames and wing-up on the following frame (not a machine-gun pair).

6. **The audio-events.test.ts guard updates.** The guard at audio-events.test.ts:229 forbids `'player-flap', 'enemy-flap', 'flap'` because their emitters did not exist at jt5-1 close. This story creates them. The guard entries for these three kinds must be **removed** (they belong to the deferred list while the emitters are absent, and must leave it when the emitters are live). A test going red here is the EXPECTED signal, not a regression.

7. **Citations are pinned.** Every cue in CUE_SOURCES either cites JOUSTRV4.SRC with the correct line extents or is explicitly marked an invention. Use :6212-6218 for GOFLAP (not :6207-6218). Use :6182-6184 for GOFLIP.

## Known Hazards

### Hazard A — Enemy flapHeld is an Edge, Not a Level
**Location:** plugins/joust/src/core/enemy.ts:540
```javascript
const input: PlayerInput = { dir: decision.dir, flap: decision.flap, flapHeld: decision.flap }
```
The enemy's `flapHeld` is assigned its press **edge**, not the **level**. The falling-edge detector would therefore emit `enemy wing-up` on the frame immediately after every single `enemy wing-down` — a machine-gun pair every frame, not a wingbeat.

**The real machine holds enemy wings down for a duration** (same FLAPLP/FLIPLP loops as the player). This is a **live fidelity question**, not a detail. The story must either:
- Correct the enemy input model to track and emit the true level, OR
- Prove that the enemy does machine-gun and the ROM accepts it, OR
- Derive the falling edge from the ROM's own sequencing (not from the input level)

**Do NOT pre-judge which way it resolves.** TEA must confront it in RED rather than discover it at review.

### Hazard B — jt5-1's Guard Will Go RED
**Location:** plugins/joust/tests/audio-events.test.ts:229
```javascript
const deferred = ['player-flap', 'enemy-flap', 'flap', 'player-thud', 'enemy-thud', 'thud', 'troll-grab']
```
This guard forbids a cue name whose emitter does not exist. jt5-3 creates the flap emitters, so `'player-flap'`, `'enemy-flap'`, and `'flap'` entries must come out of the deferred list.

**A red here mid-story is the EXPECTED signal**, not a regression. A Dev who "fixes" it by renaming the new kinds to dodge the list would satisfy the guard and fail the story. The AC explicitly requires this list to be updated.

The `'player-thud'`, `'enemy-thud'`, `'thud'`, and `'troll-grab'` entries stay (they belong to jt5-4 and uf1-10/uf1-11).

### Hazard C — The Seam Suite Cannot See Emitters (Confirmed on jt5-1)
**Facts:** The three-file audio seam (manifest, dispatch, coverage) all read the same `EVENT_KINDS` tuple. They agree with each other whether or not any event ever fires. Six of jt5-1's eleven cues could be deleted with the suite fully green.

**So a declared-and-mapped kind proves NOTHING.** This story's tests must **pin the EMISSION**:
- Stage the input sequence
- Assert the cue **appears on the exact frame** of the edge
- Assert the **moment BEFORE** is clean

An assertion that merely finds the kind in the manifest or dispatch is vacuous here.

## Repos
- arcade (monorepo: plugins/joust/src/core/, plugins/joust/src/shell/, plugins/joust/tests/)

## Related Stories
- **jt5-1** (upstream, shipped): seam scaffolding; guard forbids the flap kinds until emitters exist
- **jt5-2** (downstream): record/synthesise the four samples and upload
- **jt5-4** (sibling): thud cues (collision physics + sound)
- **jt5-5** (sibling): priority arbitration (machine's single voice, shared engine's multi-channel)
- **jt5-6** (sibling): player-2 transporter cue separate from player-1's

## Definitions
- **Rising edge (press):** flapHeld transitions from false → true
- **Falling edge (release):** flapHeld transitions from true → false
- **Coroutine:** ROM holds per-bird state in two mutually exclusive loops; the transition between them is the cue trigger
- **Species:** player vs enemy; the sound tables are species-indexed
