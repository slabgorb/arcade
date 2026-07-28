---
story_id: "sw8-9"
jira_key: "sw8-9"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-9: TIE in-front loiter — fighters converge & loiter IN FRONT

## Story Details
- **ID:** sw8-9
- **Jira Key:** sw8-9
- **Repos:** star-wars
- **Branch:** fix/sw8-9-tie-in-front-loiter
- **Workflow:** tdd
- **Stack Parent:** none

**Predecessor (not a stack parent):** sw8-6 shipped (star-wars#124) and is merged on
`origin/develop`. star-wars is `branch_strategy: gitflow` with no `pr_strategy: stacked`
(`.pennyfarthing/repos.yaml`), so there is no stack to sync — this branch cuts from
`origin/develop` @ `f3a088b` and merges back normally. sw8-6's Dev finding is what
confirmed this bug.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-28T14:31:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-28T11:08:17Z | 2026-07-28T11:12:02Z | 3m 45s |
| red | 2026-07-28T11:12:02Z | 2026-07-28T11:30:05Z | 18m 3s |
| green | 2026-07-28T11:30:05Z | 2026-07-28T12:38:39Z | 1h 8m |
| review | 2026-07-28T12:38:39Z | 2026-07-28T14:31:43Z | 1h 53m |
| finish | 2026-07-28T14:31:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap** (non-blocking, for TEA/Dev): this story is the remediation of a LIVE audit finding the
  setup context did not name. **A-010** in `star-wars/docs/audit/findings/pair-tie-ai.json` is
  `class: DIVERGENCE` with **`remediated_by: null`** — its claim is exactly AC-3: *"Our sim costs
  the player a shield when any TIE reaches the cockpit sphere … The ROM has no such collision …
  only fireballs damage the player."* It is independently corroborated in
  `docs/audit/refutation/verdicts-7.json` (three-way confirmation against WSCPU's COLLISION
  section). If AC-3 ships, A-010 should be stamped `remediated_by: sw8-9` — that is the audit-side
  deliverable of this story. Per the project rule, stamp `remediated_by` **only** if the divergence
  is actually removed; if AC-3 is descoped, leave A-010 open and re-quote instead.
  *Caution:* A-010's claim cites `sim.ts:308–315`, but setup located the live collision pass at
  `sim.ts:568–583`. A-010 is unremediated, so the citations gate checks it live — verify which
  anchor is current and re-anchor if the quote has drifted (a comment-only edit is enough to shift
  it). *Found by SM during setup.*
- **Improvement** (non-blocking, for TEA): the play-cube bound is well sourced but has a
  **one-unit source conflict** worth settling before it is pinned as a constant.
  `docs/tie-flight-ai-model.md:61-62` says `[$8300 … $7CFF]` and marks it *(CONFIRMED)*;
  `docs/star-wars-1983-source-findings.md:136` says `[$8300, $7D00]`. `$7CFF` carries the
  majority — the refutation verdict quotes CPHKL clamping to ±`$7CFF` at `WSCPU.MAC:799–811`,
  and `docs/audit/preflight.md:188` corroborates the scale independently (`$4000` = 1.0, so
  `$7CFF` → 31999/16384 ≈ **1.953**, matching the model's "≈ ±1.95"). Prefer `$7CFF` and cite
  the model line; note the `$7D00` variant so a later reader does not "fix" it back.
  *Found by SM during setup.*

### TEA (test design)

- **Conflict** (blocking, for Dev): **the play-cube clamp cannot deliver AC-2, and the story's
  Technical Approach says it will.** Measured by flying each ROM slot on the real sim before writing
  a test: slot 0 reaches `z = +22,857`, slots 1/2 `z = +5,705`, and slot 3 (lifted clear of the
  cockpit sphere) `z = +27,964`. The cube is ±`$7CFF` = ±31,999 raw, so **every** real overshoot is
  inside it with 4k–9k units of headroom — a faithful `sub_8DE3` clamp never engages during flight.
  It is a containment backstop, exactly as in the ROM (the alien can legally sit at −$7CFF, behind
  the player). The in-front behaviour comes from the CHOREOGRAPHY: the ROM's scripts terminate in an
  infinite loiter (`.CGOTO 10$`, WSCPU.MAC:1387, quoted in `docs/audit/refutation/verdicts-7.json`).
  Affects `star-wars/src/core/sim.ts` (the enemy motion/VM path — a loiter or thrust gate is needed
  in addition to the clamp) and `sprint/context/context-story-sw8-9.md` (AC-2's stated mechanism is
  wrong). Implementing only the clamp will leave 3 of the 12 RED tests failing.
  *Found by TEA during test design.*
- **Conflict** (blocking, for Dev): **AC-3 makes AC-2 strictly harder, and the two must land
  together.** Slots 3/4/5 look compliant today (`maxZ ≈ −506`) ONLY because the body collision
  despawns them at ~f66. Removing that collision — which is AC-3 — lets their own script carry them
  to `z = +27,964`. So AC-3 alone regresses the very behaviour AC-2 pins. The suite encodes this:
  the slot 3/4/5 AC-2 cases pass now and will turn RED the moment AC-3 lands without a loiter.
  Affects `star-wars/src/core/sim.ts` (do not ship AC-3 without AC-2's mechanism).
  *Found by TEA during test design.*
- **Conflict** (non-blocking, for Dev/Reviewer): **the context's depth sign is inverted in AC-2 and
  AC-3.** `sim.ts:2069` spawns TIEs at `[x, y, -TIE_SPAWN_DISTANCE]`, so IN FRONT is `z < 0` and
  BEHIND is `z > 0`. AC-1 uses that sign correctly; AC-2 ("never crossing `pos[2] < 0`") and AC-3's
  suggested fixture (`pos = [0, 0, 500]` described as "just in front") use the opposite one, so the
  ACs contradict each other. Tests follow the code. Affects
  `sprint/context/context-story-sw8-9.md` (AC-2/AC-3 wording).
  *Found by TEA during test design.*
- **Question** (non-blocking, for Dev/Reviewer): **what ends a loitering TIE's life?** Today the ram
  is what removes an unshot fighter. After AC-3 nothing does, so fighters accumulate against
  `WAVE_SIZE` (3 slots) and the instant refill from sw8-7 stops topping up. The ROM peels them away
  at the wave-end transition (`sub_8B86`, model §7), which is NOT in this story's ACs. sw8-11 made
  the space phase a PH.TIM time-box rather than a kill quota, so the phase still ends — but a wave
  where all three slots are occupied by immortal loiterers may read wrong. Not pinned here (out of
  scope); flagging so it is a deliberate decision rather than a discovery in review. Affects
  `star-wars/src/core/sim.ts` (spawn/refill interaction). *Found by TEA during test design.*
- **Improvement** (non-blocking, for the audit): the one-unit source conflict SM flagged
  (`$7CFF` vs `$7D00`) is settled in favour of **`$7CFF`** by a source SM did not cite — the repo's
  own `star-wars/CLAUDE.md` world-metric paragraph: *"coordinates are 16-bit raw ROM units, `$4000`
  = 1.0 fixed point; play cube clamps at ±`$7CFF`; TIE spawn depth `$7C00`"*. The same paragraph
  also settles setup's "could not source" item — *"Since `models.ts` is already in raw ROM units,
  ROM distances port into the sim **unscaled**"* — so the bound needs no rescaling and
  `TIE_NEAR_BOUND = 0x800` already sets that precedent in `state.ts:561`. Affects
  `star-wars/docs/star-wars-1983-source-findings.md:136` (the `$7D00` variant is the odd one out).
  *Found by TEA during test design.*

### Dev (implementation)

- **Conflict** (non-blocking, for the epic/Reviewer): **the story's founding premise is refuted by primary source.** sw8-9's title, its context, and sw8-6's Dev finding all assert TIEs should "loiter and converge IN FRONT" and that flying past is the defect. `TCH1A1` is authored to fly past — `.CT 40,0,C$MF2` carries the fighter ~18,900 units beyond the pilot and the next maneuver is commented "PREPARE FOR TURNOVER"; `CPCHKL` is symmetric on all three axes. The overshoot is the cabinet's design. Affects `sprint/context/context-story-sw8-9.md` and the epic's framing of any follow-up (do NOT file an "in-front loiter" story — there is nothing to port). *Found by Dev during implementation.*
- **Gap** (non-blocking, for sw8-8) — **CORRECTED, see the retraction directly below this entry.** ~~every enemy fireball still hits.~~ With the aim cone gone, a wave now fires ~3 shots in 19s and ALL THREE hit the pilot (lives 6 -> 3 in one wave, measured with no player input). The shots are rare but unavoidable, which is the other half of what reads as "sniping". That is sw8-8's subject verbatim ("verify a dodge/shoot window actually exists ... fix if homing still 'always arrives'"), so it is left alone here — but sw8-8 now runs against a gate that fires more often, so its reaction window matters more than when it was filed. Affects `star-wars/src/core/sim.ts` (`homeShots`). *Found by Dev during implementation.*
- **Correction** (non-blocking, retracting the finding above): **that measurement was taken with `NO_INPUT` — a pilot who never shoots — and the conclusion drawn from it was wrong.** Star Wars' wave-1 answer to incoming fire is not to dodge it but to SHOOT it: story 8-18 shipped bolt-vs-fireball interception precisely to turn wave 1 "from 'dodge the fire' into 'intercept the fire'" (`tests/core/shootable-fireballs.test.ts` header). Re-measured with a pilot who aims at the nearest incoming fireball and fires:
  - the flight time from spawn to impact is **1.71–2.19 s** across seeds 1983/7/31337 (35–45 game frames) — a real interception window, not a snipe;
  - a shooting pilot **intercepts 2–4 fireballs per wave** and ends it on **5 or 4 shields instead of 3**.
  So the fire gate opened by this story is survivable by playing the game as designed, and the "every shot lands" figure describes only a passive pilot. sw8-8 keeps its own scope (whether homing "always arrives" for a pilot who *is* manoeuvring) but must NOT be planned off the retracted claim above. *Found by Dev during implementation.*
- **Improvement** (non-blocking, for a future audit pass): **the fire rate is still under the ROM's own table.** `TGPROB` row 0 (wave 1) is `.PROB 0F,080,1` — a $0F frame mask (a window every 16 frames) at a $80 = 50% roll with 1 gun slot, i.e. up to ~0.6 shots/s. We measure 0.16/s. The residual gap is that fighters are out of the pilot's view (C$PV false) for ~50% of their flight, which is itself authentic given the authored turnover. Worth a look only if the wave still reads as quiet after sw8-8. Affects `star-wars/src/core/gameRules.ts` (fire cadence params). *Found by Dev during implementation.*
- **Improvement** (non-blocking, verified clean): checked three things the flight model could plausibly have got wrong and all three are already faithful — `ctFrames` implements the ROM's `.CT` pack-then-`LSRB` decode exactly (`.CT 40` -> 66 frames), the choreography VM distinguishes `.CUNTIL` (opcode 0, armed gate) from `.CIF` (opcode $80), and TCH1A1's record sequence matches WSCPU.MAC line-for-line. Recorded so a future investigation does not re-derive them. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking, for a follow-up story): **two of the ROM fire gate's four conditions have no test coverage.** Found by mutation, not by reading: setting `aimingAhead = false` (dropping the `C$T9` aim-ahead lockout, WSCPU.MAC:627-628) and setting `notHit = true` (dropping the `A$GLW` glow lockout, :632-633) each leave the suite at **1437/1437 passing**. The other two conditions are solidly pinned — removing `C$PV` reds 2 tests and removing the `$800` floor reds 1. The gaps are pre-existing, but sw8-9 is the story that narrowed this gate and whose comment now presents those four conditions as ROM-authoritative, so a later edit could silently delete either with no signal. Affects `star-wars/src/core/sim.ts` (the space fire gate) and needs two tests: a fighter mid-`AIM_AHEAD` maneuver must not fire, and a glowing (just-hit) fighter must not fire. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, for whoever next reads the context): **`sprint/context/context-story-sw8-9.md` carries a wrong ROM constant.** AC-1 states "`0x8300` = −32,256 raw wrapped". `0x8300` as a signed 16-bit word is **−32,000**; −32,256 is `0x8200`. The shipped constant is correct (`PLAY_CUBE_MIN = 0x8300 - 0x10000`), so this is not a defect — but the context file outlives the session and currently disagrees with the code. Affects `sprint/context/context-story-sw8-9.md`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, process): **the sibling re-seat sweep should grep for the BEHAVIOUR, not the file names.** TEA re-seated five suites named in the context; two more (`combat-kill-loop.test.ts`, `tie-inbound-hittable.test.ts`) encoded the same changed contracts and surfaced only on Dev's full-suite run. For a contract change, the reliable sweep is "every fixture that stages an enemy at the cockpit or asserts `lives` in the space phase", run before RED is declared complete. Affects the TEA sidecar. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-2 pinned as a core unit test, not routed to manual QA only**
  - Spec source: context-story-sw8-9.md, AC-2 ("Render Verification")
  - Spec text: "AC-2: TIE-Bodies Never Reach Negative Depth (Render Verification) … **Test:** Manual playtest"
  - Implementation: pinned deterministically in `tests/core/tie-in-front-loiter.test.ts` — one probe per ROM spawn slot asserting the fighter never travels behind the cockpit eye. Manual longplay QA is still required and still routed, but it is no longer the ONLY net.
  - Rationale: AC-2 is the story's actual point, and it is fully observable on the pure core (world-space `pos[2]` per frame) — sw8-6 built exactly this harness. Leaving the story's central claim to eyeballs alone would let a regression ship green.
  - Severity: minor
  - Forward impact: none — strictly more coverage than the spec asked for.
  - → ✓ **ACCEPTED by Reviewer**: superseded in GREEN (the assertion it added was itself retired), but the judgement — pin what is unit-testable rather than leaving the story's central claim to eyeballs — was right and is why the ROM contradiction surfaced at all.

- **AC-2's depth sign is INVERTED from the context, and the test follows the code**
  - Spec source: context-story-sw8-9.md, AC-2 and AC-3
  - Spec text: AC-2 "never crossing `pos[2] < 0` (negative depth)"; AC-3 "a TIE spawned very close to the cockpit (e.g. `pos = [0, 0, 500]` just in front)"
  - Implementation: tests treat `z < 0` as IN FRONT and `z > 0` as BEHIND, so the assertion is an UPPER bound on `pos[2]`, and the at-cockpit fixture is `[0, 0, 0]` (not `[0,0,500]`, which is behind the pilot).
  - Rationale: `sim.ts:2069` spawns at `[x, y, -TIE_SPAWN_DISTANCE]` and sw8-6's shipped harness computes `depth = -e.pos[2]`. The context's own AC-1 uses the opposite (correct) sign to AC-2, so the two ACs contradicted each other; the code is authoritative.
  - Severity: minor
  - Forward impact: none — corrects the spec's internal contradiction rather than changing scope.
  - → ✓ **ACCEPTED by Reviewer**: verified independently at `sim.ts` `spawnTie` (`pos = [x, y, -TIE_SPAWN_DISTANCE]`) — in-front is negative z. The context's AC-2/AC-3 sign is wrong; the code is authoritative.

- **AC-1 is pinned as CONTAINMENT only, and is not asserted to produce the in-front loiter**
  - Spec source: context-story-sw8-9.md, AC-2 / Technical Approach §1
  - Spec text: "With AC-1 in place, TIEs converge x→0 and y→0 *within* the clamped play cube, at positive depth"
  - Implementation: the clamp is pinned by staging fighters already outside the cube; AC-2 is pinned as a separate observable with the mechanism left free.
  - Rationale: measured — every real overshoot (22,857 / 5,705 / 27,964) is inside ±31,999 with 4k–9k of headroom, so a faithful `sub_8DE3` clamp never engages on a real trajectory. Writing AC-2 as "the clamp stops the fly-past" would have produced a test that can only pass for the wrong reason.
  - Severity: major
  - Forward impact: Dev must implement a loiter/thrust mechanism for AC-2; the clamp alone will not turn the suite green. Raised as a blocking Delivery Finding.
  - → ✓ **ACCEPTED by Reviewer**: verified from primary source — `CPCHKL` (WSCPU.MAC:799-811) clamps all three axes with the same `.IRPC .1,<XYZ>` macro and identical pins, and is called from exactly ONE site, `WSCPU.MAC:578` inside `CPUAL` (alien control). It is symmetric containment and alien-only. Refusing to pin AC-2 on it was correct.

- **Four sibling suites re-seated or inverted rather than left for Dev**
  - Spec source: context-story-sw8-9.md, AC-4 ("Existing tests … remain green")
  - Spec text: "Removing TIE-body collision does NOT break player-beam targeting … Existing tests (`space-combat.test.ts`, `homing-fireball.test.ts`) remain green."
  - Implementation: `space-combat.test.ts` and `tie-flight.test.ts` had their ram assertions INVERTED (they asserted the divergence itself, so they cannot "remain green"); `events.test.ts` and `surface-aim-wysiwyg.test.ts` were RE-SEATED from a TIE to a fireball; `post-hit-shield-window.test.ts`'s "different sources" case was restated. `homing-fireball.test.ts` needed nothing.
  - Rationale: AC-4's "remain green" is unachievable for tests whose subject IS the removed contract. TEA owns test maintenance — Dev makes tests pass and must not move goalposts.
  - Severity: minor
  - Forward impact: none for Dev; the re-seated pair is green both before and after the fix, so only the two inverted assertions and the restated case turn green on implementation.
  - → ⚠ **ACCEPTED WITH A CAVEAT by Reviewer**: the five re-seats were correct, but the sweep was INCOMPLETE — `combat-kill-loop.test.ts` (ram-costs-a-shield) and later `tie-inbound-hittable.test.ts` both encoded contracts this story changed and were missed, surfacing only on Dev's full-suite run. This is the known 'TEA's re-seat is usually incomplete' failure mode; the grep should have been for the BEHAVIOUR (any fixture staging an enemy at the cockpit / asserting `lives` in space), not for the two file names the context happened to list.

### Dev (implementation)

- **AC-2's "never behind the eye" contract was RETIRED, not implemented**
  - Spec source: context-story-sw8-9.md, AC-2; and TEA's RED suite (6 `it.each` slot assertions)
  - Spec text: "TIE-Bodies Never Reach Negative Depth ... never crossing `pos[2] < 0`"
  - Implementation: those six assertions are deleted. Replaced by a ROM-sourced play-cube containment bound per slot, and AC-2 re-pinned onto the fire gate (see next entry).
  - Rationale: primary source refutes the premise. `TCH1A1` (WSCPU.MAC:1330-1341) is AUTHORED to overshoot — `.CT 40,0,C$MF` (66 frames x $100 = 16,896) then `.CT 40,0,C$MF2` (66 x $200 = 33,792) from the $7C00 spawn ends ~18,900 units BEHIND the pilot, and the very next maneuver is commented "PREPARE FOR TURNOVER". `CPCHKL` clamps all three axes symmetrically (`.IRPC .1,<XYZ>`), so nothing keeps a fighter in front in the cabinet either. Making the assertion pass would have required inventing a mechanism the ROM does not have.
  - Severity: major
  - Forward impact: the epic's "TIEs should loiter in front" premise (sw8-6 Dev finding, carried into this story's title) is factually wrong and should not be re-filed as a future story.
  - → ✓ **ACCEPTED by Reviewer**: I re-derived the arithmetic from the source rather than taking it on trust. `ctFrames(0x40)` = `(4 + ((0x40&0x70)*2 + (0x40&3)*8)) >> 1` = **66** frames, matching the ROM's own `CHTW.D` decode (`LDB 0(U) / LSRB`). 66 × $100 = 16,896 and 66 × $200 = 33,792, so from the $7C00 = 31,744 spawn the fighter sits at **+18,944** when `.CT 20,C$PU,C$MF ;PREPARE FOR TURNOVER` begins. The overshoot is authored. Retiring the assertion rather than inventing a mechanism to satisfy it was the correct call, and the alternative (a hand-tuned thrust gate) would have been an invention with no ROM behind it.

- **AC-2 re-pinned onto the fire gate's aim cone — a divergence the story did not name**
  - Spec source: context-story-sw8-9.md, AC-2 ("the story's actual point")
  - Spec text: "Offset TIEs sweep across the field ... never crossing `pos[2] < 0`"
  - Implementation: removed the `C_AS` (12-degree nose cone) requirement from the space fire gate in `sim.ts`, leaving the ROM's own four tests (C$PV, C$T9, the $800 floor, A$GLW). New tests pin that an off-axis fighter in view CAN fire, while a fighter behind the pilot and one inside $800 still cannot.
  - Rationale: the user's reported symptom ("TIEs get behind you and then snipe") traced to this, not to the flight path. WSCPU.MAC:640-646 is the whole gate and carries no aim-cone test; ours made every shot a perfectly-lined-up one and starved the wave (2 shots per 19s measured). The divergence was already documented in `sim.ts` as deliberately kept (sw8-2 AC8 / sw7-24).
  - Severity: major
  - Forward impact: enemy fire is more frequent and off-angle across every space wave. Interacts with sw8-8 (incoming-fire reaction window) — see the Delivery Finding.
  - → ✓ **ACCEPTED by Reviewer**: verified against the source. The gate is the run at label `140$` (WSCPU.MAC:622-633) and tests C$PV, C$T9, the $800 floor and A$GLW — `C$AS` is set at :619-621, above the label, and never read by the gate. Mutation-proven both ways: restoring the cone (M7) reds the suite, and removing C$PV (M6) fires shots from **13,509 units behind the pilot**.

- **The RED suite's play-cube constant was corrected, and it now imports the shipped ones**
  - Spec source: TEA's RED suite, AC-1 block
  - Spec text: private `const PLAY_CUBE_MAX = 0x7cff` / `PLAY_CUBE_MIN = -0x7cff`
  - Implementation: the suite imports `PLAY_CUBE_MAX`/`PLAY_CUBE_MIN` from `state.ts`; the negative pin is the ROM's `LDD #8300` = -32,000, not -31,999.
  - Rationale: `CPCHKL`'s two pins are not symmetric — `#7CFF` = +31,999 and `#8300` = -32,000 (two's complement). RED's symmetric pair was one unit off on the negative face. Importing rather than re-declaring also stops the suite asserting a stale private copy.
  - Severity: minor
  - Forward impact: none.
  - → ✓ **ACCEPTED by Reviewer**: `0x8300` as a signed 16-bit word is **-32,000** (confirmed by computation); RED's symmetric -31,999 was wrong. Importing the shipped constants instead of re-declaring them is strictly better and is mutation-proven to bite (M4/M5 both red the suite).

