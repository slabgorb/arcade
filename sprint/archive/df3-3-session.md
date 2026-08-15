---
story_id: "df3-3"
jira_key: "df3-3"
epic: "df3"
workflow: "tdd"
---
# Story df3-3: Player ship

## Story Details
- **ID:** df3-3
- **Jira Key:** df3-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Repos:** arcade
- **Branch:** feat/df3-3-player-ship
- **PR:** #430 (code) → develop; archive PR `chore/df3-3-archive` to follow post-merge

## Story Summary
Player ship — velocity, thrust, reverse, vertical: plugins/defender/src/core/ship.ts — the 24-bit PLAXV accumulation + accel (defender/DEFA7.SRC:2360-2371; keep PLAXV+2, defender/PHR6.SRC:332), the VELO integration step (defender/DEFA7.SRC:2480-2499), REV reverse-facing (PLADIR flip + REVFLG debounce, defender/DEFA7.SRC:3155-3171), the thrust process, and vertical motion (PLAUP/PLADN clamp, defender/DEFA7.SRC:2441-2476). The ship is a scheduler process (df3-1), driven by a pure input snapshot (shell owns the PIA read). Depends on df3-1 + df3-2.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T22:15:48Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T21:13:18Z | 2026-08-15T21:15:01Z | 1m 43s |
| red | 2026-08-15T21:15:01Z | 2026-08-15T21:28:35Z | 13m 34s |
| green | 2026-08-15T21:28:35Z | 2026-08-15T21:45:28Z | 16m 53s |
| review | 2026-08-15T21:45:28Z | 2026-08-15T22:15:48Z | 30m 20s |
| finish | 2026-08-15T22:15:48Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Gap** (non-blocking): `sm-setup` regenerated `sprint/context/context-story-df3-3.md` from bare YAML, stripping the Architect-curated Problem/Technical-Approach/ACs/References that were committed on develop. Affects `sprint/context/context-story-df3-3.md` (I restored the curated HEAD version via `git checkout HEAD --` rather than ship the degraded regen; it is NOT in this branch's diff). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the ship's runtime composition (a df3-1 `makeProcess` continuation that reads the shell input snapshot, calls `stepVelocityX`/`stepReverse`/`stepVerticalY`, feeds `world.slide()`, renders via df2) is unbuilt — the natural home is df3-6 (visual playtest) or the shell. Affects `plugins/defender/src/shell/` + df3-6 (no core change needed). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): two inline parameter-object types lack `readonly`, inconsistent with the file's own `RevState`/`VState` convention. Affects `plugins/defender/src/core/ship.ts:82,117` (add `readonly` to the `io` param fields). Cosmetic — objects are never mutated. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `catch (e) { (e as Error).message }` cast without `instanceof Error` narrowing is a repo-wide RED-harness idiom (~21 occurrences across `plugins/defender/tests/`). Affects the shared test-harness pattern, not this diff alone. *Found by Reviewer during code review.*
- **Gap** (non-blocking): the clamped horizontal velocity `world.slide()` returns (`SlideResult.plaxv`) must be written back into the top-16 of the ship's 24-bit accumulator (preserving the sub-pixel byte) when the two are composed — the ROM does this at `PV12 STD PLAXV` (DEFA7.SRC:2428). Affects the df3-6/shell composition (no core change). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **VELO object-integrator not ported into ship.ts**
  - Spec source: story title / context-story-df3-3.md ("the VELO integration step, defender/DEFA7.SRC:2480-2499")
  - Spec text: "the VELO integration step (defender/DEFA7.SRC:2480-2499)"
  - Implementation: Did not implement a VELO object loop in ship.ts. VELO (DEFA7.SRC:2480-2499) walks the OPTR object list applying OXV→OX16 / OYV→OY16 with the object-Y WRAP on [YMIN,YMAX] — that wrap is already `world.wrapObjectY` (df3-2), and the object menagerie is df4 scope. The ship's own integration is the vertical `PLAY16 += PLAYV` in `stepVerticalY` (DEFA7.SRC:2472-2474) and the horizontal camera slide `world.slide()` (df3-2).
  - Rationale: Porting VELO here would duplicate df3-2's `wrapObjectY` and pull df4 object handling forward. TEA raised the same interpretation as a non-blocking Gap at RED.
  - Severity: minor
  - Forward impact: minor — df4 (enemies/menagerie) owns the OPTR VELO loop; it composes `world.wrapObjectY`, not a ship export.
