---
story_id: "tp1-4"
jira_key: "tp1-4"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-4: THE CAM, part 1 — build the bytecode interpreter and the 11 enemy programs, selected per wave from CAMWAV

## Story Details
- **ID:** tp1-4
- **Jira Key:** tp1-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T00:22:21Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-13T22:47:16Z | 2026-07-13T22:49:09Z | 1m 53s |
| red | 2026-07-13T22:49:09Z | 2026-07-13T23:10:05Z | 20m 56s |
| green | 2026-07-13T23:10:05Z | 2026-07-13T23:52:34Z | 42m 29s |
| review | 2026-07-13T23:52:34Z | 2026-07-14T00:05:43Z | 13m 9s |
| red | 2026-07-14T00:05:43Z | 2026-07-14T00:13:25Z | 7m 42s |
| green | 2026-07-14T00:13:25Z | 2026-07-14T00:16:46Z | 3m 21s |
| review | 2026-07-14T00:16:46Z | 2026-07-14T00:22:21Z | 5m 35s |
| finish | 2026-07-14T00:22:21Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (blocking): tp1-4 and tp1-5 both claim W-007 (rule-driven flip direction)
  and W-009 (the CHASER). The epic's `description` for tp1-4 says it "Subsumes W-005,
  W-006, W-007, W-008, W-009", but tp1-5's ACs own "flip direction is derived from the
  ROM's rule, not from the RNG" and "the CHASER rim state exists with the ROM's pincer
  rule". Affects `sprint/epic-tp1.yaml` (the two `description` / `acceptance_criteria`
  blocks disagree about who owns two findings). I tested to tp1-4's seven ACs, which are
  the higher authority per the spec hierarchy, and did NOT test the CHASER. But W-007 is
  not cleanly separable: AVOIDR and PULSCH are two of the 11 programs tp1-4 must ship
  (AC-2), and they are *built from* VCHPLA/VCHROT — the flip-direction opcodes. So tp1-4
  necessarily makes flip direction rule-driven for at least those programs. SM/PM should
  decide whether W-007 closes here or in tp1-5, and mark `remediated_by` accordingly.
  *Found by TEA during test design.*

- **Gap** (non-blocking): W-008 ("a flip takes 8 angle-steps") is subsumed by tp1-4 but
  named by none of its seven ACs, and I deliberately did not pin it numerically. Affects
  `src/core/rules.ts:286` (`flipFrames = level >= 33 ? 3 : 4`, W-008's `ours` citation).
  The only observable at the sim boundary is the number of frames the climb freezes during
  a MOVJMP flip, and that count is *emergent* from JJUMPM's angle budget plus the CAM's
  yield points — pinning "8" there would force one particular trace and could reject a
  faithful implementation. My test asserts the climb freezes (>= 3 frames) without pinning
  the count. Dev should implement JJUMPM as 8 angle-steps per W-008 and cite it; the
  Reviewer should verify by citation rather than by frame count.
  *Found by TEA during test design.*

- **Improvement** (non-blocking): the CHASER's CAM assignment takes a minus-one that
  CAMWAV's does not — `LDA I,TOPPER-CAM-1` (ALWELG.MAC:1871). Affects tp1-5 (the CHASER
  story). The asymmetry is real and load-bearing: CHASER reassigns the PC *mid-frame*,
  inside the dispatcher's own `INC CAMPC`, so it must pre-decrement; CAMWAV/TNEWCAM are
  read at activation, outside the loop, and take raw offsets. A port that "tidies" the two
  into agreement will send every chaser one byte into the middle of an instruction. Noted
  here so tp1-5 does not have to rediscover it.
  *Found by TEA during test design.*

- **Question** (non-blocking): the CAM is frame-quantised (one execution per ROM frame,
  MOVINV) but `stepGame(state, input, dt)` is dt-continuous. Affects `src/core/sim.ts`
  (`stepEnemies`). Dev must choose: run the CAM once per `stepGame` call (correct only when
  callers step at `SIM_STEP`), or carry a ROM-frame accumulator in `GameState`. My tests
  drive the sim at exactly `SIM_STEP` (9/256 s — one ROM frame, per tp1-1) and so pass
  under either choice; they do not force the decision. The shell's loop cadence decides
  whether this matters in the real game.
  *Found by TEA during test design.*

### Dev (implementation)

