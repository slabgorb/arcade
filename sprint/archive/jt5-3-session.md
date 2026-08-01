---
story_id: "jt5-3"
jira_key: "jt5-3"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-3: The FLAP — the two-edge wing cue, and the release-edge detector the core lacks

## Story Details
- **ID:** jt5-3
- **Jira Key:** jt5-3
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T10:16:31Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T09:04:53Z | 2026-08-01T09:06:53Z | 2m |
| red | 2026-08-01T09:06:53Z | 2026-08-01T09:35:21Z | 28m 28s |
| green | 2026-08-01T09:35:21Z | 2026-08-01T10:00:49Z | 25m 28s |
| review | 2026-08-01T10:00:49Z | 2026-08-01T10:16:31Z | 15m 42s |
| finish | 2026-08-01T10:16:31Z | - | - |

## Delivery Findings

### TEA (test design)

- **Gap** (non-blocking): the enemy brains hold no wing-down TIMER, and the ROM's
  do. `CURJOY+1` is latched across wakes on the real machine — dumb LINET for
  exactly one wake (`LNTUP LDD #LNTOFP / LDB #1`, JOUSTRV4.SRC:3746-3748, then
  `LNTOFP LDD #LINET / CLRB`, :3759-3762) and BOUNDR/B2UNDR for `BOUPWD` wakes
  through `PJOYT`, whose own comment is "WING DOWN TIME" (`LDA BOUPWD / BOUP12
  STA PJOYT,U`, :3864-3865), followed by a mandatory `BOUPWU` wakes up
  (:3894). Those are DYTBL rows — BOUPWD 3/2/1 and BOUPWU 10/8/6 by difficulty
  (:7314-7315). Our `linet()` (enemy.ts:229-234) and `smartDecision()`
  (enemy.ts:328-335) recompute a CONDITION every wake and latch nothing, so a
  spent buzzard (timeUp 255, impulse −1) holds its wings down indefinitely while
  a fresh one alternates only by accident of the physics. Affects
  `plugins/joust/src/core/enemy.ts` (a `pjoyt` field on `EnemyState`, plus the
  two DYTBL rows). NOT fixable inside jt5-3: it changes which gravity applies and
  therefore moves every jt2 seeded-replay fingerprint. **Needs a story filed.**
- **Gap** (non-blocking): the ROM CLEARs `PTIMUP` at BOTH wing transitions —
  `CLR PTIMUP,U  RE-INIT BUTTON PRESSES` inside GOFLIP (:6185) and again after
  FLAST2's `JSR VSND` (:6219). `PTIMUP` is the air-time counter that scales the
  next flap's impulse (`ADDFLP`, :6429-6434), so on the machine a RELEASE
  restores lift as well as a press does. Our `flight.ts` never resets `timeUp` in
  flight (only `land()` → 1 and `walkOff()` → 0), so a hovering knight's impulse
  decays further than the machine's does. Affects
  `plugins/joust/src/core/flight.ts` + the two steppers. Out of scope here for
  the same reason as above — it moves the fingerprints. **Needs a story filed.**
- **Question** (non-blocking): `P7DEC`, the PTERODACTYL decision block, binds
  `SNELWU,SNELWD` like every other enemy block (:5576). Our port's ptero flies
  through the gravity-exempt `stepPteroFlight` and has no flap at all, so jt5-3
  emits no wing cue for one. If the ROM's pterodactyl really reaches
  FLAPLP/FLIPLP, joust is missing a cue. Affects `plugins/joust/src/core/ptero.ts`
  — worth one read of the `PTERO` routine (:1142+) before jt5-2 bakes the sample
  set. **File if real.**
- **Improvement** (blocking for Dev, not for the story): `src/core/events.ts:24-27`
  still records the flap as deliberately deferred, and cites `:6207-6218` for
  GOFLAP. Both go false in GREEN, and the line extent was already wrong —
  `GOFLAP` is :6212 and `FLAST2` :6216. Dev must rewrite that block when the four
  kinds land. The same wrong extent in `tests/audio-events.test.ts` is corrected
  in this story's RED commit.
- **Improvement** (non-blocking): `enemy.ts:519-526`'s doc comment says the
  brain's `flap` "drives BOTH the flap edge and the wings-held gravity … a
  flapping buzzard's wings are down", which is true of the ROM's single bit but
  silently omits that the ROM LATCHES it. Rides with the first finding.

### Dev (implementation)

- No new Gaps/Conflicts/Questions surfaced during GREEN — TEA's RED-phase
  analysis (both hazards, the two corrected ACs, the call-site deviation) mapped
  directly onto a working implementation with zero collateral: `npx vitest run
  --project joust` went from 1955 passed/24 failed to **1979 passed/0 failed** —
  every one of jt5-1's existing fixtures (including its own flap-adjacent input
  scripts) stayed green with no hand-editing. The two TEA Gaps above (the missing
  per-wake wing-down LATCH in the brain; `flight.ts` never resetting `timeUp` on
  a release) are still open and still need SM story ids — Dev did not touch
  either, per the story's explicit scope line.
- **Improvement** (non-blocking): `stepEnemy`'s signature is pinned by
  `tests/helpers/enemy-contract.ts` (`(enemy, ctx?) => EnemyState`), so the wing
  edge a wake produces cannot ride its return value. Solved by splitting the
  existing body into a new export, `stepEnemyDetailed`, that returns
  `{ enemy, wingEdge }`; `stepEnemy` is now a one-line wrapper over it. Any
  future story that needs a second signal out of an enemy's wake (jt5-4's thud,
  for instance) should extend `stepEnemyDetailed`'s return object rather than
  widening `stepEnemy` itself or growing a third parallel function. Affects
  `plugins/joust/src/core/enemy.ts`.