### Reviewer (audit)

- **UNDOCUMENTED — `tie-inbound-hittable.test.ts` had a test contract changed in GREEN and it is not in the deviation log.** The off-axis fighter in that suite now shoots back (a direct consequence of the fire-gate change), so its `expect(s.lives).toBe(STARTING_LIVES)` line was replaced with a position assertion. The change is sound and is disclosed in the commit message and the Dev Assessment, but a test-contract edit driven by a spec change belongs in `## Design Deviations`. Severity: **Low** (disclosed, just filed in the wrong place).
- **UNDOCUMENTED — the story context carries a wrong ROM constant that nothing in the deviation log corrects.** `sprint/context/context-story-sw8-9.md` AC-1 states "`0x8300` = −32,256 raw wrapped". `0x8300` signed is **−32,000**; −32,256 is `0x8200`. The shipped code is right, so this is not a defect — but the context file is the artefact a future reader greps, and it currently disagrees with the constant we shipped. Severity: **Low**.

## Sm Assessment

**Story:** sw8-9 — TIE in-front loiter (3pt, p2, star-wars, tdd). Setup complete, routing to TEA for RED.

**Why this story is well-formed despite a title-only epic entry.** The epic gives sw8-9 no ACs — it is
a carry-forward whose scope lives in three predecessors. Setup derived six numbered ACs from them and
I verified the two load-bearing citations myself rather than trusting the subagent's summary:

- The bug is **confirmed, not suspected**. sw8-6's Dev finding reads verbatim: *"the fix carries the
  offset (the sweep) but the fighter then flies **PAST** the cockpit, converging x→0 during/after the
  pass (at negative depth, behind the eye) rather than **loitering and converging while in front**."*
  (`sprint/archive/sw8-6-session.md`). It names this story's two remedies exactly — the deferred §5
  play-cube clamp and the 9-3 no-body-collision item.
- The ROM constant is **doubly corroborated**, so the derived magnitude is trustworthy rather than
  merely quotable: `docs/tie-flight-ai-model.md:61-62` pins `[$8300 … $7CFF]` per axis via `sub_8DE3`
  and marks it *(CONFIRMED)*; `docs/audit/preflight.md:188` independently gives the fixed-point scale
  (`$4000` = 1.0), which makes `$7CFF` = 31999/16384 ≈ **1.953** — matching the model's own "≈ ±1.95".
  Two sources agreeing on the mechanism *and* the magnitude is the bar; a lone verbatim quote is not.

**Scope is genuinely 3 points.** Two mechanisms in one file (`src/core/sim.ts`): insert the per-axis
clamp in the enemy motion pass, and drop TIE-bodies from the cockpit collision test while leaving
fireballs damaging. No new subsystem, no shell changes — the sim is CORE, which is where both belong.