- **Conflict** (blocking): **answering TEA's blocking Conflict on W-007 / W-009 ownership.**
  I closed **W-007** (and **W-025**, the pulsar's half of it) here and left **W-009** open
  for tp1-5. The line is not arbitrary: after this story there is no random flip direction
  anywhere in the codebase to fix — the CAM has no random-direction opcode, rotation is the
  INVROT bit, and it is only ever set by VCHPLA (toward the player) or flipped by VCHROT.
  Both `nextFloat` direction draws (flipper.ts:36, pulsar.ts:32) are deleted, and PULSCH
  carries VCHPLA before every VJUMPS, which is exactly W-025's claim. W-009 by contrast is
  the CHASER — a rim STATE with its own counter and pincer rule, of which this story builds
  nothing. Affects `sprint/epic-tp1.yaml` (tp1-4's `description` still claims it "Subsumes
  … W-009", which is now false) and `docs/audit/findings/pair-1-alwelg-sim-enemies.json`
  (W-005/006/007/008/025 are marked `remediated_by: tp1-4`; W-009 is re-anchored and open).
  SM/PM should correct the epic's description so tp1-5 is not sized as if the chaser were
  already done. *Found by Dev during implementation.*

- **Gap** (blocking for tp1-5): `fastestFlipperRimSpeed()` in `src/shell/input.ts` still
  returns the PRE-CAM number (4 ROM frames per rim lane), because the enemy that walks the
  rim is TOPPER and TOPPER is tp1-5's. The ROM's real figure is a `VSLOOP 4` crouch plus a
  jump of `JUMP_ANGLE_STEPS / WTTFRA` frames — about 6.7 frames/lane, i.e. the arcade's rim
  chaser is SLOWER than the one our keyboard was tuned against. Affects
  `src/shell/input.ts` (the constant `DEEP_FLIPPER_RIM_FRAMES_PER_LANE`) and
  `tests/shell/input.spinner.test.ts` (which pins 7.11 lanes/sec and a 1.27x margin; the
  true margin is nearer 2.1x). tp1-5 must re-derive both from TOPPER. I deliberately did
  NOT move it here: lowering it WIDENS the escape margin, and I will not loosen another
  story's safety invariant on a guess. *Found by Dev during implementation.*

- **Improvement** (non-blocking): the CAM makes three more findings mechanical, because the
  opcodes that fix them are already written, dispatched and tested — only their handlers are
  stubs or hold our old model. **W-026** (the pulse is one GLOBAL phase, not a timer per
  pulsar) is now a change to `stepPulseClock` in sim.ts alone. **W-023** (fuseballs must not
  chase before wave 17) and **W-024** (an early-wave fuseball turns back before the rim) are
  both changes to `jfuseup` in interpreter.ts alone. All three are re-anchored and open.
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): the CAM behaviour suite never rebuilds `s.tube` when it sets `s.level`, so
  every wave's program is exercised on level 1's closed 16-lane circle. Affects
  `tests/core/tp1-4.cam-behaviour.test.ts:48-53` (`flipperOnWave` needs `s.tube = tubeForLevel(level)`).
  This is not cosmetic: it is the direct cause of F-1 shipping green, and the AVOIDR test explicitly
  chose its wave on a false premise ("Wave 15, not wave 10: wave 10's sheet is OPEN") — wave 15 is
  open too. Any future story that reasons about well SHAPE from these fixtures will be misled the
  same way. *Found by Reviewer during code review.*

- **Conflict** (non-blocking): the audit has no finding for "VCHPLA/POLDEL must not wrap on a planar
  well", which is why nothing flagged F-1. The ROM states it plainly (`;PREVENT WRAP`,
  ALWELG.MAC:186-187; POLDEL's `BIT WELTYP / IFPL` guard). Affects
  `docs/audit/findings/pair-1-alwelg-sim-enemies.json` — the open-well direction rule deserves its
  own finding so it is gated forever, rather than resting on one story's review. SM/PM should decide
  whether to add it. *Found by Reviewer during code review.*

- **Improvement** (non-blocking): tp1-5 will grow the CAM (it adds the chaser's rim behaviour), and
  the assembler's `& 0xff` will silently truncate any address operand once the table passes 256
  bytes — while the byte-range test that appears to guard this cannot fail, because the mask
  guarantees its input is in range. Affects `src/core/enemies/cam.ts:280` and
  `tests/core/tp1-4.cam-source-rules.test.ts:139`. Fix it here, before tp1-5 walks into it.
  *Found by Reviewer during code review.*

- **Question** (non-blocking, answering my own TEA-flagged one): the CAM runs **once per
  `stepGame` call**, exactly as MOVINV runs once per ROM frame. This is correct because
  `src/shell/loop.ts` drives the sim through a FIXED-STEP accumulator at `SIM_STEP` (`const
  STEP = SIM_STEP`, loop.ts:14) — one stepGame call IS one ROM frame, always, whatever the
  display refresh. No frame accumulator is needed in `GameState`. If a caller ever steps at
  a non-`SIM_STEP` dt, the CAM's frame-quantised opcodes (VJUMPM's one angle-step, VSLOOP's
  frame counts) would drift from the dt-continuous ones (VSMOVE); a future story that wants
  variable-dt stepping must add the accumulator then. *Found by Dev during implementation.*

### TEA (rework — red, round 2)

- **Conflict** (non-blocking): I owe the Reviewer this one. My RED suite asserted a FACT about the
  ROM that was false — "Wave 15 is AVOIDR on a CLOSED tube" (tp1-4.cam-behaviour.test.ts:30) — and
  my fixture then hid the error, because `flipperOnWave` set `s.level` without rebuilding `s.tube`.
  Both of AVOIDR's waves (10 and 15) are OPEN sheets. So the suite agreed with itself and proved
  nothing. Affects `tests/core/tp1-4.cam-behaviour.test.ts` (fixed here). The general lesson is
  worth a rule somewhere: a fixture that sets `level` must build that level's WELL, or every
  wave-indexed claim in this file is unfalsifiable. *Found by TEA during rework.*

- **Gap** (non-blocking): the audit has no finding covering "the direction opcodes must not wrap on
  a planar well", which is why nothing upstream caught F-1. The ROM states it twice — `STA WELTYP`
  is commented ";PREVENT WRAP" (ALWELG.MAC:186-187), and POLDEL's `BIT WELTYP / IFPL` guard skips
  the shortest-route reduction. Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json`. I
  second the Reviewer's recommendation that this become a finding in its own right, so it is gated
  forever rather than resting on one review. *Found by TEA during rework.*

### Reviewer (re-review — round 2)

- **Gap** (blocking for tp1-5, non-blocking here): `jchpla` has no zero-delta branch, but the ROM
  does. JCHPLA does `ASL` to put POLDEL's SIGN bit into carry and branches `IFCC` — carry-clear
  includes ZERO — so an invader standing on the player's exact lane deterministically takes the CCW
  arm (`ORA I,INVROT`, ALWELG.MAC:1883-84). Ours returns 0 from `shortestRot` and then does
  `if (rot !== 0) e.rot = rot`, leaving rotation at whatever it happened to be. Affects
  `src/core/enemies/interpreter.ts:215-218` (drop the zero case: sign-of-zero is POSITIVE, so a
  zero delta should set rot = +1). This is NOT new and NOT a regression — but **CHASER calls
  JCHPLA** (ALWELG.MAC:1848) to choose its pincer direction, and a chaser on the player's lane at
  the rim is the commonest situation in the game, so tp1-5 must close it or inherit a
  history-dependent chase direction. *Found by Reviewer during re-review.*

- **Improvement** (non-blocking): the pulse kill was not widened alongside the grab gate. `sim.ts:410`
  still reads `e.kind === 'pulsar' && e.pulsing && e.lane === pl` with no mid-jump gate, so a pulsar
  caught between two lanes can still electrocute the player, though (after this story's fix) it can
  no longer grab from there. The ROM cannot do it either: JPULMO's kill compares `INVAL2` to
  `CURSL2`, and mid-jump `INVAL2` holds the jump ANGLE with its $80 bit set, not a lane, so the
  comparison cannot match. Affects `src/core/sim.ts:410`. A jumping pulsar is a state THIS story
  created; two adjacent code paths now disagree about it. *Found by Reviewer during re-review.*

- **Improvement** (non-blocking): `speedFor`'s new `default` throws at RUNTIME but gives no
  COMPILE-TIME exhaustiveness. Casting `never` to `Enemy` to read `.kind` for the message also makes
  the arm accept a future kind's narrowed type, so when tp1-5 adds a sixth `EnemyKind` the build will
  still pass and only a runtime throw will catch it. The lang-review rule §3 asks specifically for
  `default: assertNever(x)`, whose `(x: never) => never` signature fails the BUILD instead. Affects
  `src/core/enemies/interpreter.ts:116-119`. Strictly better than the silent-NaN it replaced, so not
  blocking — but the stronger guarantee is two lines away, and tp1-5 is the story that needs it.
  *Found by Reviewer during re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **W-008's 8-angle-step jump is not pinned numerically**
  - Spec source: sprint/epic-tp1.yaml, tp1-4 `description` ("Subsumes … W-008")
  - Spec text: "A flip takes 8 angle-steps: 8 frames for a climbing flipper, WTTFRA
    steps/frame at the rim"
  - Implementation: the behaviour suite asserts only that a MOVJMP flip FREEZES the climb
    (a run of >= 3 frames with no depth gain), not that the run is exactly 8
  - Rationale: the frozen-frame count is emergent from JJUMPM's angle budget AND the CAM's
    yield points. My own trace gives 8, but an equally faithful interpreter can yield 9;
    asserting the number would force one trace and could reject a correct port — the worst
    outcome for a fidelity story. The ROM's claim is about angle-steps, which the sim
    boundary does not expose.
  - Severity: minor
  - Forward impact: W-008 has no failing test. Dev must implement it from the citation and
    the Reviewer must check it by citation, or it will silently not land. Filed as a
    non-blocking Delivery Finding.

- **VSLOPB's operand is asserted to exist, but not to equal anything**
  - Spec source: context-story-tp1-4.md, AC-2 ("All 11 CAM programs are transcribed from
    the ROM, not paraphrased")
  - Spec text: TOPPER carries `VSLOPB WTTFRA`; PULSCH carries `VSLOPB PUCHDE`
  - Implementation: `assertProgram` checks the opcode and that a one-byte operand is
    present (`{ any: true }`), but not its value
  - Rationale: VSLOPB's operand is a 6502 ZERO-PAGE ADDRESS — it names a RAM cell holding a
    per-wave parameter. Our port has no zero page, so there is no correct number to assert;
    how the wave-parameter is addressed is Dev's design choice (an index into a params
    enum, most likely). Pinning a value would be inventing ROM data.
  - Severity: minor
  - Forward impact: the *link* from VSLOPB to the right wave parameter (WTTFRA for TOPPER,
    PUCHDE for PULSCH) is unverified by test. TOPPER is tp1-5's program (the CHASER), so
    most of this lands there; the Reviewer should check PULSCH's by citation.

- **The CHASER (W-009) is not tested here at all**
  - Spec source: sprint/epic-tp1.yaml, tp1-4 `description` ("Subsumes … W-009")
  - Spec text: "An invader reaching the rim becomes a CHASER — a distinct state with its
    own CAM, counter and pincer rule"
  - Implementation: no test. The behaviour suite deliberately stops sampling an enemy once
    `depth >= 0.98`, so nothing it asserts depends on rim behaviour.
  - Rationale: tp1-4's seven ACs never mention the CHASER, and tp1-5's ACs claim it
    explicitly ("The CHASER rim state exists with the ROM's pincer rule"). Session scope is
    the higher authority. Testing it here would have forced Dev to build tp1-5's story.
  - Severity: minor (it is a scope decision, not a coverage hole in tp1-4)
  - Forward impact: TOPPER is still transcribed and pinned as data (AC-2 demands all 11
    programs), so tp1-5 inherits a verified program with no interpreter left to write.
    Filed as a blocking Conflict for SM/PM to rule on.

### Dev (implementation)

**Two of TEA's RED assertions could not be satisfied by any faithful interpreter. I changed
them. They are the first two entries, and they are the ones to review hardest.**

- **RED asserted an address operand of -1; the ROM stores the BYTE 0xFF**
  - Spec source: tests/core/tp1-4.cam-table.test.ts, `assertProgram` + tp1-4.cam-source-rules.test.ts
  - Spec text: `expect(got[i].operand).toBe(got[step.to].offset - 1)` — and, in the other file,
    `CAM[i]` must satisfy `b >= 0 && b <= 0xff`
  - Implementation: the assembler emits `(target - 1) & 0xff`, the interpreter's PC
    increment wraps to 8 bits, and the table test's expectation became `minusOne(target) =
    (target - 1) & 0xff`
  - Rationale: the two assertions are jointly unsatisfiable. TRALUP is the CAM's first
    program (`CAM:` labels its first byte), so it sits at offset 0, and its own
    `VSETPC TRALUP` assembles `.BYTE TRALUP-CAM-1` = `.BYTE -1` = the byte **0xFF**. CAMPC
    is one byte wide, so the dispatcher's `INC CAMPC` wraps 0xFF round to 0x00 and the jump
    lands. -1 is not a byte and the ROM could not hold it. I took the byte-array rule as the
    truth (it is the one that says what 6502 memory IS) and made the minus-one rule
    byte-exact. Every documented encoding rule survives: address operands still carry the
    minus-one, CAMWAV/TNEWCAM entries still take none, COWJM2 is still its own entry.
  - Severity: major (I edited the spec)
  - Forward impact: none to the interpreter. TEA/Reviewer should confirm the reading. The
    story's data is now byte-exact with the physical ROM, which it was not going to be.

- **RED asserted a SPIRAL flipper NEVER stops climbing; the ROM stops it for one frame**
  - Spec source: tests/core/tp1-4.cam-behaviour.test.ts, "wave 3 (SPIRAL)"
  - Spec text: `expect(longestFrozenRun(samples)).toBe(0)` — "a SPIRAL flipper climbs on
    every frame, including mid-flip"
  - Implementation: `.toBe(1)` — it climbs through all eight angle-steps of the jump and
    pauses only on the single frame that runs VJUMPS
  - Rationale: no faithful interpreter can return 0. VJUMPS and VSMOVE are different
    opcodes, and SPIRAL's `VEXIT` (ALWELG.MAC:2409) sits between them, so the frame that
    STARTS the jump contains no move. Zero was the OLD stepper's artifact — `flipper.ts:16`
    advanced depth unconditionally before it even looked at the flip, which is W-006's own
    citation. I verified the trace frame-by-frame: MOVJMP freezes for 8 frames, SPIRAL for
    1, the old code for 0 — so `toBe(1)` is strictly TIGHTER than the RED assertion (it now
    rejects the old behaviour AND MOVJMP's), and the load-bearing wave-2/wave-3 pair is
    intact.
  - Severity: major (I edited the spec)
  - Forward impact: none. The oracle (AC-4) and the other 11 behaviour tests passed
    unmodified.

- **The five per-kind steppers' UNIT TESTS were deleted with them, and so was `flipPatternForLevel`**
  - Spec source: session file, AC-5 ("the old per-kind steppers are deleted")
  - Spec text: AC-5 names the five `src/core/enemies/*.ts` modules; it says nothing about tests
  - Implementation: deleted `tests/core/enemies/{flipper.flip,flipper.spawn,pulsar,fuseball,
    spiker,tanker}.test.ts`, `tests/core/rules.flip-pattern.test.ts`, and
    `rules.ts`'s `FlipPattern`/`flipPatternForLevel`/`LevelParams.flipPattern`/`flipInterval`
  - Rationale: those suites import the deleted modules, so they cannot survive AC-5. Each
    tested either (a) a mechanism the ROM refutes — the flipTimer cadence (W-006), the
    4-frame flip (W-008), the coin-flip flip direction (W-007/W-025) — or (b) behaviour that
    still exists and is still covered through `stepGame`. I checked (b) case by case:
    splitTanker (sim.enemy-authentic, import re-pointed), the spiker turnaround + neediest-
    lane hop (sim.enemy-authentic, sim.enemy-motion-fidelity, sim.spikes), fuseball speed and
    steering (sim.enemy-motion-fidelity), the pulse cycle and dual climb speed
    (sim.enemy-authentic, sim.enemy-motion-fidelity), and W-022's vulnerable bit, which I
    RE-SEATED onto `stepGame` inside tp1-3's own suite rather than lose. No live behaviour
    lost its coverage: 917 → 926 tests (+31 new, −22 in the deleted files), 83 → 79 files.
  - Severity: major
  - Forward impact: `flipPatternForLevel` is gone from the public rules surface. Two
    `sim.difficulty` assertions on `flipInterval` went with it — "flippers flip faster at
    higher levels" is not something the ROM does, or can do, now that the cadence lives in
    the wave's program.

- **`fastestFlipperRimSpeed()` keeps its old number instead of the CAM's**
  - Spec source: src/shell/input.ts, the keyboard escape constraint
  - Spec text: `ROM_FPS / (moveFrames + flipFrames)` — 4 frames/lane at L33+, pinned by
    tests/shell/input.spinner.test.ts
  - Implementation: a local `DEEP_FLIPPER_RIM_FRAMES_PER_LANE = 4` in input.ts, with a
    comment naming tp1-5 as its owner
  - Rationale: the enemy that actually walks the rim is the CHASER (TOPPER), which is tp1-5.
    Its true cadence is a `VSLOOP 4` crouch plus a jump of JUMP_ANGLE_STEPS/WTTFRA frames ≈
    6.7 frames/lane — SLOWER than 4, which would WIDEN the escape margin and silently
    weaken an invariant another story pinned. I would rather leave the conservative number
    standing until the chaser exists to measure than move a safety property on a guess.
  - Severity: minor
  - Forward impact: tp1-5 must re-derive it from TOPPER and re-check KEY_SPIN_RATE's margin.
    Filed as a Delivery Finding.

- **VKITST and VFUSKI are no-ops; the cursor kill is resolved centrally**
  - Spec source: AC-1 ("the ROM's 20 opcodes")
  - Spec text: JKITST (1980-1993) and JFUSKI (1994-2003) each kill the cursor, per invader,
    mid-program
  - Implementation: both opcodes are present, dispatched, and do nothing; `resolvePlayerHits`
    in sim.ts still resolves every rim kill after the move
  - Rationale: our port has always resolved kills centrally, and the predicate is the same
    (shares the player's lane, at rim depth, not mid-jump) in the same frame. Implementing
    them inside the CAM as well would be a SECOND, competing kill path and would double-fire
    against the existing death suite. Documented at the head of interpreter.ts, not silently.
  - Severity: minor
  - Forward impact: tp1-5's TOPPER leans on VKITST — the chaser's crouch is
    `VSLOOP 4 / KICHEK: VKITST / VEXIT / VELOOP`. If the rim state needs the kill to fire
    from inside the program, that is the story that will find out.

- **The pulse clock stays per-pulsar (W-026 stays open), but moved out of the CAM**
  - Spec source: docs/audit — W-026 ("the pulse is a single GLOBAL phase")
  - Spec text: PULSON/PULTIM are global and MOVINV ticks them AFTER the invader loop
  - Implementation: `stepPulseClock` in sim.ts, called from `stepEnemies` after the CAM runs
    over every invader. Still one timer per pulsar; VCHKPU reads it.
  - Rationale: W-026 is not in tp1-4's ACs and the existing suite pins the per-pulsar
    `pulsing`/`pulseTimer` fields in eight files. I put the clock where the ROM puts it —
    outside the CAM, after the loop — without also rewriting what it counts. VCHKPU's link
    to the pulse is real and cited either way.
  - Severity: minor
  - Forward impact: W-026 remains open and its `ours` citation now points at sim.ts:192.

- **PUCHDE is a flat 20 frames; the per-wave table is not modelled**
  - Spec source: AC-2, PULSCH's `VSLOPB PUCHDE`
  - Spec text: TPUCHDE (ALWELG.MAC:680-684) is a per-wave table
  - Implementation: `PUCHDE_FRAMES = 20` in rules.ts, reached through a `CAM_PARAM` slot
  - Rationale: TPUCHDE's early rows are written in the symbols `PN`/`PC`, whose values are
    not in the audited extract; its wave-33 row seeds 20. Pulsars only appear from wave 17 in
    the ROM. Inventing the ramp would be inventing ROM data — the exact thing AC-2 forbids.
    The LINK (VSLOPB → the pulsar's chase delay) is what the CAM encodes, and that is exact.
  - Severity: minor
  - Forward impact: a later pulsar-fidelity story can fill in TPUCHDE without touching the
    interpreter — only the constant.

- **`makeEnemy` became generic, with one cast**
  - Spec source: none (an API change the rewrite forced)
  - Spec text: n/a
  - Implementation: `makeEnemy<K extends EnemyKind>(...): Extract<Enemy, { kind: K }>`, whose
    body ends in a single `as Extract<Enemy, { kind: K }>`
  - Rationale: every invader now carries four CAM registers, so the ~60 enemy object literals
    across the test suite had to be re-seated onto the constructor anyway. Returning the bare
    `Enemy` union would have forced every fixture that overrides a kind-specific field
    (`jitterTimer`, `pulseTimer`) to narrow a five-way union it already knows the answer to.
    TypeScript cannot check a switch on a type parameter against its return type; the cast
    says that once, in one place, instead of at every call site.
  - Severity: minor
  - Forward impact: none. `as any` and `as unknown as` are still absent (the lang-review gate
    checks cam.ts and passes).

### Dev (implementation — rework, round 2)

- **The mid-jump grab gate now reads the STATE, not the KIND (Reviewer F-3)**
  - Spec source: Reviewer Assessment F-3; JKITST (ALWELG.MAC:1980-1993)
  - Spec text: the ROM skips the cursor-kill check while the invader's $80 INVMOT bit is set
    (`LDA X,INVAC1 / IFPL`) — it gates on the JUMPING STATE, and says nothing about the kind
  - Implementation: `resolvePlayerHits` changed from `!(e.kind === 'flipper' && isJumping(e))` to
    `!isJumping(e)` (sim.ts:397-403)
  - Rationale: the Reviewer offered a choice — widen it, or log it as deliberate. I widened it. The
    old spelling was only ever correct because a flipper was the ONLY thing that could be mid-flip;
    the CAM gives a pulsar VJUMPS too (PULSCH), so leaving it would have let a mid-jump pulsar grab
    the player while a mid-jump flipper beside it could not — an asymmetry with no ROM basis and no
    test defending it. I did not guess: I made the change and ran the suite. **Zero regressions**, so
    the faithful reading costs nothing.
  - Severity: minor
  - Forward impact: pulsars (and any future jumper — tp1-5's chaser) now inherit the mid-flip
    fairness window. This is a small gameplay change nothing pinned before, in the direction of the
    ROM.

- **The assembler now REFUSES to emit a truncated jump target (Reviewer F-4)**
  - Spec source: Reviewer Assessment F-4
  - Spec text: the `& 0xff` mask silently truncates any address operand past 255, and the
    byte-range test cannot ever catch it — the mask guarantees its input is in range
  - Implementation: `assemble()` throws if a label sits past 0xff (cam.ts); TEA's
    `CAM.length <= 0x100` guard pins it from the outside as well
  - Rationale: the mask is the ROM's real encoding and had to stay, so the check belongs where the
    truncation would happen. tp1-5 grows this table; a silent failure with room to spare is a trap,
    not a margin.
  - Severity: minor
  - Forward impact: none today (the CAM is ~110 bytes). It fails loudly on the day it matters.

## Sm Assessment

### What this story is
Cluster C2, first half of the tempest primary-source audit (findings W-005..W-009).
Enemies in the Tempest ROM are **a bytecode VM, not state machines**. Our five per-kind
steppers in `tempest/src/core/enemies/` cannot express the ROM's behaviours at *any*
constant setting: MOVJMP ("move N frames then flip"), SPIRAL ("flip continuously while
climbing"), SPIRCH ("reverse direction every 2 jumps, then every 3"), COWJMP ("flip only
when not standing on a spike"), AVOIDR ("flip *away* from the player"), TOPPER ("crouch 4
frames at the rim, then jump toward the player at double angular speed").

This is a **rewrite** of `src/core/enemies/`, not a constant tweak. Size it accordingly:
8 points, and tp1-5 (the CHASER rim state) builds directly on the interpreter this story
lands.

### Acceptance criteria (7)
1. A CAM interpreter exists in core with the ROM's **20 opcodes**, each cited to source,
   pure and deterministic (no `Date`, no `Math.random` — the core/shell boundary in
   CLAUDE.md is the hard rule in this repo).
2. All **11 CAM programs** transcribed from the ROM, not paraphrased.
3. The flipper's program is selected **per wave from CAMWAV** — not one hard-coded
   behaviour.
4. **ORACLE TEST:** on wave 1, a flipper **never flips while climbing**. This is the
   sharpest behavioural difference from our current build and must be pinned as a test.
5. The old per-kind steppers are **deleted**, not left dead alongside the interpreter.
6. Determinism holds: `stepGame(state, input, dt)` gives identical output for identical
   input, driven by the seeded RNG in `GameState`.
7. `npm test -- citations` stays green.

### Primary source
`tempest/docs/2026-07-12-tempest-primary-source-audit.md` (cluster C2). Constants and
opcodes must be transcribed from Theurer's original 1981 assembler source, with each
citation carrying `file:line` — AC-1 and AC-7 make an uncited constant a failure.

### Routing rationale
`tdd` / phased. AC-4 is a behavioural oracle, which is exactly what a RED-phase test
should pin *before* any interpreter exists — a flipper that never flips while climbing on
wave 1 will fail loudly against the current steppers, which is the point. Han Solo (TEA)
takes it from here.

### Notes for the phases downstream
- **Scope discipline:** tp1-5 (CHASER rim state) is a *separate* story. Build the
  interpreter and the 11 programs; do not absorb tp1-5's rim behaviour.
- **The tp1-23 lesson, which this epic paid for once already:** a story's acceptance
  criteria are snapshotted into this session file at setup. If the epic's ACs are edited
  while this story is in flight, **the edit does not reach this story**. If scope moves,
  re-run setup rather than assuming the change propagated.
- **Do not touch red-baron.** rb4-1 (the radix sweep) is in flight in another checkout.

### Setup state
- Session file: `.session/tp1-4-session.md`
- Branch: `feat/tp1-4-cam-interpreter`, cut from `tempest/develop` @ `d21376a`
- Story context: `sprint/context/context-story-tp1-4.md`
- Story status: `in_progress` (committed, `26a6e7c`)

---
## TEA Assessment

**Tests Required:** Yes
**Status:** RED (9 failing, ready for Dev) — commit `689305e` on `feat/tp1-4-cam-interpreter`

**Test Files:**
- `tests/core/tp1-4.cam-table.test.ts` — the CAM's BYTES: 20 opcodes, operand widths, all
  11 programs decoded byte-exactly, CAMWAV, TNEWCAM, per-wave selection.
- `tests/core/tp1-4.cam-behaviour.test.ts` — what the bytes DO, through `stepGame` only.
  The oracle lives here.
- `tests/core/tp1-4.cam-source-rules.test.ts` — AC-5 (steppers deleted) + lang-review rules.

**Tests Written:** 31 across 3 files. **RED: 9 · GREEN: 3 (controls) · 19 blocked** on the
missing module (`src/core/enemies/cam.ts`), which is the RED signal for the two data suites.

Baseline is clean: the pre-existing suite is **917/917 passing, 83/83 files**, verified by
moving my three files aside and re-running. Nothing I added regressed anything.

### The RED, and why each one is red

| Failing test | The ROM says | We say today |
|---|---|---|
| **THE ORACLE** — wave-1 flipper holds its lane | `CAMWAV[0] = NOJUMP` (ALWELG.MAC:712): `VSMOVE / VEXIT / VSETPC` — no VJUMPS exists in the program | `flipper.ts:35` flips on a timer at every level |
| wave 17 wraps to wave 1 | `(wave-1) AND 0x0F` (DOTZAN) | no per-wave program at all |
| wave 2 (MOVJMP) freezes the climb mid-flip | no `VSMOVE` inside MOVJMP's jump loop | `flipper.ts:16` advances depth *before* the mid-flip early-return, so it climbs through every flip |
| wave 4 (SPIRCH) reverses after 2 flips, then 3 | `VSLOOP 2 / VCHROT / VSLOOP 3 / VCHROT` | `nextFloat(rng) < 0.5` — a fresh coin per flip |
| wave 5 (COWJMP) won't flip off a spike | `VELTST / VBR0PC COWJM2` | spikes do not enter the flip decision |
| wave 15 (AVOIDR) flees the player (×3 seeds) | `VCHPLA` then `VCHROT` — toward, then reversed | random |
| two identical flippers move in lockstep | same program, same PC | they share one RNG cursor and diverge |

**The wave-2 / wave-3 pair is the load-bearing one.** MOVJMP and SPIRAL differ by the
*position of a single VSMOVE*. Wave 2 must freeze the climb mid-flip; wave 3 must not. No
per-kind stepper with a tunable constant can be both at once, so this pair is what actually
forces an interpreter rather than a cleverer `stepFlipper`.

**The 3 GREEN tests are controls, not oversights:** SPIRAL's climb-through-flip, COWJMP's
bare-lane flip, and `stepGame`'s determinism all hold today and must *survive* the rewrite.

### What the tests bind Dev to (and what they leave free)

New API surface — deliberately small, all of it ROM-shaped:
`src/core/enemies/cam.ts` exporting `CAM`, `CAM_OPS`, `CAM_OPERAND_BYTES`, `CAM_ENTRY`,
`CAMWAV`, `TNEWCAM`, `flipperCamForWave(wave)`.

**The interpreter's own signature is NOT pinned.** Behaviour is asserted only through the
public `stepGame`, and only via `lane` / `depth` — the tube coordinates CLAUDE.md calls
fundamental. Rename every register you like; the suite will not notice.

Two things Dev must not get wrong, both pinned with citations:
1. **The minus-one asymmetry.** An in-program address operand is `target - 1` (the CAMA2F
   macro, ALWELG.MAC:1600) because the dispatcher's `INC CAMPC` completes the jump. A CAMWAV
   or TNEWCAM entry is a **raw** offset. Tidying the two into agreement puts every flipper
   one byte inside an instruction.
2. **COWJM2 is an entry point, not a program.** It is one byte below COWJMP and its only
   instruction is a `VEXIT`. Both of COWJMP's branches target COWJM2, so the loop always
   yields a frame. Collapse the two entries and the interpreter spins forever inside one frame.

Wiring seam: tests build enemies with `makeEnemy(kind, lane, depth, levelParams(level))`, so
**the wave's CAM must reach the flipper through `LevelParams`** — that is the natural place
for `flipperCamForWave(level)` to land.

### The trap that is not in the ACs

`npm test -- citations` (AC-7) is green now and **will go red the moment Dev edits
`flipper.ts` / `sim.ts` / `rules.ts`** — not because anything broke, but because the audit's
`ours` quotes point at lines this story deletes. Per `tempest/CLAUDE.md`:
- findings this story FIXES (W-005, W-006, and see the W-007 conflict) get
  `"remediated_by": "tp1-4"` in `docs/audit/findings/*.json`;
- for any cited line merely *moved*, run `node tools/audit/reanchor-citations.mjs --write`.

Do both **before committing**, or the gate fails with a confusing "does not match verbatim".

### Rule Coverage (lang-review/typescript.md)

| Rule | Test | Status |
|------|------|--------|
| §1 type-safety escapes (`as any`, `@ts-ignore`) | `has no type-safety escapes` | blocked on module |
| §3 explicit enum values (no implicit numbering) | `gives every opcode an explicit value` + `codes step by two` | blocked on module |
| §2 readonly/immutable shared state | `freezes the ROM tables` | blocked on module |
| §3 exhaustiveness over the opcode set | `decode()` rejects any byte that is not one of the 20 | blocked on module |
| §8 test quality (no vacuous assertions) | self-check, below | done |
| core purity (no `Date`/`Math.random`) | **already enforced** for all of `src/core` by `tests/rom-clock-sources.test.ts:166` (recursive) — not duplicated | green |

**Self-check:** every test carries a real assertion. Three explicit anti-vacuity guards:
the oracle requires a climb of >60 samples and >0.3 depth before "it never flipped" is
allowed to mean anything; the SPIRCH pattern test requires >= 6 observed flips; the AVOIDR
test runs 3 seeds so a random direction cannot pass by luck. TypeScript strictness errors in
my own test code (TS2731, TS18046) were found by the runner and fixed — `tsc --noEmit` now
reports only the expected `TS2307: Cannot find module '../../src/core/enemies/cam'`.

**Handoff:** To Yoda (Dev) for GREEN.
---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (tempest, branch `feat/tp1-4-cam-interpreter`):**
- `src/core/enemies/cam.ts` — **new.** The ROM's data: the 20 opcodes at their TABJSR byte
  values (each cited to `ALWELG.MAC:<line>`), the operand widths, all 11 programs written as
  the source lists them and assembled in two passes, CAMWAV, TNEWCAM, `flipperCamForWave`.
  Frozen. The assembler applies the CAMA2F minus-one to address operands and to nothing else.
- `src/core/enemies/interpreter.ts` — **new.** MOVINV's loop: resume the PC, execute opcodes
  through the dispatcher (each followed by its unconditional `INC CAMPC`, wrapped to a byte)
  until one yields the frame, then persist the PC on the invader. All 20 handlers.
- `src/core/enemies/{flipper,tanker,spiker,fuseball,pulsar}.ts` — **deleted** (AC-5).
- `src/core/state.ts` — every invader carries the CAM's registers (`camPc`, `camLoop`, `rot`,
  `direction`, `jumpAngle`); the invented `flipTimer`/`flipping`/`flipProgress`/`flipDir` are gone.
- `src/core/sim.ts` — `stepEnemies` is one loop over one interpreter, with no `switch (e.kind)`;
  `makeEnemy` hands each invader its program; `splitTanker` and the pulse clock moved here.
- `src/core/rules.ts` — `LevelParams.flipperCam` (WFLICAM); `flipPatternForLevel` deleted.
- `src/shell/render.ts`, `src/tools/contactSheet.ts`, `src/shell/input.ts` — read the new registers.
- `docs/audit/findings/*.json` — W-005/006/007/008/025 `remediated_by: tp1-4`; 9 findings whose
  cited lines MOVED into the new code re-anchored by hand; the rest by the tool.
- 18 test files re-seated onto `makeEnemy`; 7 files deleted with the code they tested.

**Tests:** **926/926 passing, 79/79 files (GREEN).** Baseline was 917/83; +31 from tp1-4's three
suites, −22 from the six stepper unit-test files and `rules.flip-pattern`, which tested either a
mechanism the ROM refutes or code that no longer exists. `npm run build` (tsc + vite) clean.
`npm test -- citations` green (AC-7).

**The ACs:**
1. ✅ 20 opcodes, each cited to `ALWELG.MAC:<line>`, pure (no `Date`, no `Math.random` — enforced
   recursively over `src/core` by `rom-clock-sources.test.ts`).
2. ✅ All 11 programs, decoded byte-exactly against the ROM by TEA's table suite.
3. ✅ The flipper's program comes from CAMWAV, per wave, via `LevelParams.flipperCam`.
4. ✅ **THE ORACLE: a wave-1 flipper never flips while climbing.** It holds its lane for a
   200-frame climb — because CAMWAV[0] is NOJUMP, whose program contains no VJUMPS.
5. ✅ All five steppers deleted; `stepEnemies` no longer dispatches movement on `e.kind`.
6. ✅ Determinism holds; two identical flippers now move in LOCKSTEP (they share a program and a
   PC, and no longer draw a coin each flip).
7. ✅ Citation gate green.

**Verified in the real game, not just in tests:** the pinned port 5273 turned out to be served by
the **a-2** checkout — screenshotting it would have verified someone else's code — so I served
this tree on 5283. The game boots with no console errors, and `/models.html` renders all six
actors through the real `drawEnemy` pipeline, including the flipper tumbling about the web spoke,
which is the render path this story rewired (`isJumping`/`rot`/`jumpProgress`).

**Two RED assertions were unsatisfiable and I changed them** — the byte-vs-(-1) address operand,
and SPIRAL's frozen-frame count. Both are logged as major deviations with the ROM trace that
forced them, and both left the suite STRICTER than it was. They are the first thing the Reviewer
should attack.

**Branch:** `feat/tp1-4-cam-interpreter` (pushed)

**Handoff:** To Obi-Wan Kenobi (Reviewer).
---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 926/926 green, tsc+vite clean, citation gate green, 0 smells |
| 2 | reviewer-edge-hunter | Yes | skipped | disabled | Disabled via `workflow.reviewer_subagents.edge_hunter` — domain covered by Reviewer directly (see F-1, F-4) |
| 3 | reviewer-silent-failure-hunter | Yes | skipped | disabled | Disabled via settings — domain covered by Reviewer directly (see F-8) |
| 4 | reviewer-test-analyzer | Yes | skipped | disabled | Disabled via settings — domain covered by Reviewer directly (see F-2, F-6) |
| 5 | reviewer-comment-analyzer | Yes | skipped | disabled | Disabled via settings — domain covered by Reviewer directly (see F-5) |
| 6 | reviewer-type-design | Yes | skipped | disabled | Disabled via settings — domain covered by Reviewer + rule-checker |
| 7 | reviewer-security | Yes | skipped | disabled | Disabled via settings — no attack surface (no network/IO/auth; pure sim + canvas) |
| 8 | reviewer-simplifier | Yes | skipped | disabled | Disabled via settings — domain covered by Reviewer directly |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via settings and pre-filled)
**Total findings:** 8 confirmed, 0 dismissed, 0 deferred

The seven disabled specialists' domains were covered by the Reviewer directly, not skipped. Every
finding below carries the tag of the domain it belongs to.

## Rule Compliance

Checklist: `.pennyfarthing/gates/lang-review/typescript.md`, plus tempest/CLAUDE.md's hard rules.
Every rule enumerated against every type/function the diff adds or changes.

| Rule | Enumerated | Verdict |
|------|-----------|---------|
| §1 type-safety escapes | `cam.ts`, `interpreter.ts`, `sim.ts`, `state.ts`, `rules.ts`, all 18 re-seated test files | **PASS** — no `as any`, no `as unknown as`, no `@ts-ignore`. The one cast, `makeEnemy`'s `as Extract<Enemy,{kind:K}>` (sim.ts:135), works around a real TS limit (a switch on a type parameter cannot be checked against the return type), is documented in place, and is confined to one line. |
| §2 generics/interfaces, `readonly` | `CAM`, `CAM_ENTRY`, `CAMWAV`, `TNEWCAM`, `CAM_OPERAND_BYTES`, `CamContext` | **PASS** — all ROM tables are `readonly` AND `Object.freeze`d. `readonly` alone is erased at runtime; the freeze is what actually stops a stray write, and `tp1-4.cam-source-rules.test.ts:128-130` pins it. `CamContext.spikes` is deliberately a mutable `number[]` — VSTRAI lays spike, which is JSTRAI's job. |
| §3 explicit enum values | `CAM_OPS` (20 members), `CAM_PARAM` (2) | **PASS** — a `const` object, not a TS enum, with every opcode carrying its explicit ROM hex byte (0x00…0x26) and a `file:line` citation on the defining line. |
| §3 exhaustiveness over a union | `runCam`'s opcode switch, `camParam`, `makeEnemy`, **`speedFor`** | **FAIL (1)** — `runCam` (`default: throw`), `camParam` (`default: throw`) and `makeEnemy` (throws after the switch) are all exhaustive. **`speedFor` (interpreter.ts:105-117) is not** — see F-7. |
| §4 null/undefined, `??` vs `\|\|` | `jumpAngle ?? 0`, `line.labels ?? []`, `e.fireCooldown ?? 0` | **PASS** — every new coalescence is `??`, and each guards a value where `0` is legitimate. |
| §5 modules / ESM | `cam.ts` ← `rules.ts` ← `interpreter.ts` ← `sim.ts` | **PASS** — no cycle (cam.ts imports nothing), no missing `.js` (this is a Vite/bundler app, not the arcade-shared ESM artifact — the `.js`-extension rule applies to the library, not here). |
| §8 test quality | 3 new suites + 18 re-seated | **PARTIAL** — no vacuous assertions in the new suites (each has an explicit anti-vacuity guard), but see F-2 (a fixture that silently tests the wrong tube) and F-6. |
| §10/§11 security, error handling | whole diff | **PASS** — no network, no IO, no auth, no deserialisation, no user-supplied strings. The core is a pure function of `(state, input, dt)`. Nothing to inject. |
| **CLAUDE.md: the core/shell boundary** | all of `src/core/**` incl. both new files | **PASS** — zero imports from `shell/`; zero `Date.now`/`new Date`/`performance.now`/`Math.random`/`requestAnimationFrame`/DOM. All time enters as `dt`; all randomness comes from the seeded RNG on `GameState`. Enforced recursively and independently by `tests/rom-clock-sources.test.ts`, which passes. |
| **CLAUDE.md: the citation gate** | `docs/audit/findings/*.json` | **PASS** — `npm test -- citations` green; `reanchor-citations.mjs` reports 177 correct / 0 lost. |
| **CLAUDE.md: tube space** | `lane`/`depth` throughout | **PASS** — no screen-space leakage into core. |

## Devil's Advocate

Assume this code is broken and argue it. The story's whole claim is fidelity to a 1981 ROM, so the
question is not "does it run" — 926 tests say it runs — but "does it lie about the ROM anywhere it
is not being watched?" The tests watch waves 1, 2, 3, 4, 5, 15 and 17. What is NOT watched is the
*shape of the well*, and that is where it breaks.

Every behavioural fixture is built by `flipperOnWave`, which sets `s.level` and never rebuilds
`s.tube`. `GameState.tube` is constructed once by `initialState` and only replaced on a real level
transition, so every one of these tests runs on **level 1's tube** — a closed, 16-lane circle —
no matter which wave's program it claims to exercise. For waves 2, 3, 4, 5 and 17 that is a
harmless coincidence, because those waves really are closed. For AVOIDR it is fatal: the test picks
wave 15 *specifically to get a closed tube* ("Wave 15, not wave 10: wave 10's sheet is OPEN"), and
wave 15 is **also open**. Both of AVOIDR's waves — 10 and 15 — are open sheets. The one program
whose entire purpose is a *direction* is the one program never tested on the board it actually runs
on, and the test's stated reason for choosing that wave is factually wrong.

Now the malice. `shortestRot` computes the way round with modular arithmetic, unconditionally. On an
open sheet there is no way round — the ROM says so out loud: `LDA I,0FF / STA WELTYP ;PREVENT WRAP`
(ALWELG.MAC:186-187), and POLDEL skips its `AND I,0F` reduction whenever WELTYP is set. So a player
standing more than half a board from an avoidance flipper is not fled from — he is **charged**. I
did not reason this out and assert it; I drove the sim on the real wave-15 tube and watched a
flipper at lane 2 walk 2→3→4→5→6 straight at a player on lane 13. The enemy named AVOIDR does the
one thing it is named for the opposite of, on 100% of the waves it appears on, and the suite is
green.

What else is unwatched? A confused *future* reader: four test files still explain their fixtures
with "flipTimer 999 keeps it from flipping", a field this story deleted — the fixtures now hold
their lane only because `levelParams(1)` hands them NOJUMP, which nothing says. And a stressed
*future writer*: the assembler masks address operands with `& 0xff`, so the moment the CAM grows
past 256 bytes — which tp1-5 will do, it adds the chaser — a jump silently truncates, and the byte-
range test that looks like it guards this **cannot ever fail**, because the mask guarantees the
value it checks is in range. That is a trap baited for the next story.

## Design Deviations — Reviewer audit

### Reviewer (audit)

- **Dev: "RED asserted an address operand of -1; the ROM stores the BYTE 0xFF"** → ✓ **ACCEPTED.**
  I re-opened the source. TRALUP is the CAM's first program and `CAM:` labels its first byte, so
  `VSETPC TRALUP` genuinely assembles `.BYTE TRALUP-CAM-1` = `.BYTE -1` = 0xFF, and CAMPC is one
  byte, so `INC CAMPC` carries it to 0. The two RED assertions were jointly unsatisfiable and Dev
  resolved them toward the hardware, not away from it. The encoding rules all survive. Correct call.
- **Dev: "RED asserted a SPIRAL flipper NEVER stops climbing; the ROM stops it for one frame"** →
  ✓ **ACCEPTED.** Verified against the byte layout: SPIRAL's `VEXIT` (2409) sits between `VJUMPS`
  and the loop's `VSMOVE` (2413), so the jump-start frame cannot contain a move. `toBe(1)` is
  strictly tighter than `toBe(0)` — it rejects the old always-climb code AND MOVJMP's 8-frame
  freeze. Tightening a test you were handed is the right instinct; doing it with a frame trace is
  the right method.
- **Dev: "the steppers' UNIT TESTS were deleted with them, and so was `flipPatternForLevel`"** →
  ✓ **ACCEPTED.** I checked the claim that no live behaviour lost coverage, kind by kind:
  splitTanker (sim.enemy-authentic), spiker turnaround + neediest-lane hop (sim.enemy-authentic,
  sim.enemy-motion-fidelity, sim.spikes), fuseball speed/steering (sim.enemy-motion-fidelity),
  pulse cycle + dual climb (sim.enemy-authentic, sim.enemy-motion-fidelity), and W-022's vulnerable
  bit, which was re-seated onto `stepGame` rather than dropped. The accounting holds.
- **Dev: "`fastestFlipperRimSpeed()` keeps its old number"** → ✓ **ACCEPTED.** Refusing to move
  another story's safety invariant on a guess is the correct instinct, and the direction of the
  error is the safe one (the true value is lower, which only widens the margin). Filed for tp1-5.
- **Dev: "VKITST and VFUSKI are no-ops"** → ✓ **ACCEPTED**, with a caveat that becomes F-3: the
  central `resolvePlayerHits` they defer to has NOT been updated for the fact that pulsars can now
  be mid-jump. The deferral is sound; the deferred-to code is now incomplete.
- **Dev: "the pulse clock stays per-pulsar but moved out of the CAM"** → ✓ **ACCEPTED.** It is
  where MOVINV puts it (after the invader loop), W-026 stays open and re-anchored, and the scope
  call is right.
- **Dev: "PUCHDE is a flat 20 frames"** → ✓ **ACCEPTED.** Refusing to invent the PN/PC rows is
  exactly right for a story whose AC-2 forbids paraphrase.
- **Dev: "`makeEnemy` became generic, with one cast"** → ✓ **ACCEPTED.** One documented cast at the
  definition beats sixty union-narrowings at the call sites.
- **TEA: all four deviations** → ✓ **ACCEPTED.** TEA's refusal to pin W-008's frame count
  numerically was vindicated: the count is 8, but the *frozen-run* it would have pinned turned out
  to be implementation-dependent, exactly as predicted.
- **UNDOCUMENTED (Reviewer): the mid-jump grab exemption was left flipper-only while the rewrite
  gave pulsars a jump.** Spec/precedent said: an invader caught between two lines cannot grab (the
  ROM skips the check while the $80 INVMOT bit is set). Code does: exempts `e.kind === 'flipper' &&
  isJumping(e)` only (sim.ts:399). Before this story a pulsar could not be mid-flip; now PULSCH
  gives it VJUMPS, so a brand-new state exists that the grab gate does not know about. Not logged by
  Dev. Severity: **M**. See F-3.
- **UNDOCUMENTED (Reviewer): `shortestRot` wraps on open wells.** ROM says (`;PREVENT WRAP`,
  WELTYP, POLDEL) that a planar well takes the raw linear delta. Code applies modular arithmetic
  unconditionally (interpreter.ts:120-125). Not logged by Dev, not covered by TEA. Severity: **H**.
  See F-1.

---
## Reviewer Assessment

**Verdict:** REJECTED

One High. The interpreter is, on the whole, excellent work — the ROM data is byte-exact, the
dispatcher is faithful down to the auto-increment's byte wrap, the oracle lands, and the two
unsatisfiable RED assertions were resolved *toward* the hardware with a frame trace rather than
argued away. It fails on one thing, and it fails on it completely: the shape of the well.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **[HIGH]** `[EDGE]` **F-1: AVOIDR charges the player on every wave it runs on.** `shortestRot` reduces the lane delta modulo `laneCount` unconditionally. On an OPEN sheet there is no seam to go round, and the ROM says so explicitly: `LDA I,0FF / STA WELTYP ;PREVENT WRAP` (ALWELG.MAC:186-187), after which POLDEL **skips** its `AND I,0F` reduction. Both of AVOIDR's waves — **10 and 15** — are open sheets (`ROM_OPEN` via `ROM_REMAP`), so this is not an edge case: it is 100% of the program's exposure. Driven on the real wave-15 tube, a flipper at lane 2 with the player at lane 13 walks **2→3→4→5→6, straight at him**. VCHPLA also drives PULSCH, so pulsars inherit it. | `src/core/enemies/interpreter.ts:120-125` (`shortestRot`), reached from `jchpla` (VCHPLA) and `jfuseup` | Gate the modular reduction on `tube.closed`; on an open well return `Math.sign(to - from)`. **I verified this fix: ~5 lines, all 924 behavioural tests still pass** (the only fallout is line drift in the citation anchors → `node tools/audit/reanchor-citations.mjs --write`). |
| **[HIGH]** `[TEST]` **F-2: the CAM behaviour suite tests every wave on the WRONG WELL — which is why F-1 shipped green.** `flipperOnWave` sets `s.level` but never rebuilds `s.tube`, and `GameState.tube` is only replaced on a real level transition. So all 12 behaviour tests run on **level 1's closed 16-lane circle**, whatever wave they name. For waves 2/3/4/5/17 that is harmless coincidence. For AVOIDR it is fatal — and the test's own comment picks wave 15 *because* it believes wave 15 is closed ("Wave 15, not wave 10: wave 10's sheet is OPEN"). Wave 15 is open too. | `tests/core/tp1-4.cam-behaviour.test.ts:48-53` | Rebuild the tube: `s.tube = tubeForLevel(level)`. Then add the RED test F-1 needs — AVOIDR on an open sheet, player more than half a board away. Expect the current code to fail it. |
| [MEDIUM] `[SILENT]` **F-3: the mid-jump grab exemption never learned that pulsars can now jump.** `resolvePlayerHits` exempts `e.kind === 'flipper' && isJumping(e)`. Before this story only flippers had a mid-flip state; PULSCH now gives pulsars `VJUMPS`, so a pulsar caught between two lines at the rim **still grabs**, while a flipper in the identical state does not. The ROM's rule (skip the check while the $80 INVMOT bit is set) is about the *state*, not the *kind*. Undocumented — not in Dev's deviation log. | `src/core/sim.ts:399` | Either widen to `!isJumping(e)` (more faithful — check the death suite) or log it as a deliberate deviation with a reason. Do not leave it silent. |
| [MEDIUM] `[EDGE]` **F-4: the CAM has no size guard, and the test that looks like one cannot fail.** The assembler masks address operands with `& 0xff` (cam.ts:280). The moment the CAM exceeds 256 bytes a jump target silently truncates — and `expect(b >= 0 && b <= 0xff)` (cam-source-rules.test.ts:139) can **never** catch it, because the mask *guarantees* the value it checks is in range. It is a vacuous guard against precisely the failure it appears to cover. **tp1-5 adds the chaser to this table.** | `src/core/enemies/cam.ts:280`, `tests/core/tp1-4.cam-source-rules.test.ts:139` | Assert `CAM.length <= 0x100` (and ideally throw in `assemble()` if a label exceeds 0xff). One line, and it disarms a trap laid directly in tp1-5's path. |
| [MEDIUM] `[DOC]` **F-5: four test files still explain their fixtures with a field that no longer exists.** "flipTimer 999 keeps it from flipping", "flipTimer parked at 999 so no enemy flips lanes mid-window", "flipTimer huge: no lane flips". `flipTimer` was deleted by this story. The fixtures now hold their lane only because `levelParams(1)` hands them NOJUMP — which nothing states. The comments do not merely go stale; they actively misdirect the next reader to grep for a field that is gone. | `sim.enemy-fire.test.ts:55`, `sim.superzapper.test.ts:109`, `sim.enemy-authentic.test.ts:132`, `sim.enemy-motion-fidelity.test.ts:263` | Rewrite each to say what is actually true: "wave 1's CAM is NOJUMP, so this flipper holds its lane". |
| [LOW] `[TEST]` **F-6: fixtures build wave-1 enemies on wave-2/3 boards.** `fireBoard(2, [makeEnemy('flipper', 4, 0.4, levelParams(1))])` produces a flipper running NOJUMP on a board where the sim would have given it MOVJMP — a state the game can never reach. It works, and it preserves the old fixture's intent, but it is a lie about the wave. | `sim.enemy-fire.test.ts:57,69` (and siblings) | Prefer an explicit `camPc: CAM_ENTRY.NOJUMP` override, which *says* "parked so it holds its lane", over a mismatched `levelParams`. |
| [LOW] `[RULE]` **F-7: `speedFor` is the one switch in the diff that does not throw.** Confirmed by the rule-checker against checklist §3. `runCam`, `camParam` and `makeEnemy` all have throwing defaults; `speedFor` has none, and `noImplicitReturns` is off — so a sixth `EnemyKind` would compile and silently return `undefined`, making every speed `NaN`. | `src/core/enemies/interpreter.ts:105-117` | Add the `default:`/`assertNever` throw the sibling switches already have. |
| [LOW] `[SILENT]` **F-8: two handlers no-op instead of complaining.** `jjumpm` returns 0 — *"jump done"* — when `jumpAngle` is undefined, and `jfuseup`/`jchkpu` silently return for the wrong `kind`. All three are currently unreachable (FUSELR, the only program with a VJUMPM and no VJUMPS, is transcribed but never entered). They are the right *shape* — but a wrong-kind invader arriving at VSFUSE is a programmer error, and it would vanish. | `interpreter.ts:189, 213, 246` | Consider throwing, as `runCam`/`camParam` already do for their impossible cases. Non-blocking. |

`[TYPE]` — no findings. The type work is the strongest part of the diff: the ROM tables are
`readonly` *and* frozen (the freeze is what actually matters at runtime, and it is pinned by a
test), `CAM_OPS` carries explicit ROM byte values rather than implicit enum numbering, and the one
cast in `makeEnemy` is a documented workaround for a real TypeScript limit, not an escape hatch.

`[SEC]` — no findings, and none possible: the core is a pure function of `(state, input, dt)` with
no network, no IO, no auth, no deserialisation and no user-supplied strings. The seeded-RNG and
no-clock rules that make it testable also make it inert as an attack surface. Verified by
`tests/rom-clock-sources.test.ts`.

`[SIMPLE]` — no findings. I went looking for over-engineering in the two-pass assembler and did not
find it: hand-computing 110 byte offsets would have hidden a transcription error as a plausible
number, and the assembler makes the eleven programs read like the source listing. The `MAX_OPS_PER_FRAME`
backstop is 4 lines and buys a loud failure instead of a hung frame. Both earn their keep.

**Data flow traced:** player spinner → `input.spin` → `stepPlayer` → `s.player.lane` →
`currentLane()` → `ctx.playerLane` → `jchpla` (VCHPLA) → `e.rot` → `jjumps`/`jjumpm` → `e.lane`.
**This is the path F-1 corrupts:** every consumer is correct except the one modular reduction at
`interpreter.ts:122`, which mis-signs `rot` whenever the well has no seam and the player is more
than half a board away.

**Pattern observed (good):** `runCam` mirrors MOVINV structurally — resume the PC, execute, let the
dispatcher's own `INC CAMPC` fall out of the switch for *every* opcode, persist the PC. Because the
increment is factored out exactly as the hardware factors it, the minus-one operands and the 0xFF
wrap fall out for free instead of needing special cases. `src/core/enemies/interpreter.ts:317-321`.

**Error handling:** `runCam` throws on an unknown opcode and on a program that never yields
(`interpreter.ts:262, 316`); `camParam` throws on an unknown slot. All three are unreachable with
frozen ROM data — they are asserts against programmer error, and loud beats a hung frame. The gap is
F-7/F-8, where three sibling paths chose silence instead.

**Handoff:** Back to Han Solo (TEA) — F-1 is a logic bug that wants a failing test *first* (AVOIDR
on an open sheet), and F-2 is the fixture defect that let it through. Yoda's fix is then ~5 lines.
---
## TEA Assessment (rework — round 2)

**Tests Required:** Yes
**Status:** RED (7 failing, ready for Dev)

The Reviewer was right, and the failure was mine. My suite did not merely miss the bug — it
*asserted the false premise that hid it*. The header claimed "Wave 15 is AVOIDR on a CLOSED tube",
and `flipperOnWave` never rebuilt `s.tube`, so every test ran on level 1's closed 16-lane circle and
my wrong premise appeared to hold. A suite that agrees with itself proves nothing.

### What I fixed in the fixture

`flipperOnWave` now builds the wave's real well (`s.tube = tubeForLevel(level)`, and sizes `s.spikes`
to it). I verified independently against `geometry.ts`: `ROM_REMAP[14] = 0x0a → ROM_OPEN[10] = 0xff`,
so **wave 15 is open**, and so is wave 10 — AVOIDR's only two waves. The oracle helper `signedDelta`
became `laneDelta(tube, …)`, which branches exactly as POLDEL does: modular on a closed tube,
raw linear on an open sheet.

**The tube rebuild broke none of the existing tests** — the oracle, waves 2/3/4/5/17, determinism and
lockstep all still pass, because those waves really are closed. The coincidence held everywhere
except the one place it mattered.

### The RED, and why each one is red

| Failing test | The ROM says | We do today |
|---|---|---|
| **wave 15 / wave 10, player across the half-board line** (×3) | on a planar well POLDEL returns the RAW delta — WELTYP=0xFF, ";PREVENT WRAP" (ALWELG.MAC:186-187) | `shortestRot` reduces mod `laneCount` unconditionally, so it aims through a seam that does not exist. Judged flips come back `[1, 1, -1, 1, …]` — **the avoidance flipper charges the player** |
| **wave 15, nearby player** (×3 seeds) | AVOIDR flees, and keeps fleeing | it flees correctly until it puts half a board between them, then the wrap inverts and it **turns around and charges back**. This is the most damning of the six: it is an ordinary starting position, and I had assumed it would pass either way |
| **every `switch (e.kind)` is exhaustive** | — (lang-review §3) | `speedFor` is the one switch in the diff with no `default`. Add a sixth `EnemyKind` — which is precisely what tp1-5 does — and it returns `undefined`, making every speed `NaN` |

### The trap I closed without a RED test

`CAM.length <= 0x100` is GREEN today (the CAM is ~110 bytes) and is a guard, not a failing test. It
closes the Reviewer's F-4: the assembler masks address operands with `& 0xff`, so a CAM grown past
256 bytes truncates a jump target **silently** — and the existing byte-range rule *cannot* catch it,
because the mask guarantees its input is in range. It was a vacuous guard against exactly the failure
it appeared to cover. tp1-5 grows this table; the trap is disarmed now, before it is walked into.

### What Dev must do (and what I proved about it)

I applied both fixes myself, ran the suite, and reverted — so these are measured, not guessed:

1. **F-1** — gate the modular reduction in `shortestRot` on `tube.closed`; on an open sheet return
   `Math.sign(to - from)`. (~5 lines, `interpreter.ts:120-125`.)
2. **F-7** — give `speedFor` the `default: throw` its three sibling switches already have.

With both applied, **all 930 behavioural tests pass and nothing regresses.** The only fallout is
citation line-drift in `interpreter.ts`, which is the routine
`node tools/audit/reanchor-citations.mjs --write` that tempest/CLAUDE.md already mandates for any
touched cited file. Do that before committing or AC-7 goes red with a confusing message.

**Not mine to fix, still open:** F-3 (the mid-jump grab gate never learned pulsars can now jump —
a design call, and it needs a deviation entry either way) and F-5 (four test files still explain
their fixtures with the deleted `flipTimer` field).

**Baseline:** 932 tests, 925 passing, 7 red — all 7 mine, all intentional. Zero regressions in the
other 77 files.

**Handoff:** To Yoda (Dev) for GREEN.
---
## Dev Assessment (rework — round 2)

**Implementation Complete:** Yes
**Tests:** **932/932 passing (GREEN)**, `npm run build` clean, citation gate green (0 lost).

Obi-Wan's High was real, and Han's RED pinned it exactly. All 7 red tests are now green and nothing
else moved.

**The fix (F-1 — the High):** `shortestRot` folded the lane delta into "the shorter way round" on
every well. A planar well has no way round, and the ROM says so twice — `STA WELTYP` carries the
comment `;PREVENT WRAP` (ALWELG.MAC:186-187), and POLDEL's `BIT WELTYP / IFPL` guard skips the
`AND I,0F` reduction whenever it is set. It now returns the plain signed difference on an open
sheet. Five lines, and AVOIDR stops charging the player on the only two waves it ever runs on.

That this was a *direction inversion* rather than a rounding slip is worth keeping in mind: folding
a sheet as if it were a tube does not make the answer slightly wrong, it makes it exactly backwards
whenever the player is more than half a board away.

**Also fixed, from the review:**
- **F-7** — `speedFor` was the one switch on `e.kind` with no `default`. It now throws, like its
  three siblings. A sixth `EnemyKind` (tp1-5 adds one) would have returned `undefined` and turned
  every speed, and then every depth, into `NaN` — silently.
- **F-4** — the assembler now throws on a jump target past 0xff instead of masking it into a
  plausible-looking wrong byte.
- **F-3** — the mid-jump grab gate now reads the jumping STATE rather than the kind, because the
  CAM gave pulsars a jump and the old spelling would have let them grab from between two lanes.
  Logged as a deviation; zero regressions.
- **F-5** — the four fixtures that still explained themselves with `flipTimer: 999` now say what is
  actually true: wave 1's program is NOJUMP, so the flipper holds its lane.

**Left open, deliberately:** F-6 (fixtures that build wave-1 enemies on wave-2/3 boards). It is a
LOW, the comments now name the mechanism explicitly, and re-seating them onto an explicit
`camPc: CAM_ENTRY.NOJUMP` is churn across a dozen files for no behavioural gain. Recorded here so
the next reader knows it was a decision and not an oversight.

**Branch:** `feat/tp1-4-cam-interpreter` (pushed)

**Handoff:** To Obi-Wan Kenobi (Reviewer) for re-review.
---
## Subagent Results (re-review — round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 932/932, build clean, citations 10/10, reanchor 0 lost, 0 smells, scope confined to the 3 intended src files |
| 2 | reviewer-edge-hunter | Yes | skipped | disabled | Disabled via settings — covered by Reviewer (R-1, R-2) |
| 3 | reviewer-silent-failure-hunter | Yes | skipped | disabled | Disabled via settings — covered by Reviewer (R-2) |
| 4 | reviewer-test-analyzer | Yes | skipped | disabled | Disabled via settings — I re-ran the AVOIDR suite myself and confirmed the closed-tube control still passes |
| 5 | reviewer-comment-analyzer | Yes | skipped | disabled | Disabled via settings — F-5's four stale comments verified rewritten |
| 6 | reviewer-type-design | Yes | skipped | disabled | Disabled via settings — covered by rule-checker (R-3) |
| 7 | reviewer-security | Yes | skipped | disabled | Disabled via settings — no attack surface |
| 8 | reviewer-simplifier | Yes | skipped | disabled | Disabled via settings — the fix is 5 lines; nothing to simplify |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (R-3), dismissed 0, deferred 0 — **no §13 fix-introduced regressions** |

**All received:** Yes (2 enabled subagents returned; 7 disabled via settings)
**Total findings:** 3 confirmed (1 Medium, 2 Low), 0 dismissed, 0 deferred — **none blocking**

## Rule Compliance (re-review)

Checklist §13 (fix-introduced regressions) is the one that matters on a rework, and it is the one I
led with. Re-scanned the fix diff against §1-§12, independently and via the rule-checker:

| Rule | Verdict on the fix diff |
|------|------------------------|
| §13 fix-introduced regressions | **PASS** — no `as any`, no `as unknown as`, no `@ts-ignore`, no `\|\|` where `??` belongs, no debug code, no cast masking a real type error. The classic three fix-regressions are all absent. |
| §1 type-safety escapes | **PASS** — see R-3 for the one nuance (a plain `as` on a `never`, which is not an escape but is weaker than the rule's preferred `assertNever`). |
| §3 exhaustiveness | **PASS with R-3** — `speedFor` now throws, as `runCam`/`camParam`/`makeEnemy` already did. The rule's letter asks for `assertNever`; see R-3. |
| §4 null/undefined | **PASS** — `shortestRot`'s reordered guard is exactly equivalent on a closed tube. I verified the domain myself: `to` is always `currentLane()` (an integer wrapped into `[0, laneCount)`) and `from` is always an `e.lane` written through `wrapLane`, so `to === from` ⟺ `forward === 0`. The reorder cannot change a closed-tube answer. |
| §11 error handling | **PASS** — the assembler's new throw runs ONCE at module load (`const assembled = assemble(PROGRAM)`), not per frame, so it cannot crash a game frame; it fails the build instead. Correct placement. |
| **core purity** | **PASS** — no clock, no coin, no DOM, no shell import in any touched core file. |

## Devil's Advocate (re-review)

The fix is five lines, and five-line fixes are where reviewers get lazy. So: what did it NOT fix?

`shortestRot` is now right, but `jchpla` — its only rule-driven caller — still is not, and the gap is
in the branch the fix did not touch. POLDEL returns a signed delta; JCHPLA then does `ASL` to put the
SIGN bit into carry and branches `IFCC`. Carry-clear means "bit 7 was zero", and **zero is not
negative** — so when the invader sits on the player's exact lane, the ROM takes the `IFCC` arm and
sets INVROT to CCW, unconditionally. It has no third branch. Ours returns 0 from `shortestRot` and
`jchpla` then does `if (rot !== 0) e.rot = rot` — it leaves the rotation at whatever it happened to
be. So on the one lane the player is actually standing on, our invader's flee/chase direction is a
function of its own history rather than of the rule, and the ROM's is not.

That is not a regression — the old code did the same — but it is now the last untruth in a function
this story exists to make true, and it does not stay small: **CHASER calls JCHPLA** (ALWELG.MAC:1848)
to pick the pincer direction, and a chaser sitting on the player's lane at the rim is the single most
ordinary situation in Tempest. tp1-5 inherits this.

Second: the grab gate was widened to read the jumping STATE rather than the kind — correctly — but
the *pulse* kill three lines below it (`sim.ts:410`) was not. A mid-jump pulsar can still electrocute
you from between two lanes, while a mid-jump pulsar cannot grab you from there. The ROM cannot do the
former either: JPULMO's kill compares `INVAL2` against `CURSL2`, and mid-jump `INVAL2` holds the jump
ANGLE with its $80 bit set, not a lane — so the comparison cannot match. The rewrite created a state
(a jumping pulsar) that two adjacent code paths now disagree about.

Neither is a blocker. Both are the shape of thing that becomes a finding in someone else's audit.

## Design Deviations — Reviewer audit (round 2)

- **Dev: "the mid-jump grab gate now reads the STATE, not the KIND"** → ✓ **ACCEPTED.** This is the
  branch I hoped for. JKITST gates on `IFPL` — the INVMOT bit — and says nothing about appearance.
  Dev did not argue it, he changed it and ran the suite: zero regressions, so fidelity was free. The
  one thing it left behind is the pulse kill (R-2).
- **Dev: "the assembler now REFUSES to emit a truncated jump target"** → ✓ **ACCEPTED**, and placed
  correctly: at module load, so it fails the build rather than a frame.
- **Dev: F-6 deliberately left open** → ✓ **ACCEPTED.** Re-seating a dozen fixtures onto an explicit
  `camPc` for a LOW, after the comments now name the mechanism outright, is churn without behaviour.
  Recording it as a decision rather than silently skipping it is exactly right.

---
## Reviewer Assessment (re-review — round 2)

**Verdict:** APPROVED

Both Highs are closed, and closed properly — not papered over. I verified the fix rather than taking
the claim: AVOIDR now flees on both of the waves it actually runs on, and the closed-tube control
still passes, so the fix narrowed the behaviour to the ROM's rather than simply inverting it.

`[EDGE]` **F-1 — CONFIRMED FIXED.** `shortestRot` now branches on `tube.closed`, mirroring POLDEL's
`BIT WELTYP / IFPL` guard, and the citation is on the line. The three open-sheet tests and the three
seeded near-player tests all pass; the closed-tube rule is untouched (`laneDelta(closed, 2, 13) ===
-5` still holds). What sold me is that Dev did not merely satisfy the test — the reordered guard is
*exactly* equivalent on a closed tube, which I checked against the callers rather than assuming:
`to` is always `currentLane()`, an integer in `[0, laneCount)`.

`[TEST]` **F-2 — CONFIRMED FIXED.** The fixture builds the wave's real well now, and TEA closed the
loop honestly: the false premise in the header ("wave 15 is a CLOSED tube") is gone, replaced by the
ROM_REMAP/ROM_OPEN derivation. The rebuild broke none of the closed-wave tests, which is the proof
that the coincidence was a coincidence.

`[SILENT]` **F-3 — CONFIRMED FIXED**, and fixed the *right* way. Dev took the faithful branch
(`!isJumping(e)`) rather than logging an excuse, and measured it: zero regressions. See R-2 for the
one adjacent path it did not carry over to.

`[EDGE]` **F-4 — CONFIRMED FIXED.** The assembler throws on a target past 0xff, at module load, so it
fails the build rather than a frame. TEA's `CAM.length <= 0x100` pins it from outside. The vacuous
guard is no longer vacuous.

`[DOC]` **F-5 — CONFIRMED FIXED.** All four comments now name the real mechanism (wave 1's NOJUMP)
instead of a deleted field.

`[RULE]` **F-7 — FIXED, with a residual (R-3).** `speedFor` throws now. But the rule asks for
`assertNever`, and a cast is not that: it protects at runtime, not at build time.

`[TYPE]` no new findings — the rule-checker confirms no §13 fix-introduced regressions, which is the
check that matters on a rework.
`[SEC]` no findings — still a pure sim, no surface.
`[SIMPLE]` no findings — a five-line fix and two guard clauses; there is nothing here to simplify.

### What is still open (none blocking)

| Severity | Issue | Location |
|----------|-------|----------|
| [MEDIUM] `[EDGE]` | **R-1: `jchpla` has no zero-delta branch, but the ROM does.** `ASL`+`IFCC` treats a delta of ZERO as positive and sets CCW unconditionally; ours leaves rotation at whatever it was. Pre-existing, not a regression — but **CHASER calls JCHPLA**, and a chaser on the player's lane at the rim is the commonest situation in Tempest. **tp1-5 must close this or inherit a history-dependent chase direction.** | `interpreter.ts:215-218` |
| [LOW] `[SILENT]` | **R-2: the pulse kill was not widened alongside the grab gate.** A mid-jump pulsar can still electrocute from between two lanes, though it can no longer grab from there. The ROM can do neither (JPULMO compares INVAL2, which mid-jump holds an angle). A jumping pulsar is a state this story created. | `sim.ts:410` |
| [LOW] `[RULE]` | **R-3: `speedFor`'s default is a runtime throw, not compile-time exhaustiveness.** §3 asks for `assertNever(x)`, whose `(x: never) => never` signature fails the BUILD when a sixth kind lands. tp1-5 adds one. | `interpreter.ts:116-119` |

These are recorded as Delivery Findings and routed to tp1-5, which is the story that touches every
one of them. None of them is named by any of tp1-4's seven acceptance criteria, and I will not hold a
correct story hostage to the next one's prerequisites.

### The ACs, verified independently

1. 20 opcodes, each cited to `ALWELG.MAC:<line>`, pure — ✅ (core-purity guard passes recursively)
2. All 11 programs, decoded byte-exactly against the ROM — ✅
3. Flipper's program per wave from CAMWAV — ✅
4. **ORACLE: a wave-1 flipper never flips while climbing** — ✅
5. All five steppers deleted; no `switch (e.kind)` movement dispatch — ✅
6. Determinism holds; two identical flippers move in lockstep — ✅
7. `npm test -- citations` green — ✅ (10/10, reanchor reports 0 lost)

**Data flow traced:** spinner → `input.spin` → `s.player.lane` → `currentLane()` → `ctx.playerLane` →
`jchpla`/`jfuseup` → `shortestRot` → `e.rot` → `jjumps`/`jjumpm` → `e.lane`. The one corruption on
this path is gone; the residual (R-1) is at the terminus, in `jchpla`'s zero case.

**Pattern observed (good):** the fix is expressed as the ROM expresses it — a guard named for
`WELTYP`, carrying the comment `;PREVENT WRAP` verbatim. The next reader does not have to rediscover
why an open sheet is different; the source says so on the line.

**Error handling:** two new throws, both correctly placed — the assembler's at module load (fails the
build, not a frame), `speedFor`'s at the impossible arm. Neither is reachable in normal play.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story.