### Reviewer (code review)

- **Gap** (blocking for SM, not for the code): TEA filed three findings above that
  END in "Needs a story filed" / "File if real" and **no story exists for any of
  them** — `sprint/epic-jt5.yaml` holds jt5-1..jt5-7 and none covers them. They
  are (a) the enemy's missing per-wake wing-down LATCH (`PJOYT`/`BOUPWD`,
  JOUSTRV4.SRC:3746-3748, :3759-3762, :3864-3865, :3894, DYTBL :7314-7315);
  (b) `PTIMUP` cleared at BOTH wing transitions (:6185, :6219) so a RELEASE
  restores lift, which `flight.ts` never does; (c) whether the ROM's PTERODACTYL
  really reaches FLAPLP/FLIPLP given `P7DEC` binds `SNELWU,SNELWD` (:5576) while
  our `stepPteroFlight` has no flap. Both (a) and (b) move every jt2 fingerprint,
  so they are correctly out of jt5-3 — but an archive note alone is forgetting.
  Affects `sprint/epic-jt5.yaml` (three `pf sprint story add` calls before
  finish-story). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): three invariants this story states in prose are
  unpinned by all 1979 tests, measured by mutation — the pre-step `wasAirborne`
  read (`frame.ts:321`), `GameState.cues` never accumulating (`frame.ts:163-169`)
  and `stepDemo`'s flight-before-collision cue order (`demo.ts:1109`). The first
  is a real emitted-stream difference, not a no-op. Affects
  `plugins/joust/tests/audio-flap.test.ts` (three guards). *Found by Reviewer
  during code review.*
- **Improvement** (non-blocking): `JT53-004`'s consequence clause is a
  `SYSTEM.SRC:767-768` fact wearing a `:8108` citation, and reads as a statement
  about this port. Affects `plugins/joust/docs/rom-study/claims/audio.json`.
  *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)

- **Take-off is NOT silent:** derived AC3 says "the first frame of flight does
  NOT emit a wing cue, regardless of button state". Refuted for one of the two
  entries into flight and confirmed for the other, so the tests encode both.
  `STFLY` — "START TO FLY", reached from `PLYRLP`'s `LBNE STFLY` (:5966) — ends
  `JMP FLAST2` (:6135), landing directly on the wing-DOWN `JSR VSND` at
  :6216-6218, so a flap take-off SOUNDS. `STFALL` — "START TO FALL", reached from
  :6016 — ends `BNE FLAPS2 / BRA FLIPS2` (:6156-6157), the labels BELOW each
  loop's cue, so walking off a ledge is silent. The AC collapsed the two paths;
  the description's ":6154-6157" quarry is `STFALL`'s tail only.
- **AC1's field is not asserted by name.** The AC asks for "a previous-frame
  `flapHeld` field on `FlightState`". The type is actually `EntityState`, and an
  enemy is stepped only on its WAKE, so the enemy's previous level may have to
  live on `EnemyState` instead. The tests therefore pin the PROPERTY — the edge
  memory survives a JSON round-trip of the state, and two interleaved games do
  not share it — which is what rules out a module-scoped `let prevFlap` while
  leaving Dev the choice of home.
- **AC7's call sites are the DECISION-BLOCK bindings, not GOFLIP/GOFLAP.** The AC
  asks for ":6212-6218 for GOFLAP, :6182-6184 for GOFLIP" in `CUE_SOURCES`.
  `Citation` holds ONE line, and jt5-1's live gate requires
  `callSite.verbatim.includes(table)` (audio-rom-citations.test.ts:293). The
  GOFLIP/GOFLAP lines name `DSNWU`/`DSNWD` — the decision-block OFFSETS — and
  never `SNPLWU`/`SNELWD`, so citing them there fails the gate. The call site is
  therefore the binding line that says which species gets which table (:5544 for
  the knights, :5560 for the buzzards), exactly as `playerMaterialise` and
  `enemyMaterialise` already do. The two edge sites are pinned byte-for-byte in
  `tests/audio-flap.test.ts` instead, where they belong to the LAW rather than to
  one cue's provenance.
- **"Only on its transition" is per WAKE for an enemy.** AC2 says each kind is
  emitted only on its transition with no per-frame re-emission. An enemy runs on
  the EMYTIM divider (`period` 2 on the early waves), so its edges are wake-to-
  wake; a fixture asserts silence on the frames between its wakes.

## SM Assessment

Story cut for the peloton run of epic jt5 (order ruled by the user 2026-08-01:
the code stories run first so jt5-2 bakes a complete cue set in one upload pass;
jt5-3 leads because it is the only remaining p2 that ships no assets).

**Claim probes, run before setup.** `git fetch --prune` then
`git branch -r | grep -Ei jt5` returned nothing, and the cross-checkout session
sweep found one live session — a-2 on cp5-1, the centipede audio seam. That
story touches `plugins/centipede/**` and the shared TEA sidecar; it does not
touch `plugins/joust/**` or `src/shared/`, so there is no contention with this
story. It WILL contend with jt5-5 later, which proposes editing
`src/shared/audio.ts`. The claim for this story is now pushed both ways: the
stamp and context on `main` (6d93fa2) and an empty `feat/jt5-3-flap-two-edge-cue`
at zero commits ahead, so a sibling's branch probe sees it.