**Two setup findings routed to TEA** (recorded in full under Delivery Findings, summarised here):

1. **A-010 is this story's audit deliverable and the context missed it.** `pair-tie-ai.json` carries
   A-010 as `class: DIVERGENCE`, `remediated_by: null`, and its claim *is* AC-3. Shipping AC-3
   without stamping A-010 would leave the audit asserting a divergence the code no longer has. The
   stamp is conditional on AC-3 actually landing — the project rule is that `remediated_by` marks
   defects genuinely removed, never a live divergence someone merely looked at.
2. **A citation-drift risk on that same finding.** A-010 quotes `sim.ts:308–315`; setup located the
   live collision pass at `sim.ts:568–583`. Because A-010 is unremediated, the citations gate checks
   it live, so TEA should confirm which anchor is current before editing near it — a comment-only
   edit is enough to shift a pinned line.

**Corrections I made to the setup's own output** (both would have bitten later):

- The session file was missing `**Repos:**` and `**Branch:**` — present in every prior sw8 session
  (cf. `sprint/archive/sw8-7-session.md`) and required downstream. Added.
- It recorded `**Stack Parent:** sw8-6`. star-wars is `branch_strategy: gitflow` with no
  `pr_strategy: stacked` anywhere in `.pennyfarthing/repos.yaml`, so there is no stack to sync and a
  phantom parent risks tripping the stack-ready gate at finish. sw8-6 is a shipped predecessor
  (star-wars#124, merged), not a parent. Corrected to `none`, relationship kept in prose.

**Verification-vs-visual boundary — flagged so TEA does not fake it.** This is a feel story judged
against `star-wars-longplay.mov`. AC-1/AC-3/AC-4/AC-6 are deterministic core unit tests. **AC-2
(TIEs never cross behind the eye) is the story's actual point and is a render/visual check** — it
follows from AC-1 but is confirmed by eye. sw8-6 hit precisely this trap: its TEA logged that AC1/AC3
were *"VISUAL/longplay checks, not unit tests … a green vitest is necessary, not sufficient."* A
trajectory probe asserting max-depth stays positive is a fair proxy and should be written; it is not
a substitute for the playtest. If visual QA runs, serve **this** checkout on a spare port — pinned
port 5274 may belong to a sibling checkout (root CLAUDE.md trap), in which case you would be
verifying someone else's code.

**Pre-handoff checks.** Merge gate clear — `gh pr list -R slabgorb/star-wars --state open` returned
`[]`. No sibling checkout has raced this story (fetched `origin/develop`; no sw8-9 commits or remote
branch). Branch `fix/sw8-9-tie-in-front-loiter` cut from `origin/develop` @ `f3a088b`. Jira: N/A —
this project has no Jira; `jira_key` is the story id (root CLAUDE.md). Setup committed as `4134f30`.

**Handoff to Mr. Praline (TEA):** author the RED suite for AC-1 (clamp bounds), AC-3 (TIE body does
not damage; fireball still does), and a trajectory probe for AC-2. Settle the `$7CFF` vs `$7D00`
one-unit source conflict before pinning the constant — `$7CFF` carries the corroboration.
## TEA Assessment

**Tests Required:** Yes
**Tests Written:** 18 in a new suite + 5 sibling contracts re-seated/inverted, covering 4 ACs
**Status:** RED — 12 failing across 4 files, 1959 other tests green, `tsc --noEmit` clean

### Test Files

- `tests/core/tie-in-front-loiter.test.ts` — NEW. 18 tests (9 RED, 9 green guards) across AC-1/2/3/4.
- `tests/core/space-combat.test.ts` — ram assertion INVERTED; fireball replacement case added.
- `tests/core/tie-flight.test.ts` — ram assertion INVERTED (story 9-2 AC4 intent preserved).
- `tests/core/events.test.ts` — `player-death` case RE-SEATED from a TIE to a fireball.
- `tests/core/surface-aim-wysiwyg.test.ts` — `shipPoint` routing guard RE-SEATED to a fireball.
- `tests/core/post-hit-shield-window.test.ts` — "different sources" case restated to stay discriminating.

### The ruling — established by RUNNING the sim, not by reading the spec

Epic sw8 §3 says rule the divergence first, and it paid for itself twice here. A scratch probe flew
one hero TIE per ROM spawn slot with no player input and the spawner/fire clocks parked (deleted
before commit — a stray `*.test.ts` at the repo root still enters `npx vitest run`):

| slot | today | after AC-3 removes the ram |
|------|-------|----------------------------|
| 0 | flies past to **z = +22,857** (22.8k behind the pilot), then loops | unchanged |
| 1, 2 | fly past to **z = +5,705** | +7,091 / +7,119 |
| 3, 4, 5 | **ram** at ~f66, removed, −1 shield (`maxZ ≈ −506`) | slot 3 lifted clear of the sphere → **z = +27,964** |

Two findings fell out, both filed as **blocking** Delivery Findings:

1. **The clamp cannot deliver AC-2.** The play cube is ±`$7CFF` = ±31,999 raw, and *every* measured
   overshoot sits inside it with 4k–9k units of headroom — a faithful `sub_8DE3` clamp never engages
   during flight. That is true of the ROM too (the alien may legally sit at −$7CFF, behind the
   player); the in-front behaviour comes from the choreography's infinite loiter (`.CGOTO 10$`,
   WSCPU.MAC:1387). The story's Technical Approach asserts the opposite — "With AC-1 in place, TIEs
   converge … at positive depth". Had I written AC-2 as "the clamp stops the fly-past", the suite
   would have gone green on a clamp that does nothing: a test passing for the wrong reason. AC-2 is
   therefore pinned as the **observable** (`max(pos[2]) <= COCKPIT_HIT_RADIUS`) with the mechanism
   left free, and AC-1 pinned separately as containment by staging fighters already outside the cube.