- **±$0100 horizontal velocity clamp lives in world.slide (df3-2), not re-applied in ship.ts**
  - Spec source: context-story-df3-3.md (HEAD/Architect version), AC "velocity clamps at ±$0100 (defender/DEFA7.SRC:2421-2428)"
  - Spec text: "velocity clamps at ±$0100"
  - Implementation: `stepVelocityX` does NOT clamp the 24-bit accumulator to ±$0100. That clamp (DEFA7.SRC:2421-2428) applies to the TOP-16 velocity handed to the camera slide, and `world.slide()` already performs it (`VEL_CLAMP = 0x100`, world.ts:56,188). The 24-bit accumulator equilibrates well within range via damping (~0xC000 top-16 ≈ 192 < 256).
  - Rationale: The clamp is a property of the ship→camera seam already owned by df3-2; duplicating it in ship.ts would double-clamp.
  - Severity: minor
  - Forward impact: none — the clamp is exercised at the df3-2 seam (world.slide) the ship feeds.
- **REV release delay (NAP 5) modelled as immediate re-arm**
  - Spec source: story title, REV (defender/DEFA7.SRC:3155-3171)
  - Spec text: "REVFLG debounce (defender/DEFA7.SRC:3155-3171)"
  - Implementation: `stepReverse` clears the REVFLG latch the frame the reverse button is released; the ROM's NAP 5 (DEFA7.SRC:3169-3170) that holds the latch ~5 extra ticks for contact-bounce is not modelled.
  - Rationale: The debounce essence the tests pin is "one press = one flip"; for a clean digital input snapshot the 5-tick bounce guard is unobservable. The shell owns the raw switch and can debounce upstream if a real bouncing input is ever wired.
  - Severity: minor
  - Forward impact: minor — if a bouncing hardware input is ever simulated, add the release-delay in the shell or extend RevState with a countdown.