**The story description was measured before setup, and two of its claims are
false.** Recorded here because the epic YAML still carries the originals and the
archived session is where a later reader learns which came first.

1. *"Our core sees only the press edge (input.flap …); the release edge needs
   state nothing tracks today."* Refuted. `PlayerInput` at
   `plugins/joust/src/core/flight.ts:49-53` is `{ dir, flap, flapHeld }` and the
   core already consumes the LEVEL at `flight.ts:292` to select gravity. The
   shell derives the rising edge from it at `plugins/joust/src/shell/input.ts:45`.
   The real gap is narrower: no PREVIOUS-frame level is persisted in state, so
   the falling edge cannot be computed. The story's conclusion (a detector
   belongs in `src/core`) survives; its stated reason does not.
2. *"GOFLAP -> FLAST2 … JOUSTRV4.SRC:6207-6218."* Refuted. `GOFLAP` is `:6212`,
   `FLAST2` is `:6216`, and the three load-bearing lines are `:6216-6218`.
   `:6207` is `GOTFIT JSR SRCADA`, in the other loop's tail. The `GOFLIP`
   citation `:6182-6184` in the description is correct and verbatim.

Everything else in the description verified: the press=wing-down /
release=wing-up mapping, the four sound tables at `:8107`, `:8108`, `:8125`,
`:8126`, the `frame.ts:214` and `enemy.ts:496` call sites, and the 1982
copy-paste comment at `:6217` (corroborated three ways — the `:118-119` RMB
declarations, the table comments, and the control flow).

**Acceptance criteria are DERIVED, not copied.** The epic YAML holds
`acceptance_criteria: null` for this story, so `sm-setup` wrote seven ACs from
the corrected facts above. They have no upstream authority; TEA should treat
them as a proposal and say so if the ROM disagrees.

**Three hazards handed forward, all in the context file.** (A) `enemy.ts:540`
assigns the enemy's held level from its press edge, so a naive falling-edge
detector emits a wing-up one frame after every wing-down, forever — a live
fidelity question, deliberately not pre-judged here. (B) jt5-1's guard at
`plugins/joust/tests/audio-events.test.ts:229` forbids the flap cue names; it
must be updated and its going red mid-story is the expected signal, not damage.
(C) the seam suite's three sweeps all read the same `EVENT_KINDS` tuple, so a
declared-and-mapped kind proves nothing — measured on jt5-1, where six of eleven
cues could be deleted with the suite fully green. RED must pin EMISSION and
assert the moment before each cue.

Routing to TEA for the RED phase.
## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 24 failing, ready for Dev

**Test Files:**
- `plugins/joust/tests/audio-flap.test.ts` — NEW. The whole story: the ROM law
  re-opened byte for byte, the four kinds declared and ROM-cited, and — the part
  that matters — EMISSION staged frame by frame for both parties.
- `plugins/joust/tests/audio-events.test.ts` — EDITED (Hazard B). jt5-1's
  `deferred` guard loses `'player-flap'`, `'enemy-flap'`, `'flap'` and keeps
  `'player-thud'`, `'enemy-thud'`, `'thud'`, `'troll-grab'`. Its header's stale
  deferral note and its wrong `:6207-6218` extent are corrected in place.

**Tests Written:** 35 in the new file (24 red, 11 green), covering all seven
derived ACs with the three deviations recorded above.

### The suite state

| suite | result |
|---|---|
| `npx vitest run --project joust` | **24 failed, 1955 passed** — ONE failing file, `tests/audio-flap.test.ts` |
| `npm run test:orchestrator` | 358 passed, 0 failed |
| `npm run lint` | clean |

No jt5-1 collateral: `audio-events.test.ts`, `audio-manifest`, `audio-dispatch`,
`audio-emission`, `audio-rom-citations` and `audio-seam-scope` are all green with
the guard edit in. That was NOT assumed — the risk was that a live per-frame cue
would break jt5-1's three `toEqual([])` quiet-frame assertions. Simulating the
detector over 260 frames of jt5-1's own script at seed 0xbeef showed its three
staged quiet frames (200, 212 and the frame-after-199 window) carry no wing edge
for either party, so all three survive. Frames 195/196, 197/199, 203/205,
208/209, 213/215 DO carry one; none of them is asserted empty by jt5-1.

### Hazard C — what these tests refuse to accept as evidence

The DECLARATION group (EVENT_KINDS / CUE_SOURCES / CHANNELS / the dispatch) is
present because Dev has to build it, and it is stated in the file's header to be
necessary and NOT sufficient — jt5-1 measured that the manifest, dispatch and
coverage sweeps all read the same tuple, so six of eleven cues could be deleted
with the project green. Every behavioural assertion here therefore:

- stages an input sequence and reads `GameState.events` / `DemoState.cues` — the
  seam the shell actually plays from;
- asserts an EXACT stream (`toEqual`), never `toContain`, so a cue that fires on
  the wrong frame fails as loudly as one that never fires;
- asserts the frame BEFORE the cue is clean, and (in the sequence tests) that the
  window emitted something at all before the per-frame rows are checked.

Every staged window was MEASURED cue-free on the pre-story tree first — that is
what makes exact streams honest rather than brittle. Buzzards are parked asleep
(`nap: 100_000`) for the knight windows so the wave stays open and no advance
fires its own cues.

### Hazard A — the ROM's answer, and it is not the one the story feared

The fear was that `enemy.ts:540`'s `flapHeld: decision.flap` makes a falling-edge
detector machine-gun. Read from the source, the enemy's model is structurally
RIGHT and the timing is what is missing:

- The buzzard runs the SAME `FLAPLP`/`FLIPLP` loops as the knight. The loops read
  the wing tables out of `PDECSN,U`, and the enemy blocks P3DEC–P7DEC bind
  `SNELWU,SNELWD` there (:5560, :5564, :5568, :5572, :5576).
- The machine also has exactly ONE bit — `CURJOY+1`, register B — read as the
  EDGE by `TSTB / BNE GOFLAP` (:6195-6196) and as the LEVEL by `FLAPS2 CLRB`
  (:6170). So collapsing edge and level into one field is the ROM's own shape.
- What the ROM adds is a LATCH on that bit, and it lives in the BRAIN, not in the
  flight loop: `LNTUP` sets `B=1` and swaps `PJOY` to `LNTOFP`, which on the next
  wake restores `LINET` and `CLRB`s (:3746-3748, :3759-3762) — one wake down,
  then up. `BOUNDR` holds it for `BOUPWD` wakes in `PJOYT`, "WING DOWN TIME"
  (:3864-3865), then forces `BOUPWU` wakes up (:3894); both are DYTBL rows
  (:7314-7315, 3/2/1 and 10/8/6).

So a wing-down followed by a wing-up on the NEXT WAKE is the machine's own
wingbeat, not a defect — and the thing that must never happen is a SECOND
wing-down while the bit is still set. The fixtures encode exactly that: a
`timeUp: 1` buzzard flaps one wake and is rising the next (DOWN then UP), and a
`timeUp: 255` buzzard whose impulse has decayed to −1 keeps asking to flap on
every wake and must sound ONCE. The missing latch is filed above as a Delivery
Finding, with its ROM lines; it cannot be fixed here because it selects which
gravity applies and would move every jt2 fingerprint.

### Determinism

Pinned the way jt5-1 pinned it, plus the axis jt5-1 could not see. jt5-1's frozen
fingerprint captures the rng cursor, the process ORDER and the ledgers; it does
not capture where anything IS. A detector threaded through `flap()` or
`stepFlight()` — selecting gravity from the PREVIOUS level instead of the current
one — moves every bird and none of jt5-1's numbers. So this story freezes an
ENTITY digest (posX, posY, velY, velXIndex, velXFrac, timeUp, airborne for every
process) after 200 frames of jt5-1's script at seed 0xbeef, measured on 6d93fa2,
with a different-seed control beside it.

### Non-vacuity of the eleven green-on-arrival tests

Verified by mutation against the committed RED tree, one at a time, each reverted:

| mutation | expected guard | result |
|---|---|---|
| `GRAVITY_WINGS_UP = GRAV + 5` | entity digest, 200 frames | RED |
| `extraMan` channel `prio-100` → `prio-80` | "share a channel ONLY when they share a ROM priority" | RED |
| drop `'troll-grab'` from the deferred list | "the guard still exists and still forbids…" | RED |
| add `'flap'` back to the deferred list | "no flap-family name is deferred any more" | RED, on the flap message |
| comment out `'cliff-destroyed'` in EVENT_KINDS | "the eleven jt5-1 kinds survive" | RED |

The ROM re-open group carries its own control ("the re-opens are DISCRIMINATING")
so a `vendoredLine` that echoed its argument would fail there.

### What Dev has to build

1. `src/core/events.ts` — four kinds: `player-wing-down`, `player-wing-up`,
   `enemy-wing-down`, `enemy-wing-up`. Rewrite the stale FLAP paragraph at
   :24-27 while you are in there.
2. A previous-flap level on the CORE state. Not necessarily on `EntityState` —
   the enemy steps only on its wake, so `EnemyState` may be its right home. The
   tests pin the property, not the field.
3. The emission law, in full:
   - airborne, level false→true → wing-down (GOFLAP → FLAST2)
   - airborne, level true→false → wing-up (GOFLIP)
   - airborne, level unchanged → nothing
   - grounded, a flap TAKE-OFF → wing-down (STFLY `JMP FLAST2`)
   - grounded, walking off a ledge → nothing (STFALL)
   - grounded, any level change → nothing (PLYRLP has no wing sound)
   - an enemy's edges are per WAKE, never per frame
4. `src/shell/audio.ts` — `playerWingDown`/`playerWingUp`/`enemyWingDown`/
   `enemyWingUp` in `SOUNDS`, `CHANNELS` (a channel per distinct ROM priority:
   10 for the pair of knight cues, 6 for the pair of buzzard cues) and
   `CUE_SOURCES` (SNPLWD :8126, SNPLWU :8125, SNELWD :8108, SNELWU :8107; call
   sites :5544 and :5560 — see the Design Deviation on why not :6183/:6217).
5. `src/shell/audio-dispatch.ts` — four cases; the `never` default makes it a
   compile error otherwise.
6. `docs/rom-study/claims/audio.json` — the two-edge law is a claim worth riding
   the live citation gate.

**Handoff:** To Dev for GREEN. `.session/jt5-3-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/flight.ts` — new pure `wingEdge(wasAirborne,
  prevFlapHeld, input)` law (airborne press→'down', release→'up', held→null;
  grounded uses `input.flap`, the same condition that already gates `takeOff`).
  Appended after `land()`; nothing generated was touched.