2. **AC-3 makes AC-2 harder.** Slots 3–5 only look compliant because the ram despawns them. The
   suite encodes the interaction: those three AC-2 cases pass today and turn RED the moment AC-3
   lands without a loiter, so Dev cannot ship half of this story and call it green.

Sourcing note: the bound needed no rescaling, and the repo settled it — `star-wars/CLAUDE.md`'s
world-metric paragraph ("play cube clamps at ±`$7CFF`… ROM distances port into the sim **unscaled**")
resolves both SM's `$7CFF`-vs-`$7D00` conflict and setup's open "could not source" item, and
`TIE_NEAR_BOUND = 0x800` (`state.ts:561`) already sets the raw-units precedent.

### Sibling contracts — why five files moved

`space-combat.test.ts` and `tie-flight.test.ts` each asserted *"a TIE reaching the cockpit costs a
life and is removed"*. That sentence **is** the divergence AC-3 deletes, so AC-4's "existing tests
remain green" is unachievable for them — they are inverted, not re-seated, and the shield-loss
coverage they provided is replaced by an explicit fireball case. `events.test.ts` and
`surface-aim-wysiwyg.test.ts` test something orthogonal (the `player-death` event shape; the sw7-16
`shipPoint` routing guard) and merely needed a live damage source, so both were re-seated to a
fireball — green before *and* after the fix, which is the test of a correct re-seat. Both would
otherwise have gone permanently inert rather than failing loudly, the worse outcome:
`surface-aim-wysiwyg`'s own header warns that this guard was once written so it could never bite.
`post-hit-shield-window.test.ts`'s "caps across DIFFERENT sources" loses its premise entirely once
space has one damage source; restated so it still discriminates (one shield **and** the TIE survives —
the old body collision both charged a shield and deleted the fighter, so a regression fails here).

This is TEA's work by rule: Dev makes tests pass and must not move goalposts.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test | Status |
|---|---|---|
| `x \|\| default` where 0 is valid (§Null/undefined) | `leaves a fighter exactly ON the cube face alone, and does not disturb a zero axis` | green guard |
| Boundary/off-by-one on an inclusive bound | same test (`toBe(PLAY_CUBE_MAX)`, `<` vs `<=`) | green guard |
| No `as any` / `as unknown as` / `@ts-ignore` in tests (§Testing) | grepped the new suite — none present | clean |
| Per-axis contract not silently vector-scaled | `clamps the Y and Z axes independently` + `leaves a fighter already inside the cube exactly where it is` | RED / green guard |

**Rules checked:** 4 of the applicable TypeScript checklist items have coverage; the remainder
(React hooks, async/Promise, enums, module resolution) do not apply to a pure-core numeric change.
**Self-check:** 0 vacuous tests written. The AC-2 block additionally carries its own non-vacuity
guard (`the probe is not vacuous — the hero really flies the field`), because six `it.each` slot
assertions on a max would all pass trivially if a regression parked TIEs at spawn or despawned them
on frame 1.

### Not pinned here (deliberate)

- **The longplay comparison.** Epic §6: a green vitest is necessary, not sufficient. AC-2's
  frame-by-frame match against `star-wars-longplay.mov` stays manual QA — and when it runs, serve
  THIS checkout on a spare port; pinned 5274 may belong to a sibling checkout (root CLAUDE.md trap).
- **The wave-end peel-away** (`sub_8B86`). Out of scope; raised as a Question finding because after
  AC-3 nothing removes an unshot fighter, which interacts with `WAVE_SIZE` and sw8-7's instant refill.
- **A-010's `remediated_by` stamp.** SM routed it; it belongs to whoever lands AC-3, and only if the
  divergence is genuinely removed.

**Handoff:** To Bicycle Repair Man (Dev) for GREEN. Start with AC-1 (mechanical) and AC-3 (a
deletion), then AC-2 — which is the real work and which the other two do not give you for free.
## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 1975/1975 passing (GREEN) · `tsc --noEmit` clean · 186/186 files
**Branch:** fix/sw8-9-tie-in-front-loiter (3 commits)