- **Ship delivered as pure step functions, not yet a live scheduler process**
  - Spec source: story title ("The ship is a scheduler process (df3-1)")
  - Spec text: "The ship is a scheduler process (df3-1), driven by a pure input snapshot"
  - Implementation: Delivered `stepVelocityX` / `stepReverse` / `stepVerticalY` as pure functions (mirroring how df3-2's `slide()` is a pure function the shell drives). Did not register a ship process on the df3-1 scheduler; that runtime composition (scheduler + input snapshot + world.slide + df2 render) is shell/wiring work.
  - Rationale: No test requires the scheduler registration, and core stays clock-free/pure; the composition is the province of the df3-6 visual-playtest wiring, consistent with df3-1/df3-2 both landing as core-only.
  - Severity: minor
  - Forward impact: minor — df3-6 (or the shell) composes these step functions inside a `makeProcess` continuation.

### Reviewer (audit)
- **VELO object-integrator not ported into ship.ts** → ✓ ACCEPTED by Reviewer: VELO (DEFA7.SRC:2480-2499) is the OPTR object-list integrator; its object-Y wrap is already `world.wrapObjectY` (df3-2) and the menagerie is df4 scope. Porting it here would duplicate df3-2 and pull df4 forward. TEA concurred at RED.
- **±$0100 horizontal velocity clamp lives in world.slide (df3-2), not re-applied in ship.ts** → ✓ ACCEPTED by Reviewer: verified `world.ts:56,188` (`VEL_CLAMP = 0x100`) clamps the top-16 velocity at the ship→camera seam. The 24-bit accumulator equilibrates at damp/thrust balance `4·(v>>8)=0x300 → v>>8≈192 < 256`, so the clamp is a safety rarely hit; double-clamping in ship.ts would be redundant. Correct separation.
- **REV release delay (NAP 5) modelled as immediate re-arm** → ✓ ACCEPTED by Reviewer: the rule-checker independently raised the same NAP-5 grace-window note (medium). It is a disclosed, deliberate scope simplification — the tests pin the essential invariant (one press = one flip); the ~5-tick grace only bites on a release+re-press inside the window (a contact-bounce guard the shell can add upstream). Not a defect for a clean digital input snapshot.
- **Ship delivered as pure step functions, not yet a live scheduler process** → ✓ ACCEPTED by Reviewer: mirrors df3-2's `slide()` landing as a pure function the shell drives; no test requires scheduler registration and core stays clock-free. The composition is legitimately df3-6/shell work.

## Sm Assessment

Story df3-3 (Player ship — velocity, thrust, reverse, vertical) is set up and ready for TEA's RED phase. Deps df3-1 (scheduler core) and df3-2 (world-wrap + camera slide) are both `done`, so the ship can be built as a scheduler process on the established world model.

**Scope (from the story title, verbatim citations):**
- 24-bit PLAXV sub-pixel velocity accumulation + accel (DEFA7.SRC:2360-2371; keep PLAXV+2, PHR6.SRC:332)
- VELO integration step (DEFA7.SRC:2480-2499)
- REV reverse-facing: PLADIR flip + REVFLG debounce (DEFA7.SRC:3155-3171)
- thrust process
- vertical motion PLAUP/PLADN clamp (DEFA7.SRC:2441-2476)

Target file: `plugins/defender/src/core/ship.ts` — pure, clock-free, driven by a pure input snapshot (shell owns the PIA read). `purity.test.ts` must stay green.

**Traps to carry into RED (from the epic):** PLAXV is 24-bit — do NOT truncate to 16; vertical is a CLAMPED strip [YMIN+1,238] for the player (two rules on one axis — object WRAP is df3-2/df3-4's concern); every new src/core constant re-opens under the df1-1 citation gate (no value without a `claims/*.json` entry); RASM radix ($hex vs bare decimal); line numbers from tool output only.

No ACs were carried in the sprint YAML — **TEA defines acceptance criteria during RED**, cited line-for-line from `defender/DEFA7.SRC` / `defender/PHR6.SRC` in this tree.

**Handoff:** → TEA (Leeloo), phase `red`.

## Tea Assessment

RED complete. `plugins/defender/tests/ship.test.ts` — **30 coordinate-pinning tests, all failing** on the missing module (verified: `npx vitest run --project defender ship.test.ts` → 30/30 fail, each via `loadShip()`'s self-describing "src/core/ship.ts not built yet"). No test errors on a typo; the file collects and runs, so RED proves the FEATURE is absent, not the harness broken.

**ACs I derived from the ROM (the YAML carried none)** — every one cited from `reference/original-source/defender/DEFA7.SRC` + `PHR6.SRC`, line numbers read from tool output:

1. **PLAXV is 24-bit** (`PLAXV RMB 3`, PHR6.SRC:332) — `dampX(0x010000) === 0x00FC00` is the non-truncation pin: 0x010000 exceeds 16 bits; a dev modelling velocity as its 16-bit integer part gets 0 and fails. Sub-pixel byte (PLAXV+2) retained through damp *and* accel.
2. **X damping** = `v − 4·(v>>8)` on the full 24-bit value (DEFA7.SRC:2342-2359), byte-exact pins incl. carry (`dampX(0x05F4)===0x05E0`).
3. **Thrust** adds PLADIR into the 24-bit accumulator (DEFA7.SRC:2360-2371). `pladir('right')===0x0300`, `pladir('left')===-0x0300` (DEFA7.SRC:1249-1250). `stepVelocityX` order is **damp-then-accel** — pinned by 3 frames reaching `0x08E0`, not the friction-free `0x0900`.
4. **REV debounce** (DEFA7.SRC:3155-3171, `REVFLG` PHR6.SRC:295): a held button flips facing **exactly once** — 5 held frames → one flip, not five. Release re-arms; release-then-press flips back.
5. **Vertical strip** (DEFA7.SRC:2441-2476): freeze at Yint≤43 (`BLS`, inclusive) / ≥238 (`BHS`); kick ±$100; accel ±8; clamp ±$200; **no post-add clamp** — a −$200 step from Yint=44 overshoots to Yint=42 (=YMIN, below the 43 line). Neutral stick zeroes PLAYV the same frame (no vertical inertia). Up wins when both held.

**Contract for GREEN (Dev)** — the module's exports are documented in the test-file header (`PLADIR_MAG`, `VY_STEP`, `VY_MAX`, `VY_KICK`, `Y_TOP_FREEZE`, `Y_BOTTOM_FREEZE`; `pladir`, `dampX`, `accelX`, `stepVelocityX`, `stepReverse`, `stepVerticalY`). Granular pure functions, mirroring `world.ts`, so the Reviewer's mutation battery has exact coordinates to hit.

### Rule Coverage

- **lang-review #14** (derived EDGES computed inside one branch): the two vertical freeze edges are pinned **outside** their branches — `Y_TOP_FREEZE===43`, `Y_BOTTOM_FREEZE===238`, plus boundary-behaviour tests at exactly 43/238.
- **lang-review #21** (DEGENERATE-but-not-nullish numeric input): `dampX(0)===0`, velocity/PLAYV of 0 at the freeze boundaries, exact-threshold Y values.
- **lang-review #29** (ORDERING standing in for MAGNITUDE): every assertion pins an exact value (a 24-bit velocity, a PLAYV, a resting Yint) — never a mere direction. Routing ≠ geometry.
- **lang-review #8** (test quality): self-checked — no vacuous assertions; every test has a concrete `toBe`/`toEqual` against a ROM-derived value.

**NOT duplicated here** (existing armed gates, world.test.ts precedent): **citation enrollment** (`tests/audit/citations.test.ts` byte-verifies every new claims/*.json entry) and **purity** (`tests/purity.test.ts` scans `src/core`). GREEN **must** enroll the new constants ($0300, ±$100, ±$200, 8; PLADIR/PLAXV/PLAYV/PLAY16/REVFLG) in `plugins/defender/docs/rom-study/claims/*.json` (suggest an `11-ship.json`) or citations reddens.

**Delivery finding (non-blocking, Gap):** the story title also cites the generic `VELO` object-integrator (DEFA7.SRC:2480-2499). That routine walks the OPTR object list and performs the object-Y **wrap** on [YMIN,YMAX] — already modelled by `world.wrapObjectY` (df3-2), and the object menagerie is df4 scope. The ship's own integration is the **vertical** `PLAY16 += PLAYV` (DEFA7.SRC:2472-2474) and the horizontal `slide()` (df3-2), both pinned. I did not re-implement VELO for the ship; flagging so Dev/Reviewer confirm the interpretation rather than porting a duplicate object loop.

**Handoff:** → Dev (Korben Dallas), phase `green`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/defender/src/core/ship.ts` (new) — the pure player-ship physics: `pladir`, `dampX`, `accelX`, `stepVelocityX` (24-bit horizontal velocity: friction `v−4·(v>>8)` + thrust `+PLADIR`, sub-pixel byte retained), `stepReverse` (REVFLG-debounced facing flip), `stepVerticalY` (freeze/kick/accel/clamp/integrate with no post-add clamp), plus the constants `PLADIR_MAG`/`VY_STEP`/`VY_MAX`/`VY_KICK`/`Y_TOP_FREEZE`/`Y_BOTTOM_FREEZE`. Pure, clock-free.
- `plugins/defender/docs/rom-study/claims/11-ship.json` (new) — `SHIP-1..SHIP-23`, every new constant + the PLAXV/PLAYV/PLADIR/NPLAD/PLAY16/REVFLG identities, byte-verified against `reference/original-source/defender/` by `citations.test.ts`.

**Minimal implementation** — the 30 TEA tests are the spec; I added no exports beyond the documented contract. Granular pure functions mirror `world.ts`.

**Tests:** 30/30 ship tests passing; **full defender project 380/380** (incl. `citations.test.ts` byte-verifying the new claims and `purity.test.ts` scanning `ship.ts`); `npm run lint` (`tsc --noEmit`) clean.

**Branch:** `feat/df3-3-player-ship` (pushed; commit `e0f5ec5b`).

**Deviations logged:** 4 (all minor) — VELO not duplicated (df4/`wrapObjectY`), ±$100 clamp lives in `world.slide` (df3-2), REV NAP-5 release-delay modelled as immediate re-arm, ship delivered as pure step-functions not a live scheduler process. See `## Design Deviations → ### Dev (implementation)`.

**Handoff:** → Reviewer (Jean-Baptiste Emanuel Zorg), phase `review`.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (380/380 green, lint clean, 0 smells, tree clean) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 2 (rule #2, rule #11) + 1 ROM note | confirmed 3 (all LOW/accepted), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`, hand-covered)
**Total findings:** 3 confirmed (all LOW / non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The df3-3 player-ship port is a faithful, minimal transcription of the Defender ROM. I read `ship.ts` in full, independently re-derived the X-damping, thrust and vertical-motion math from `reference/original-source/defender/DEFA7.SRC` + `PHR6.SRC`, and byte-checked the 23 citations. All 380 defender tests green; `tsc --noEmit` clean; `src/core` purity holds. No Critical or High findings; the three confirmed findings are all LOW / non-blocking.

**Data flow traced:** shell input snapshot `{accel,reverse,up,down}` → pure `stepVelocityX`/`stepReverse`/`stepVerticalY` → 24-bit PLAXV (top-16 feeds `world.slide()`; sub-pixel byte retained) and PLAY16/PLAYV. Safe because the module takes only plain numbers/booleans, mutates no external state, and reaches no clock/DOM/network (verified [SEC] clean; purity.test.ts scans it).

**Pattern observed:** granular pure functions mirroring df3-2 `world.ts` — `ship.ts:56,66,71,80,100,117`. Good pattern: each ROM routine is one citable function with the source span in its doc comment.

**Confirmed findings (all LOW, non-blocking):**
- [RULE] Missing `readonly` on the inline `io` parameter object types — `ship.ts:82` (`{ accel; facing }`) and `ship.ts:117` (`{ up; down }`) — inconsistent with the file's own `RevState`/`VState` readonly convention. Cosmetic: the objects are never mutated. Recommend adding `readonly` in a future touch; does not block.
- [RULE] `catch (e) { (e as Error).message }` without `instanceof Error` narrowing — `ship.test.ts:140`. A pre-existing repo-wide RED-harness idiom (~21 occurrences across `plugins/defender/tests/`); this diff follows the established convention rather than introducing it. Confirmed (not dismissed — it matches rule #11) but held at LOW; the fix belongs to the shared pattern.
- [TYPE] Same `readonly`-on-params point as the [RULE] item above, from the type-design lens I hand-covered: the param invariants would be stronger as `readonly`; non-blocking.

**Verified good (evidence):**
- [EDGE] `dampX` friction `v − 4·(v>>8)` is byte-exact to the ROM for BOTH signs — I re-derived `0x010000→0x00FC00` and `-0x010000→-0x00FC00` against the NEGD/×4/carry block (DEFA7.SRC:2342-2359). Operator precedence is safe: `4 * (v>>8)` is parenthesised (`ship.ts:67`). No unbounded growth — equilibrium `v>>8≈192 < 256`, far from the ~2M where the 16-bit `NEGD*4` could diverge.
- [EDGE] Vertical freeze boundaries pin the ROM's inclusive comparators: `yint <= 43` (BLS, `ship.ts:122`) and `yint >= 238` (BHS, `ship.ts:132`); overshoot-to-42 with no post-add clamp matches `PYV1` (DEFA7.SRC:2472-2474); up-priority matches PIA31-before-PIA21.
- [SILENT] No swallowed errors or silent fallbacks — the only `catch` is the test harness's deliberate self-describing re-throw (`ship.test.ts:130-141`), which adds context, not silence.
- [SEC] Clean — pure integer/geometry math, no external-input, clock, DOM, network, storage or entropy surface (confirmed by reviewer-security and by inspection).
- [SIMPLE] No over-engineering or dead code — minimal to the tests; `stepVelocityX`'s `facing` is unused only on the `accel:false` branch, which is correct (the ROM reads PLADIR only under the accel gate). Not a simplification target.

**Documentation ([DOC], hand-covered):**
- [DOC] LOW: `ship.ts:44` comment `ADDD #8 / #-8 (defender/DEFA7.SRC:2454,2465)` lists `#8` first but line 2454 is `#-8` and 2465 is `#8` — the pairing order is reversed. Trivial; the claim itself (SHIP-14/SHIP-18) is byte-correct. Non-blocking.

**Test quality ([TEST], hand-covered):** strong coordinate pins (magnitude not ordering, #29). Minor symmetric gaps — negative-velocity damp, the down-overshoot mirror, and freeze-with-nonzero-playv are not pinned — but the code is symmetric and the mirrors are proven by inspection. Non-blocking; a follow-up could add the mirror cases.

**Deviation audit:** all four Dev deviations stamped ✓ ACCEPTED (see `## Design Deviations → ### Reviewer (audit)`). No undocumented deviations found.

### Devil's Advocate

Could this ship "feel wrong" despite green tests? The friction is the risk: a subtly wrong slope would drift the equilibrium velocity and no single test would notice. I attacked it directly — re-derived the ROM's byte-level damp for a positive and a negative seed and both match `v − 4·(v>>8)` exactly, and the parenthesisation that a careless edit could break is present. Could a malicious/confused caller break it? The functions take only `number`/`boolean`; a `NaN` velocity would propagate (`NaN − … = NaN`) but nothing in `src/core` originates a `NaN` — the shell supplies integers, and the scheduler is clock-free. Could the vertical axis trap the ship? I checked the overshoot-to-42 resting state: up freezes there, but down still kicks +$100 off the wall, so 42 is not a trap. Could the REV debounce oscillate? No — a held button flips once (the latch blocks re-flip); the only unmodeled case is a release+re-press inside the ROM's ~5-tick NAP grace, which Dev disclosed and which a clean digital snapshot never produces. Could velocity overflow? Only above |v|≈2M, unreachable given the ~192 equilibrium and the world.slide ±0x100 clamp. The one genuinely deferred hazard is integration: whoever composes ship + world (df3-6) must write world.slide's clamped top-16 back into the accumulator (ROM: PV12 STD PLAXV) or the sub-pixel/clamp coupling drifts — filed as a non-blocking delivery finding. Nothing rises to blocking.

**Handoff:** To SM for finish-story.