- `plugins/joust/src/core/enemy.ts` — `EnemyState.prevFlapHeld?: boolean`
  (optional, the enemy's own edge memory, home chosen per TEA's flexibility);
  new export `stepEnemyDetailed` returning `{ enemy, wingEdge }`; `stepEnemy`
  reduced to a one-line wrapper over it so its pinned signature
  (`tests/helpers/enemy-contract.ts`) is untouched.
- `plugins/joust/src/core/frame.ts` — `ProcessSpec.prevFlapHeld?: boolean` (the
  player's edge memory, homed on the process like `facing` — NOT on
  `EntityState`, which the scheduler.test.ts migration guard JSON-compares
  against a reference pipeline that predates this story); `GameState.cues`
  (fresh every `stepFrame`, same shape as `woke`); `runBehaviour` now also
  returns an optional `cue`, computed via `wingEdge` for the player branch and
  read off `stepEnemyDetailed` for the enemy branch; `stepFrame` collects those
  into `cues` and returns them.
- `plugins/joust/src/core/demo.ts` — `DemoProcess.prevFlapHeld?: boolean`
  (mirrors frame.ts's `Process`); `stepDemo` seeds `cues: []` into its
  `stepFrame` call (frame.ts's `GameState.cues` is required, `DemoSim` predates
  it) and prepends `stepped.cues` to its own cue stream, ahead of
  `collided.cues`.
- `plugins/joust/src/core/events.ts` — four new `EVENT_KINDS` entries
  (`player-wing-down/up`, `enemy-wing-down/up`); rewrote the stale :24-27
  paragraph (was: FLAP deferred, wrong `:6207-6218` extent) to describe the
  two-edge law now wired, with the corrected `:6212-6218`.
- `plugins/joust/src/shell/audio.ts` — four `SoundName` members; `SOUNDS` (four
  `.wav` filenames); `CHANNELS` (`prio-10` for the knight pair, `prio-6` for the
  buzzard pair); `CUE_SOURCES` (SNPLWD/SNPLWU/SNELWD/SNELWU, citing :8126/:8125/
  :8108/:8107 and call sites :5544/:5560 — the decision-block bindings, per the
  session's Design Deviation, not GOFLIP/GOFLAP); header counts updated to
  fifteen cues / eleven priorities / eleven channels.
- `plugins/joust/src/shell/audio-dispatch.ts` — four new `switch` cases mapping
  the event kinds to the `SoundName`s above; the `never` exhaustiveness guard is
  unchanged and still compiles.
- `plugins/joust/docs/rom-study/claims/audio.json` — eight new claims
  (JT53-001..008): the two-loop coroutine law, all four sound tables, both
  decision-block call sites, and the STFLY take-off jump.

**Tests:** 1979/1979 passing (GREEN) — `npx vitest run --project joust`. The
24 tests RED at handoff are now green; the previously-green 1955 stayed green
(zero collateral, including jt5-1's own flap-adjacent input scripts).
`npm run test:orchestrator`: 358/358. `npm run lint`: clean. No test file was
edited.
**Branch:** main (pushed)

**Handoff:** To review.
## Subagent Results

`workflow.reviewer_subagents` in `.pennyfarthing/config.local.yaml` has **8 of 9
specialists set to `false`**. Only `preflight` is enabled, so the eight disabled
domains were assessed DIRECTLY by the Reviewer, primarily by mutation (24
mutations; re-reading code this same pipeline wrote finds close to nothing).

| Subagent | Enabled | Received | How it was covered |
|---|---|---|---|
| reviewer-preflight | yes | Yes — PASS | Run directly: joust 1979/1979 (82 files), orchestrator 358/358, `npm run lint` clean, `build-app.mjs joust` OK. Decision: no blocker; a clean preflight is not evidence, so the battery below carries the review |
| reviewer-edge-hunter | **false** | Yes (by Reviewer) | M5-M14, M24 — grounded/airborne fork, take-off vs walk-off, landing frame, first wake, never-flapping entity. Decision: one gap found (M14) |
| reviewer-silent-failure-hunter | **false** | Yes (by Reviewer) | M1-M4, M16 — each of the four emitters deleted individually; the demo drop path. Decision: no swallowed cue; all four emitters observable |
| reviewer-test-analyzer | **false** | Yes (by Reviewer) | 24-mutation battery; TEA's two spot-checked green-on-arrival claims re-verified. Decision: three unpinned invariants |
| reviewer-comment-analyzer | **false** | Yes (by Reviewer) | Every ROM line in every claim body, comment and test name re-opened against the vendored 1982 tree. Decision: two prose findings (JT53-004, JT53-001) |
| reviewer-type-design | **false** | Yes (by Reviewer) | `WingEdge` union, `GameEventKind` narrowing, the `never` dispatch guard, `stepEnemyDetailed` split and its callers. Decision: sound |
| reviewer-security | **false** | Yes (by Reviewer) | N/A by construction — pure core, no I/O, no user data, no network; the only new shell surface is four `.wav` names on an existing CDN prefix. Decision: no finding |
| reviewer-simplifier | **false** | Yes (by Reviewer) | `stepEnemy`/`stepEnemyDetailed` split checked for churn: real (9+ live `stepEnemy` callers, 1 production `stepEnemyDetailed` caller). Decision: not churn |
| reviewer-rule-checker | **false** | Yes (by Reviewer) | Core purity scanner, `EntityState` placement rule, citation-gate call-site rule, header counts. Decision: all pass |

**All received: Yes**

## Reviewer Assessment

**Verdict:** APPROVED

Twenty-four mutations, each asserted to have landed on disk, each reverted. The
jt5-1 blind spot did **not** recur: all four new emitters are individually
observable. Three prose-stated invariants are unguarded, one of them measurably
non-trivial. No Critical, no High.

### Findings

| Severity | Issue | Location | Fix required |
|---|---|---|---|
| [MEDIUM] | `JT53-004`'s clause "below the player pair's 010, so a buzzard's wingbeat never steals the knight's own" is an arbitration consequence its cited line cannot support, and reads as a statement about THIS port | `plugins/joust/docs/rom-study/claims/audio.json` (JT53-004) | Scope it to the machine and cite `SYSTEM.SRC:767-768`, or drop the clause. Owner: **jt5-5** (priority arbitration) |
| [MEDIUM] | The pre-step `wasAirborne` read is unpinned — swapping it for the post-step value reddens 0/1979 yet changes the emitted stream | `plugins/joust/src/core/frame.ts:321` | Add a landing-frame-release and a walk-off-with-release fixture. Owner: **jt5-4** (next core+cue story in this plugin) |
| [LOW] | `GameState.cues` "never accumulated" is prose only; the test named for it drives the demo path, which re-seeds `cues: []` and cannot see it | `plugins/joust/src/core/frame.ts:163-169` | Assert on a directly chained `stepFrame`. Owner: **jt5-4** |
| [LOW] | `stepDemo`'s flight-before-collision cue ORDER is documented and unpinned | `plugins/joust/src/core/demo.ts:1109` | One fixture with both a wing edge and a collision cue on one frame. Owner: **jt5-4** |
| [LOW] | "FLAPS2/FLIPS2, BELOW each `JSR VSND`" is true of FLIPS2 (:6197, reached by `BRA FLIPS2` :6186, below GOFLIP's VSND :6184) and false of FLAPS2 (:6170, ABOVE the wing-down VSND :6218; GOFLAP's tail never reaches it — it exits `BLE WINGDN` :6224 to :6176/:6177) | `audio.json` JT53-001; `flight.ts:438`; `audio-flap.test.ts:20,40,195,200,385,481,626` | Say "the cue-free entry points into each loop". Owner: **jt5-7** (already scoped to correcting jt5 prose) |

### Mutation battery — 24 mutations, each verified landed, each reverted

| # | Mutation | Reds |
|---|---|---|
| M1 | emitter deleted: `player-wing-down` never pushed | **13** |
| M2 | emitter deleted: `player-wing-up` never pushed | **5** |
| M3 | emitter deleted: `enemy-wing-down` never pushed | **5** |
| M4 | emitter deleted: `enemy-wing-up` never pushed | **1** |
| M5 | STFLY take-off made SILENT | **3** |
| M6 | STFALL walk-off made LOUD | **6** |
| M7 | grounded branch keys on the LEVEL not the rising edge | **1** |
| M8 | airborne edge POLARITY swapped | **12** |
| M9 | airborne press read as LEVEL (holding machine-guns) | **7** |
| M10 | release edge removed entirely | **6** |
| M11 | ENEMY edge memory never persisted across wakes | **3** |
| M12 | ENEMY edge memory never READ (prev always false) | **3** |
| M13 | PLAYER edge memory never persisted across frames | **7** |
| M14 | `wasAirborne` read AFTER the step, not before | **0** ⚠ |
| M15 | `stepFrame` ACCUMULATES cues instead of rebuilding | **0** ⚠ |
| M16 | `stepDemo` DROPS `stepped.cues` | **3** |
| M17 | `stepDemo` cue ORDER flipped | **0** ⚠ |
| M18 | `GRAVITY_WINGS_UP = GRAV + 5` (TEA claim check) | **18** |
| M19 | `playerWingUp` routed to the buzzard's channel | **2** |
| M20 | `CUE_SOURCES` playerWingDown priority 10 → 6 | **5** |
| M21 | dispatch collapses `player-wing-up` onto the wing-DOWN sample | **2** |
| M22 | `EVENT_KINDS` loses `enemy-wing-up` | **4** |
| M23 | `enemyWingUp` cites SNELWD's row (:8108) instead of :8107 | **2** |
| M24 | `prevFlapHeld` homed on `EntityState` instead (deviation probe) | **1** |

**M14 is not a no-op.** Proven, not argued: over 3000 frames of a hold-3/release-4
script at seed 0xbeef the wing stream goes **1610 → 1609** cues — `player-wing-up`
disappears at frames 633 and 1732 and appears at 2656. The divergence is exactly
the frames where `airborne` flips inside the step (take-off, walk-off, landing);
a release on the landing frame sounds wing-up in the shipped code and is silent
under the mutant. The shipped code is RIGHT — the ROM's loop state is the bird's
state ENTERING the frame — the guard is simply absent.

**M15 / M17** change nothing in production (`stepDemo` is the only production
caller and re-seeds `cues: []` every frame, and channel routing makes order
inert today), but both invariants are asserted in comments that no test holds.
`stepFrame` IS called directly and chained by `scheduler.test.ts` and
`wave.test.ts`, so M15's surface is real.

### TEA's non-vacuity claims — verified, not trusted

TEA claimed all eleven green-on-arrival tests were mutation-checked. Two spot-checks:

- `GRAVITY_WINGS_UP = GRAV + 5` → the entity digest **`seed 0xbeef, 200 frames —
  every bird is exactly where it was before this story` is in the failing list**
  (18 reds total, full list captured). Claim holds.
- `a flap TAKE-OFF sounds wing-down — STFLY ends 'JMP FLAST2'` reddens under M5
  and under M18. Not vacuous.

### Mandatory steps

**Data flow traced:** a keypress → `shell/input.ts:45` derives `flap = flapHeld &&
!prevFlap` → `PlayerInput` → `stepDemo` → `stepFrame({...sim, cues: []})` →
`runBehaviour` captures `p.entity.airborne` and `p.prevFlapHeld` BEFORE the step →
`wingEdge` → `wingCue` → `GameState.cues` → `stepDemo` prepends to `DemoState.cues`
→ `audio-dispatch.cueFor` → `SoundName` → shared engine → `.wav`. Safe because the
core never touches the shell: the edge is DATA on the returned state, exactly as
jt5-1's eleven cues already are, so jt2's seeded replays are unaffected (proven by
the frozen entity digest plus 1979 green).

**Wiring:** the four kinds reach a real sound end to end. `SOUNDS` names four
`.wav` files that do not exist yet — that is jt5-2's scope by design, and the
shared engine degrades silently on a 404, which is the known fleet hazard.
jt5-2's title still says "The eleven samples"; it must bake **fifteen**.

**Pattern observed (good):** the deliberate REFUSAL to grow `EntityState`.
`frame.ts:114-123` and `enemy.ts:128-140` both cite `scheduler.test.ts`'s AC-3
migration guard as the reason. Verified empirically, not accepted: M24 moved
`prevFlapHeld` onto the entity and reddened `reproduces the reference trajectory
bit-for-bit` — the exact guard named. The deviation is sound.

**Error handling / boundaries:** `prevFlapHeld` is optional everywhere and absent
reads as `false` (`?? false`), which is correct for a never-woken enemy and a
bare scheduler process. `promote()` spreads `...enemy`, so the edge memory
survives promotion rather than resetting into a spurious wing-down. The grounded
branch keys on `input.flap`, which is the ONLY condition that calls `takeOff()`
(`frame.ts:267-268`, `enemy.ts:524-525`) — so it is exactly the STFLY/STFALL fork,
not an approximation of it.

**Security:** N/A by construction. Pure core, no I/O, no user input beyond a
boolean, no network, no storage. The only new shell surface is four filenames on
an existing CDN prefix.

**Core purity:** clean, and it does not narrowly dodge. joust's scanner strips
comments AND string literals before matching (`tests/purity.test.ts:100-131`),
unlike tempest's comment-inclusive one — and nothing Dev wrote names a forbidden
global in any case.

**`:6207`:** does not survive anywhere in the plugin except
`tests/audio-events.test.ts:184`, which names it only to record that it was wrong.
The epic YAML still carries it in the story description (jt5-7's scope).

**Citations:** all eight `JT53-*` verbatims re-opened byte-for-byte against
`reference/williams-source/joust/`. Every line number embedded in a claim BODY,
comment or test name also re-opened — `:118-119`, `:5544`, `:5560`, `:6135`,
`:6183`, `:6195-6196`, `:6217`, `:8107`, `:8108`, `:8125`, `:8126`, plus the
extents `:6163-6180`, `:6182-6184`, `:6190-6210`, `:6212-6218`, `:6123-6135`,
`:6139-6157`, `:6170`, `:6197` — **all correct**. Header counts exact: fifteen
cues, eleven priorities, eleven channels (measured).

### Deviation audit

| Deviation | Verdict |
|---|---|
| TEA: take-off is NOT silent (AC-3 refuted; STFLY `JMP FLAST2` :6135) | **ACCEPTED** — re-opened at :6123-6135 and :6139-6157; STFLY does jump onto FLAST2 and STFALL's tail does branch to FLAPS2/FLIPS2 |
| TEA: AC1's field pinned as a PROPERTY, not by name | **ACCEPTED** — and vindicated: M24 shows the named home would have broken AC-3 |
| TEA: AC7's call sites are the decision-block bindings, not GOFLIP/GOFLAP | **ACCEPTED** — :6183/:6217 load through `DSNWU`/`DSNWD` (:118-119) and never name a table, so the gate's `callSite.verbatim.includes(table)` could not pass |
| TEA: "only on its transition" is per WAKE for an enemy | **ACCEPTED** — M11/M12 both red; the wake-to-wake edge is guarded |
| Dev: `stepEnemyDetailed` split rather than widening `stepEnemy` | **ACCEPTED** — not churn; `stepEnemy` keeps 9+ live callers and its pinned contract, `stepEnemyDetailed` has exactly one production caller |
| Dev: `prevFlapHeld` on `Process`/`DemoProcess`/`EnemyState`, not `EntityState` | **ACCEPTED with evidence** — M24 reddens the named guard |
| UNDOCUMENTED: `GameState.cues` became a REQUIRED readonly field | Noted, not a defect — `createState` supplies it, `stepDemo` re-seeds it, `npm run lint` clean across every call site |

**Handoff:** To SM for finish-story. Three follow-ups must be filed first (see
Delivery Findings → Reviewer).
---

## Impact Summary

**One round. APPROVED on the first review, no rework cycle.** Everything below
that reads like a blocker is deliberately-descoped work with a filed owner —
nothing blocked the finish (`blocking_count: 0`).

### What shipped

joust's flap became the two-edge ROM cue it always was. The PRESS edge sounds
wing-DOWN (`GOFLAP` :6212 → `FLAST2` :6216-6218), the RELEASE edge sounds
wing-UP (`GOFLIP` :6182-6184), and the core gained the previous-frame level it
needed to see the falling edge at all. Four kinds, four manifest rows, four
dispatch cases, eight citations (JT53-001..008). Two commits on `main`:
`e5690ee` (RED, tests only) and `8ef35a1` (GREEN, 8 files, no test edits).

Gates at finish: joust **1979/1979** across 82 files, orchestrator **358/358**,
`npm run lint` clean, `node scripts/build-app.mjs joust` OK. The joust suite's
"3 citation error(s)" line comes from the citation gate's own negative-path
fixtures in a temp `jt1-9-empty-*` dir — a self-test asserting the gate rejects
malformed claims, not a failure.

### Two premises this story was given were false, and the pipeline caught both

1. **SM's setup brief said take-off is silent. It is not.** `STFLY` (:6123) ends
   `INC PACCX,U  MAKE WINGS SHOW UP (1 FRAME), THEN DOWN` (:6134) then
   `JMP FLAST2` (:6135) — straight onto the wing-down `JSR VSND`. The silent
   routine is `STFALL` (:6139), whose tail at :6154-6157 SM quoted and
   mislabelled. TEA re-opened the ROM in RED and refuted it; derived AC-3 was
   struck and the context carries a ⚠ block above the original text. **The error
   was SM's, not the story's** — recorded here because the archived session is
   where a later reader learns which came first.
2. **The epic YAML's `:6207-6218` extent for GOFLAP is wrong.** `GOFLAP` is
   :6212, `FLAST2` is :6216; :6207 is `GOTFIT JSR SRCADA`, in the other loop's
   tail. Measured before setup. The epic YAML still carries the bad extent —
   **jt5-7 owns fixing it.** A wrong extent is worse than a wrong fact because it
   manufactures corroboration: a reader who checks only the cited span sees the
   false claim confirmed, and the citation gate cannot help, since it re-opens
   only the quoted line and never reads a claim's body.

A third premise — "our core sees only the press edge" — was also refuted at
setup: `PlayerInput` has carried `flapHeld` all along (`flight.ts:49-53`,
consumed at :292 for gravity). The real gap was narrower: no *previous* level
was persisted. The story's conclusion survived; its stated reason did not.

### The blind spot did not recur, and that was measured

jt5-1 shipped a seam whose three sweeps — manifest, dispatch, coverage — all
read the same `EVENT_KINDS` tuple, so they agree with each other whether or not
any event fires: **six of its eleven cues could have been deleted with the whole
project green.** The Reviewer's 24-mutation battery deleted each of this story's
four emitters in turn and got **13 / 5 / 5 / 1 reds**. Every new cue is
individually observable. TEA's claim that its 11 green-on-arrival tests were
mutation-checked was verified rather than trusted.

Three mutations reddened **0/1979** — and all three are real:

| Mutation | Reds | What it proves |
|---|---|---|
| `wasAirborne` read AFTER the step, `frame.ts:321` | 0 | Not inert: 3000 frames of a hold-3/release-4 script at seed `0xbeef` goes 1610 → 1609 cues, `player-wing-up` vanishing at frames 633 and 1732 and appearing at 2656 — exactly the frames where `airborne` flips inside the step |
| `stepFrame` accumulates `cues`, `frame.ts:163-169` | 0 | "Never accumulated" is prose only; `stepFrame` is chained directly by `scheduler.test.ts` and `wave.test.ts` |
| `stepDemo` cue order flipped, `demo.ts:1109` | 0 | Flight-before-collision order is documented and unpinned |

The shipped code is correct in all three. **A guard that cannot fail is not a
guard** — filed as jt5-11.

### Every descoped finding has a filed owner

Confirmed present in `sprint/epic-jt5.yaml`, all landed in commit `d22b2ad`:

| Finding | Raised in | Owner |
|---|---|---|
| Enemy brains latch no wing-down duration (`LNTUP`/`LNTOFP` :3746-3762, BOUNDR's `PJOYT` :3864-3894, DYTBL :7314-7315) | red | **jt5-8** (filed, described) |
| `PTIMUP` clears at BOTH transitions (:6185, :6219) so a release restores lift; `flight.ts` never resets `timeUp` in flight | red | **jt5-9** (filed, described) |
| Does the ptero reach FLAPLP/FLIPLP? `P7DEC` binds `SNELWU,SNELWD` at :5576 to a bird with no flap model | red | **jt5-10** (filed, described) |
| The three unguarded invariants above | review | **jt5-11** (filed, described) |
| `JT53-004`'s "never steals the knight's own" — true of the machine (`SYSTEM.SRC:761-768`, higher number wins), false in mechanism for us (`src/shared/audio.ts` has zero priority identifiers) | review | **jt5-5** (description extended) |
| "FLAPS2/FLIPS2 below each `JSR VSND`" — true of FLIPS2, false of FLAPS2; propagated to 9 sites | review | **jt5-7** (description extended) |
| jt5-2's title hardcoded "eleven samples" | review | **jt5-2** (title and description corrected; the bake now derives from `SOUNDS`) |

jt5-8 and jt5-9 both move every jt2 seeded-replay fingerprint, which is why they
are out of this story and why their descriptions warn against landing them in
one commit.

### Design decision worth carrying forward

`prevFlapHeld` lives on the player's `Process`/`DemoProcess` and on `EnemyState`,
deliberately **not** on the shared generated `EntityState`. Dev cited
`tests/scheduler.test.ts`'s migration guard; the Reviewer verified it empirically
— mutation M24 moved the field onto `EntityState` and reddened exactly the named
guard, `reproduces the reference trajectory bit-for-bit`. The codebase already
had this precedent: player `facing` lives on the process for the same reason.