**Files Changed**
- `src/core/state.ts` — `PLAY_CUBE_MAX`/`PLAY_CUBE_MIN`, the ROM's `[$8300, $7CFF]` pins in raw units.
- `src/core/sim.ts` — clamp applied post-integration per model §5 step order; TIE-body cockpit
  collision deleted; the non-ROM 12° `C_AS` aim cone removed from the fire gate.
- `docs/audit/findings/pair-tie-ai.json`, `pair-guns.json` — A-010 and G-010 stamped
  `remediated_by: sw8-9`; 51 citations re-anchored across two passes, 0 lost.
- Tests: new `tie-in-front-loiter.test.ts`; contracts updated in `space-combat`, `tie-flight`,
  `events`, `surface-aim-wysiwyg`, `post-hit-shield-window`, `combat-kill-loop`, `tie-inbound-hittable`.

### What shipped, and why AC-2 changed shape

**AC-1 — the play-cube clamp.** `CPCHKL` / `sub_8DE3` ported from primary source (WSCPU.MAC:799-811),
each axis pinned independently as the ROM's `.IRPC .1,<XYZ>` macro does it, applied immediately after
position integration because that is where the cabinet's own per-frame order puts it (model §5:
integrate, then clamp). It is CONTAINMENT: on every measured trajectory it has 4k–9k units of
headroom and never fires. Pinned by staging fighters already outside the cube.

**AC-3 — no TIE-body collision.** Deleted. WSCPU's COLLISION section holds only `CPHTSA` ("SPACE
LAZAR HIT ALIEN SHIP") — the player's laser hitting the alien. There is no reverse test anywhere in
the alien code. A fighter reaching the pilot now costs nothing and is not consumed. This closes two
live DIVERGENCE findings whose claim was exactly this collision: **A-010** (routed by SM) and
**G-010** (which SM's routing did not name — the citation tool surfaced it as the second LOST quote).

**AC-2 — rewritten against primary source.** RED pinned "a TIE never travels behind the cockpit eye".
That is not the cabinet. `TCH1A1` (WSCPU.MAC:1330-1341) is *authored* to overshoot:

    .CT 40,0,C$MF      ;TAKES ME HALFWAY TO PLAYER   → 66 frames × $100 = 16,896
    .CT 40,0,C$MF2                                    → 66 frames × $200 = 33,792
    .CT 20,C$PU,C$MF   ;PREPARE FOR TURNOVER

From the $7C00 = 31,744 spawn that leaves the fighter ~18,900 units behind the pilot, and the next
maneuver is literally commented "PREPARE FOR TURNOVER". Our measured 22,857 is that same maneuver.
Flying past is the design. Satisfying RED's assertion would have meant inventing a mechanism the ROM
does not have — a test passing for the wrong reason — so those six assertions are retired and
replaced with a play-cube containment bound, which is a real ROM-sourced regression net.

**The reported symptom had a different cause, and it is fixed.** "TIEs get behind you and then snipe"
traced to the FIRE GATE. Ours required `C_AS` — the fighter's nose within `FIRE_CONE_COS` = **12°** of
the pilot. The cabinet's gate is the run at WSCPU.MAC:640-646 (label `140$`, which every preceding
skip branches *into*) and tests only `C$PV` ("NO SHOOTING GUNS IF PLAYER CANT SEE US"), the `C$T9`
aim-ahead lockout, the `$800` too-close floor, and `A$GLW`. **No aim-cone test exists in it.** `C$AS`
is computed a few lines earlier purely so the choreography can branch on it (`.CUNTIL C$AS`). A 12°
election is, by construction, a sniper's firing condition: rare, and perfectly lined up every time —
2 shots per 19s of wave, each one dead on. Removed. `C$PV` still stands, so a fighter behind the pilot
stays silent (0 shots from behind, measured).

### Verification

Measured on the real sim before and after, not asserted: fighters spend ~50% of their flight behind
the eye (authentic — the authored turnover), the worst continuous stretch is 7.0s, and 0 shots are
fired from back there in either build. Full suite green at 1975/1975 with tsc clean.

### Left for others (both filed, neither invented here)

- **sw8-8** owns the other half of the "sniping" feel: with the gate opened, a wave fires ~3 shots in
  19s and **all three hit** (lives 6 → 3, no player input). Rare but unavoidable. That is sw8-8's
  subject verbatim — homing that "always arrives" — and it now matters more than when it was filed.
- Three things I checked that are already faithful and need no work: the `.CT` duration decode
  (`ctFrames` implements the ROM's pack-then-`LSRB`; `.CT 40` → 66 frames), the VM's separation of
  `.CUNTIL` (opcode 0) from `.CIF` (opcode $80), and TCH1A1's record sequence line-for-line.

**Handoff:** To The Argument Professional (Reviewer). The two judgement calls to press on are the
retirement of RED's six AC-2 assertions (is the TCH1A1 reading right?) and the fire-gate change
(does removing `C_AS` leave any path where an unseen fighter can shoot?).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1976/1976, tsc clean, `npm run build` OK, no debug residue, clean tree, no probe files left |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A — Disabled via settings; domain covered by me (mutations M1/M2/M5/M8, boundary + off-by-one) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A — Disabled via settings; domain covered by me (aliasing trace, mutations M6/M9/M11) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings; domain covered by the 11-mutation battery → **2 confirmed gaps** |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings; domain covered by me → **1 confirmed** (wrong ROM citations, fixed) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A — Disabled via settings; domain covered by me (`clampToPlayCube: Vec3 → Vec3`, no escapes) |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A — Disabled via settings; no auth/IO/tenant surface — pure deterministic core, no network, no storage |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A — Disabled via settings; domain covered by me → 1 raised, dismissed with rationale |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | N/A — Disabled via settings; domain covered by me (core/shell purity, determinism, raw-ROM-units) |

**All received:** Yes (1 ran, 8 pre-filled as disabled per `.pennyfarthing/config.local.yaml`)
**Total findings:** 3 confirmed, 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED — no Critical or High findings.
**Suite:** 1976/1976 · `tsc --noEmit` clean · `npm run build` OK · citations gate green · working tree clean.

With 8 of 9 specialists disabled, self-re-reading my own diff would have found nothing. An **11-mutation battery** was the instrument; it caught 9 and, more usefully, **2 survived** — which is where the real findings are.

### Findings

| # | Sev | Tag | Finding |
|---|-----|-----|---------|
| 1 | Medium | `[DOC]` | Two ROM line citations were **wrong** in shipped source and in the suite header — FIXED in review (`cc7f1a4`) |
| 2 | Medium | `[TEST]` | The `C$T9` aim-ahead lockout is **unpinned** — mutation M9 survives |
| 3 | Medium | `[TEST]` | The `A$GLW` glow lockout is **unpinned** — mutation M11 survives |
| 4 | Low | `[SIMPLE]` | Extra per-frame `.map()` allocation for the clamp — **dismissed**, see rationale |

**[DOC] Finding 1 — wrong citations, in a repo built on citation discipline (CONFIRMED, fixed).**
The fire-gate comment in `sim.ts` and the suite header both cited `WSCPU.MAC:640-646` as "the gate".
Lines 640-646 are the `TGPROB` probability-table lookup (`LSLB / LDU #TGPROB / LEAU B(U)`). The gate
is the run at label `140$` — **:622-633**. Likewise `C$AS` is set at **:619-621**, not `:634-637`
(:634 is the `;WAIT FOR SHIELDS TO STOP` comment). Five occurrences, corrected. This matters more
than a typo: the whole argument for removing the aim cone rests on "the gate is these lines and
`C$AS` is not among them", and the cited lines did not contain the gate. The claim is true — I
re-read :622-633 and `C$AS` genuinely is not in it — but it was being justified by the wrong
evidence. Other citations in the story verified CORRECT: `CPCHKL` :799-811, `TCH1A1` :1330-1341,
`.CGOTO 10$` :1387.

**[TEST] Findings 2 & 3 — half the fire gate has no test (CONFIRMED, not fixed).**
The ROM gate has four conditions. This story rewrote that gate and its comment now presents those
four as the authority — but the suite only pins two:

| ROM condition | WSCPU.MAC | Mutation | Pinned? |
|---|---|---|---|
| `C$PV` "player can't see us" | :624-625 | M6 removes it | **YES** — 2 tests red; catches fire from 13,509 behind |
| `C$T9` aim-ahead lockout | :627-628 | M9 `aimingAhead = false` | **NO — 1437/1437 still pass** |
| `$800` too-close floor | :629-631 | M8 `inRange = true` | **YES** — 1 test red |
| `A$GLW` glow lockout | :632-633 | M11 `notHit = true` | **NO — 1437/1437 still pass** |

Both gaps are pre-existing rather than introduced — but this story is the one that narrowed the gate
from five conditions to four and documented the remaining four as ROM-authoritative, so a future
edit could silently delete either and every test would stay green. Medium, non-blocking: the code is
correct today, the exposure is regression risk. Filed as a Delivery Finding rather than fixed here,
because writing two new fire-gate suites is Dev/TEA work, not a reviewer's edit at approval time.

**[SIMPLE] Finding 4 — DISMISSED.** The clamp adds a third `.map()` over the enemy array each frame,
allocating a new object on top of the one `applyManeuver` already returns; it could be folded into
`applyManeuver`'s return. Dismissed: the ROM performs integration (`sub_8AB6`) and clamping
(`sub_8DE3`) as *separate* steps 4 and 5 of model §5, and `applyManeuver` is an exported symbol that
tests and helpers drive directly as "the integrate step". Keeping them separate is the more faithful
structure, and three maps over a ≤3-element array is not a cost worth trading it for.

### Verified (with evidence)

- `[VERIFIED]` **The clamp is enemies-only, and that is correct.** `CPCHKL` is called from exactly one
  site — `WSCPU.MAC:578`, inside `CPUAL` (alien control) — so it never applies to the player ship.
  `sim.ts:437` applies ours only to `movedEnemies`. Note this means the story CONTEXT is wrong where
  it says the clamp "keeps TIEs **and player** inside the play cube"; the code is right, the doc is not.
- `[VERIFIED]` **No aliasing bug from `const liveEnemies = standingEnemies`.** Deleting the filter made
  `liveEnemies` share a reference instead of owning a fresh array. Traced: `standingEnemies` ← `enemies`
  ← `movedEnemies` (`sim.ts:466`), which is always a freshly `.map()`-ed array, never `state.enemies`;
  the only uses are the definition and `enemies: liveEnemies` in the returned state, with no `push`
  or in-place mutation on any of the three. Safe.
- `[VERIFIED]` **The ROM constants are genuinely pinned, not just referenced.** My first concern was
  that the suite imports `PLAY_CUBE_MIN/MAX`, so a wrong constant would move the test with it.
  Falsified by mutation: `PLAY_CUBE_MIN = -5000` reds 10 tests (M4) and `PLAY_CUBE_MAX = 5000` reds 1
  (M5), because the per-slot containment test flies real trajectories whose geometry depends on the
  true values. The import is safe.
- `[VERIFIED]` **Per-axis clamping is real, not vector-scaled.** M1 (clamp X only) reds 2; M3
  (multiply every axis by 0.9 instead of clamping) reds 20; M2 (`MAX - 1`, an off-by-one on an
  inclusive face) reds 1. All three axes and the boundary are covered.
- `[VERIFIED]` **AC-3's removal is pinned in both halves.** M6 (restore the body-collision filter)
  reds 7 tests across the new suite and the re-seated siblings — both "costs no shield" and "is not
  consumed" bite independently.
- `[VERIFIED]` **Core purity and determinism hold.** No `window.`/`document.`/`Date.now`/
  `Math.random`/`performance.now`/`requestAnimationFrame` in any added `src/core/` line — checked
  including comment text, since this repo's guard scans comments too. `core-purity.test.ts` 14/14;
  102 determinism-matching tests pass. `clampToPlayCube` is a pure `Vec3 → Vec3` with no escapes.
- `[VERIFIED]` **Dev's ROM arithmetic re-derived independently, not taken on trust.**
  `ctFrames(0x40)` = 66 (matching the ROM's `CHTW.D` `LSRB` decode), 66 × $100 = 16,896,
  66 × $200 = 33,792, and −31,744 + 16,896 + 33,792 = **+18,944** at the "PREPARE FOR TURNOVER"
  maneuver. The overshoot is authored, so retiring the "never behind the eye" assertion is sound.
- `[VERIFIED]` **The user's stated acceptance bar is enforced and mutation-proven.** "Shots come
  toward you, not from behind" is pinned at wave level across 5 seeds with a non-vacuity assertion;
  removing `C_PV` reds it immediately with offenders at 13,509 units behind.

### Rule Compliance

| Rule (source) | Governed items in the diff | Verdict |
|---|---|---|
| `core/` is pure — no DOM/`window`/`document`/`canvas` (root + star-wars CLAUDE.md) | `clampToPlayCube`, the clamp `.map`, the gate edit, `PLAY_CUBE_MIN/MAX` | Compliant — grep over added core lines incl. comments is empty; `core-purity.test.ts` 14/14 |
| `core/` never imports `shell/` | both changed core files | Compliant — no new imports beyond `state.ts` → `sim.ts` |
| All time via `dt`, randomness only via seeded RNG | clamp (no time), fire gate (uses existing `frame`/`rng`) | Compliant — clamp is time-free and pure; gate's RNG draw order unchanged |
| ROM distances port UNSCALED, raw 16-bit units (star-wars CLAUDE.md world metric) | `PLAY_CUBE_MAX = 0x7cff`, `PLAY_CUBE_MIN = 0x8300 - 0x10000` | Compliant — raw, unscaled, matching `TIE_NEAR_BOUND = 0x800` precedent |
| Constants single-sourced in `state.ts`, not inlined | both new constants; the suite imports them | Compliant — no literal duplicated in `sim.ts` or the tests |
| `remediated_by` only for divergences actually removed | A-010, G-010 | Compliant — both claims are the TIE-body collision this story deleted; verified the code no longer contains it |
| Citation accuracy for ROM references | 5 line citations added | **VIOLATION → fixed in review** (Finding 1) |
| No vacuous tests / every test asserts meaningfully | 22 tests in the new suite | Compliant — 9 of 11 mutations caught; the wave-level guarantee carries an explicit non-vacuity assertion |

### Devil's Advocate

Let me try to break this. **The strongest attack is that the whole story pivoted on one person's reading
of an assembler listing, and that person then reviewed himself.** RED asserted "never behind the eye";
GREEN deleted those assertions on the strength of a comment that says `;PREPARE FOR TURNOVER`. If that
reading is wrong, this story shipped a regression *and* removed the test that would have caught it.
That is why I re-derived the arithmetic from the macro definitions rather than re-reading the prose:
`ctFrames` matches the ROM's own `LSRB` decode, and the two forward maneuvers total 50,688 units from a
31,744 spawn. You cannot travel 50,688 units toward a target 31,744 away and remain in front of it. The
reading holds on arithmetic, independent of the comment.

**Second attack: removing a gate condition is strictly more permissive, and permissive changes are how
you ship exploits.** Enemies now fire in cases they previously could not. Could a fighter fire from a
position the player cannot answer? That is precisely the user's reported bug, so I did not settle for the
one passing test — I mutated `C_PV` out and confirmed the suite immediately catches shots from 13,509
units behind. The guarantee is enforced by a live assertion over real waves, not by argument.

**Third attack: what does the deleted collision no longer protect against?** A TIE at the cockpit is now
never consumed. Fighters are capped at `WAVE_SIZE = 3`, and the refill only triggers below that cap — so
three immortal loiterers could wedge the wave shut. Dev flagged this as a Question and I confirmed it is
not a soft-lock: sw8-11 made the space phase a `PH.TIM` **time-box**, not a kill quota, so the phase ends
regardless. Worth watching in play, but it cannot hang.

**Fourth: `NaN`/degenerate input.** `Math.max(MIN, Math.min(MAX, NaN))` returns `NaN` — the clamp does not
sanitise. But nothing in the pipeline can produce a `NaN` position without `applyManeuver` already having
produced one, and that pathology would surface far more loudly elsewhere; adding a guard here would be
inventing a defence against a bug that does not exist and would mask it if it ever did.

**Where I ended up:** the two things I could not defend are the unpinned `C$T9` and `A$GLW` conditions —
found only because the mutation battery went looking for tests that *don't* exist rather than code that
looks wrong. Neither is a live defect. That is a Medium, and it is filed rather than waved through.

### Deviation Audit

7 logged deviations reviewed: **6 ACCEPTED**, **1 ACCEPTED WITH CAVEAT** (TEA's sibling re-seat was
incomplete — two further suites surfaced only on the full-suite run), **0 FLAGGED**. 2 UNDOCUMENTED
deviations added under `### Reviewer (audit)`. See the `## Design Deviations` section for the stamps.

**Handoff:** To The Announcer (SM) for finish.
## Impact Summary

**Blocking:** 0. Shipped as star-wars **#134** (`68e7113`) + **#135** (`9504aa3`), both MERGED to
`develop`. Full suite 1976/1976, `tsc --noEmit` clean, `npm run build` OK, citations gate green.
Hand-written at finish (the `sm-finish` preflight was deliberately skipped — it is not read-only and
attempts its own merge).

### What changed in the game

1. **Play-cube clamp ported** (`CPCHKL` / `sub_8DE3`, WSCPU.MAC:799-811). Per-axis, applied after
   position integration per model §5's step order. Containment only — on real trajectories it has
   4k–9k units of headroom and never fires.
2. **TIE-body collision removed** (model §9-3). A fighter reaching the pilot costs nothing and is no
   longer consumed. Closes audit **A-010** and **G-010**, both stamped `remediated_by: sw8-9`.
3. **The 12° aim cone removed from the fire gate.** The cabinet's gate (label `140$`,
   WSCPU.MAC:622-633) tests `C$PV`, `C$T9`, the `$800` floor and `A$GLW` — there is no aim-cone
   test. `C$AS` is set at :619-621 for the choreography to branch on and is never read by the gate.
   Enemy fire is now more frequent and off-angle in every space wave.

### The premise this story was filed on is FALSE — do not re-file it

sw8-9's title, its context, and the sw8-6 Dev finding all assert TIEs should "loiter and converge IN
FRONT" and that flying past is the defect. **Primary source refutes this.** `TCH1A1`
(WSCPU.MAC:1330-1341) is *authored* to overshoot: `.CT 40,0,C$MF` (66 frames × $100 = 16,896) then
`.CT 40,0,C$MF2` (66 × $200 = 33,792) from the $7C00 = 31,744 spawn leaves the fighter **+18,944
behind the pilot**, and the next maneuver is commented `;PREPARE FOR TURNOVER`. `CPCHKL` clamps all
three axes symmetrically, so nothing holds a fighter in front in the cabinet either. Arithmetic
independently re-derived at review from the macro definitions (`ctFrames(0x40)` = 66, matching the
ROM's own `CHTW.D` `LSRB` decode). **There is no "in-front loiter" mechanism to port.** The six RED
assertions that claimed otherwise were retired, not satisfied by invention.

### Open items — all filed, none floating

| Item | Owner |
|---|---|
| `C$T9` and `A$GLW` fire-gate conditions have no test (mutation-proven) | **filed as sw8-16** (1pt, p3) |
| Homing fireballs and the dodge/shoot window | **owned by sw8-8** (already in backlog) |
| `context-story-sw8-9.md` says the clamp covers "TIEs **and player**" (it is alien-only — `CPCHKL` is called only from `CPUAL`, WSCPU.MAC:578) and states `0x8300` = −32,256 (it is **−32,000**) | doc-only; recorded here, code is correct |

### Corrections made to this story's own record

- **A retracted finding.** Dev filed "every enemy fireball still hits (lives 6→3)". That was measured
  with `NO_INPUT` — a pilot who never shoots. Star Wars' answer to incoming fire is to SHOOT it
  (story 8-18 shipped bolt-vs-fireball interception). Re-measured with a shooting pilot: the
  interception window is **1.71–2.19 s** and the pilot ends waves on 4–5 shields having intercepted
  2–4 fireballs. The retraction is in Delivery Findings; **sw8-8 must not be planned off the
  retracted claim.**
- **Three wrong ROM citations, all introduced by this story, all corrected** (#135). `:640-646` was
  cited as "the gate" but is the `TGPROB` lookup; `:634-637` as "C$AS set" but is the
  `;WAIT FOR SHIELDS TO STOP` comment; `:641` as the `C$PV` test but is `LSLB`. The *conclusion* was
  right — `C$AS` genuinely is not in the gate — but it rested on the wrong lines. Every `WSCPU.MAC`
  citation in the touched files is now validated line-by-line, not spot-checked.
- **A process miss worth remembering.** #134 was opened from the pushed branch while the review's
  citation fix sat in an unpushed local commit, so it merged without it and a second PR was needed.
  Push before opening the PR, and diff the PR head against local `HEAD` before merging.

### Test-coverage lesson for the epic

TEA's sibling re-seat named five suites from the context; two more (`combat-kill-loop`,
`tie-inbound-hittable`) encoded the same changed contracts and surfaced only on the full-suite run.
For a contract change, sweep by BEHAVIOUR ("every fixture staging an enemy at the cockpit or
asserting `lives` in space"), not by the file names the context happens to list.
