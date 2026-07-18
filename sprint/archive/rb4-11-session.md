---
story_id: "rb4-11"
jira_key: "rb4-11"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-11: THE GROUND TARGETS — pyramid, house, tank and pill box are entirely absent

## Story Details
- **ID:** rb4-11
- **Jira Key:** rb4-11
- **Repos:** red-baron
- **Workflow:** tdd
- **Stack Parent:** none

## Branch Information
**Branch Strategy:** gitflow (feat/rb4-11-ground-targets)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T20:59:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T19:51:10Z | 2026-07-18T19:53:33Z | 2m 23s |
| red | 2026-07-18T19:53:33Z | 2026-07-18T20:24:35Z | 31m 2s |
| green | 2026-07-18T20:24:35Z | 2026-07-18T20:46:53Z | 22m 18s |
| review | 2026-07-18T20:46:53Z | 2026-07-18T20:59:57Z | 13m 4s |
| finish | 2026-07-18T20:59:57Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the ROM's ground targets are SHOOTABLE — the display loop calls
  `GRCOLN ;CHECK FOR SHELL TO GROUND OBJ COLLISION` (RBARON.MAC:3651) against the `PFOCOL`
  boxes topology.ts already carries — and tank/pill box are ACTIVE emplacements (drawn +0x20
  brighter, :3617-3620; positioned via `PFOBLN`, :3929+; they fire back). None of that is in
  rb4-11's ACs. Affects `sprint/` (a successor story: shoot/score ground targets + emplacement
  fire). *Found by TEA during test design.*
- **Question** (non-blocking): the DEPTH extent of the blimp's BLCOLL window (model x ±16
  through the depth→shell-z projection) is not numerically pinned — the x/y extents are pinned
  behaviourally and by derivation, but the z mapping runs through `depthToShellZ`, whose scale
  is the projection seam's. Affects `red-baron/src/core/blimp.ts` (Dev derives the depth window
  from BLCOLL_POINTS with a citation, or routes it to a ruling — never a silent invention).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the PFOFFS group key decode is settled by ALIGNMENT, not by
  a found writer: the display code reads 4-byte PFCOL entries at byte `6t + 4s`
  (RBARON.MAC:3582-3591), which only lands on entry boundaries when `t` is even — so the stored
  key is group×2 and a group is 3 CONSECUTIVE PFOFFS entries. Recorded in
  `tests/core/ground-targets.test.ts` header for Dev. Affects `red-baron/src/core/ground-targets.ts`
  (implement the logical group index; the ×2/×3 byte scalings are ROM storage details).
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the data suite's BLCOLL↔BLIMP_POINTS cross-check premise ("BLIMP_POINTS
  spans exactly ±16 in y") was FALSE against the shipped rb2-2 transcription — the gondola corners
  are [±8, −20, ±8], so max |y| is 20, and the ROM's box authentically EXCLUDES the gondola (a shot
  under the hull misses). The test never reached that assertion during RED (`need()` threw on the
  missing export), so the premise was never executed. Re-seated in this story to the true
  relationship (x/z extents equal; box tops the envelope at +16; gondola dips below the box floor).
  Affects `red-baron/tests/core/ground-target-data.test.ts` (TEA verify: confirm the re-seat
  preserves the cross-check intent). *Found by Dev during implementation.*
- **Question** (non-blocking): ANSWERS TEA's depth-extent question — the derivation is documented
  at blimp.ts `BLIMP_WINDOW`: BLCOLL's model-x ±16 through `depthToShellZ` is 16/256 = 0.0625
  shell-z counts, far INSIDE the sub-step anti-tunnel overlap bound (2·WINDOW_Z ≥ SHELL_SPEED), so
  porting it would let a shell tunnel the airship between sub-steps; the shared WINDOW_Z keeps the
  z axis. Affects `red-baron/src/core/guns.ts` (Reviewer diff-traces the derivation).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the Mountain→scroll-band mapping `scrollBandAbs`
  (core/ground-targets.ts) is a declared representation seam with no direct behavioural pin — a
  successor could pin the authored lanes (the centre pair reads |4| and deploys immediately; the
  outer pair reads |12| and waits out GTIMER). Affects `red-baron/tests/core/ground-targets.test.ts`.
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): the wiring suite's `groundTargetSegments` tap records the INPUT
  target count (`args[0].length`), not the length of the real function's RETURN — "a full 3-target
  group is drawn" is satisfiable by a mutation that returns `[]`. The geometry is independently
  proven by the machine suite's stroke laws and the composition was probe-verified in-frame, so this
  is a coverage gap, not a shipped bug — but the recorder should measure the real result length.
  Affects `red-baron/tests/ground-target-wiring.test.ts` (record the returned segment count).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the span-ratio stroke laws are sign-blind — no committed test pins
  the PROJECTED orientation (an upside-down pyramid passes 12/8 = 1.5). Dev's throwaway probe proved
  apex-up once but is not in the suite; add a sign-anchored pin (e.g. the apex endpoint carries the
  max ndc y). Affects `red-baron/tests/core/ground-targets.test.ts`. *Found by Reviewer during code
  review.*
- **Improvement** (non-blocking): after the gondola re-seat, BLIMP_POINTS' gondola y (−20) is pinned
  EXACTLY nowhere in the suite — a mistranscription drifting inside (−20, −16) passes both remaining
  assertions. Pin `Math.min(blimp y) === −20` beside the cross-check. Affects
  `red-baron/tests/core/ground-target-data.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `deployGroup`/`groundTargetSegments` index PFOBJN/PFLOB/PFODEC
  without a bounds guard — safe today solely because the one caller masks with `& 3` (the ROM's AND
  I,3 contract), but inconsistent with the fail-safe style of `scrollBandAbs`/`deployGate` beside
  them; an out-of-domain `type` would throw inside the rAF loop. Defense-in-depth: return `[]` on an
  out-of-range group/type. Affects `red-baron/src/core/ground-targets.ts`. *Found by Reviewer during
  code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **PFOBJN added to the transcription contract (story table list corrected)**
  - Spec source: context-story-rb4-11.md, Problem + AC-2
  - Spec text: "the PFODEC pointer table; the PFLOB point-set table; the .PFLOB length table; and the PFOFFS table of 12 screen offsets"
  - Implementation: tests also require `PFOBJN` (RBARON.MAC:3924-3927), the (group, slot) → object-number table
  - Rationale: AC-2's "ground targets appear in ground waves" has no type assignment without it — the display code reads `LDA AY,PFOBJN ;GET OBJECT #` (:3614). The story's list omitted a table its own behaviour clause consumes; the ROM wins.
  - Severity: minor
  - Forward impact: Dev transcribes one 12-byte table more than the story enumerates
- **Blimp collision window pinned in x/y only; depth extent routed, not pinned**
  - Spec source: context-story-rb4-11.md, AC-4
  - Spec text: "BLCOLL, the blimp's collision box, is transcribed and used for the blimp hit test"
  - Implementation: tests pin the broadside x (±40) and y (±16) behaviourally + by derivation from BLCOLL_POINTS; the depth (model x ±16) extent is a Delivery Finding, not an assertion
  - Rationale: the depth axis runs through the private depth→shell-z projection whose scale in shell-z units is undefined spec-side (the rb4-16 "byte-column threshold" family); pinning a number would manufacture it
  - Severity: minor
  - Forward impact: Dev must document the depth-window derivation; Reviewer diff-traces it
- **deployGate takes an abstract |position| in the ROM's scroll-band units; GRNDCT spent-gate stays with the caller**
  - Spec source: context-story-rb4-11.md, AC-3 (GRNDCT=2, GTIMER)
  - Spec text: "A ground wave deploys exactly two mountain target-groups (GRNDCT=2, GTIMER)"
  - Implementation: `deployGate(gtimer, absPos)` pins DEC/BMI/CMP I,8/BCS and the re-arm; the mapping from our `Mountain` state to the ROM's 5-bit band |position| (AND I,1F sign-extended, :3417-3421) is Dev's representation seam; the `GRNDCT>0` precondition (BEQ, :3431) is the caller's, as rb4-7 left groundModeEnds' GRMODE/GREND gates
  - Rationale: pinning the gate on its own units keeps it a pure ROM machine; binding it to Mountain internals would couple the test to landscape representation the ROM does not share
  - Severity: minor
  - Forward impact: wiring test enforces the caller side (exactly 2 deploys, never a third)
- **groundTargetSegments draws a group against its CARRYING mountain (seam defined by TEA)**
  - Spec source: context-epic-rb4.md (render seams live in core, the blimpSegments principle)
  - Spec text: "a function that decides where an object APPEARS cannot be allowed to sit in a module no test can import" (blimp.ts:309-313, cited as the house rule)
  - Implementation: `groundTargetSegments(targets, mountain, attitude, eyeHeight, aspect)` — mirrors mountainSegments/blimpSegments; the ROM draws a decorated mountain's 3 slots while drawing that mountain (:3562-3650)
  - Rationale: the ROM's offsets are screen offsets from the carrier's projected centre (PFPNT0 + DDIVIT, :3592-3609); the carrier is therefore an argument, not implicit state
  - Severity: minor
  - Forward impact: main.ts must thread the carrier; the wiring suite records this seam

### Dev (implementation)

- **Gondola cross-check re-seated (TEA data-suite premise false against shipped data)**
  - Spec source: tests/core/ground-target-data.test.ts, "EQUALS the blimp model's own bounding extents"
  - Spec text: "BLIMP_POINTS (topology.ts, rb2-2) spans exactly ±16 in x, ±16 in y, ±40 in z. The ROM author sized BLCOLL to the envelope"
  - Implementation: y-axis assertion re-seated — box tops the envelope exactly (+16 is a drawn point) and the gondola (−20) dips BELOW the box floor; the x/z extent equalities kept as written
  - Rationale: the rb2-2 byte-pinned BLIMP_POINTS carries gondola corners [±8, −20, ±8]; the "±16 in y" premise never executed during RED (need() threw first). The transcription outranks the test comment — BLCOLL is the ENVELOPE's body, and a shot under the gondola authentically misses
  - Severity: minor
  - Forward impact: none — the cross-check still bites if either transcription drifts
- **Mountain→band mapping (scrollBandAbs) = the stored-X MSB under the ROM's 5-bit sign-extension idiom**
  - Spec source: this session's TEA deviation "deployGate takes an abstract |position|…"
  - Spec text: "the mapping from our Mountain state to the ROM's 5-bit band |position| (AND I,1F sign-extended, :3417-3421) is Dev's representation seam"
  - Implementation: `scrollBandAbs(x) = |signExtend5((round(x) >> 8) & 0x1F)|`, exported from core/ground-targets.ts; the authored lanes read |4| (centre pair) and |12| (outer pair)
  - Rationale: Mountain.x is already denominated in the ROM's stored-X units (lanes ±0x0C00, WRAPIT ±0x0C01), so its MSB's low 5 bits under the ROM's own AND I,1F / CMP I,10 / ORA I,0F0 idiom is the least-invented mapping; lives in core, not main.ts, per the house rule
  - Severity: minor
  - Forward impact: the mapping has no direct behavioural pin — logged as a Delivery Finding
- **Ground group roll drawn from its OWN sub-seeded stream, not the shared LFSR**
  - Spec source: RBARON.MAC:3450-3451
  - Spec text: "JSR RANDOM / AND I,3 … ;RANDOM PF OBJECT GROUPS" (the ROM's single LFSR)
  - Implementation: `groundRng = createRng((seed ^ 0x9f0b) >>> 0)` in main.ts, drawn only on deploy events
  - Rationale: the rb4-3/rb4-4 stream discipline — drawing from blimpRng would shift the airship's whole seeded life and silently re-roll every seed-calibrated sibling; the repo already forks the ROM's single LFSR into independent per-mechanism streams (blimpRng, aceRng, wave rng)
  - Severity: minor
  - Forward impact: none — deterministic per boot seed like every other stream
- **GTIMER freezes once GRNDCT is spent (the gate is not called), where the ROM keeps DECing it**
  - Spec source: RBARON.MAC:3426-3431
  - Spec text: "DEC GTIMER … 55$: LDA GRNDCT / BEQ 60$" — the DEC runs before the spent gate
  - Implementation: main.ts's deploy loop bounds on `grndct > 0`, so a spent wave's clock holds instead of running negative
  - Rationale: TEA's deviation places the GRNDCT>0 precondition with the caller; frozen vs negative is unobservable (only the gate reads GTIMER and INITGR re-arms it), and deployGate stays total on negative clocks (the pinned already-negative case)
  - Severity: minor
  - Forward impact: none
- **BLCOLL depth extent not ported — the shared WINDOW_Z keeps the shell-z axis**
  - Spec source: context-story-rb4-11.md AC-4 + TEA deviation ("depth extent routed, not pinned")
  - Spec text: "BLCOLL, the blimp's collision box, is transcribed and used for the blimp hit test"
  - Implementation: blimpTarget's window carries BLCOLL's broadside x/y (±40 × ±16, derived); the z bound stays guns.ts WINDOW_Z = 1 shell-z count
  - Rationale: BLCOLL model-x ±16 = 0.0625 shell-z counts — inside the sub-step anti-tunnel overlap bound (2·WINDOW_Z ≥ SHELL_SPEED); porting it would let a shell tunnel the airship between sub-steps. Derivation documented at BLIMP_WINDOW; routed per TEA, never silently invented
  - Severity: minor
  - Forward impact: a successor porting per-target depth windows must re-derive the sub-step overlap first
- **MEASURED_SOURCES enrollment (screen-scale DRAW PATH registry)**
  - Spec source: tests/core/screen-scale.test.ts, "ADDING TO THIS LIST IS A DELIBERATE ACT"
  - Spec text: "a rival renderer … cannot draw without being named here"
  - Implementation: 'groundTargetSegments' added to MEASURED_SOURCES with its test citations
  - Rationale: the registry exists to make new geometry sources a visible diff line; the renderer is behaviourally tested (stroke laws in the machine suite, booted-draw in the wiring suite)
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)

- **TEA: PFOBJN added to the transcription contract** → ✓ ACCEPTED by Reviewer: the ROM display code (`LDA AY,PFOBJN`, :3614) consumes it; independently re-derived from RBARON.MAC in my quarry audit — 4 rows of 3, matching.
- **TEA: Blimp collision window pinned in x/y only; depth routed** → ✓ ACCEPTED by Reviewer: Dev answered the routed question with the 0.0625-z-count derivation; pinning a manufactured z number would have been the real sin.
- **TEA: deployGate abstract |position|; GRNDCT spent-gate with the caller** → ✓ ACCEPTED by Reviewer: keeps the gate a pure ROM machine; the caller side is enforced by the wiring suite's exactly-2 pin.
- **TEA: groundTargetSegments carrier-argument seam** → ✓ ACCEPTED by Reviewer: mirrors mountainSegments/blimpSegments; GRDISP (:3562-3650) confirms the ROM draws slots against their carrier.
- **Dev: gondola cross-check re-seated** → ✓ ACCEPTED by Reviewer: independently verified against the quarry — 037007.XXX:1040+ carries `POINTP 8,-20,-8` (gondola) and `POINTP 0,-18,-14` (gun barrel), so BLIMP_POINTS max |y| is genuinely 20 and TEA's "±16 in y" premise is false; the transcription outranks the premise. One residual gap logged as a [TEST] finding (the exact −20 is now pinned nowhere — see Reviewer findings).
- **Dev: scrollBandAbs = stored-X MSB under the 5-bit sign-extension idiom** → ✓ ACCEPTED by Reviewer: least-invented mapping given Mountain.x's stored-X units; correctly placed in core; the missing behavioural pin is carried as a non-blocking finding.
- **Dev: ground group roll on its own sub-seeded stream** → ✓ ACCEPTED by Reviewer: matches the repo-wide per-mechanism stream fork (blimpRng/aceRng); security specialist confirmed the draw site cannot shift any sibling stream.
- **Dev: GTIMER freezes once GRNDCT spent** → ✓ ACCEPTED by Reviewer: unobservable difference (only the gate reads GTIMER; INITGR re-arms), and deployGate stays total on negative clocks per the pinned case.
- **Dev: BLCOLL depth extent not ported (WINDOW_Z keeps the axis)** → ✓ ACCEPTED by Reviewer: the 16/256 = 0.0625-count window sits far inside the anti-tunnel bound (WINDOW_Z ≥ SHELL_SPEED/2); porting it would break sub-step overlap and let shells tunnel the airship — the deviation PREVENTS a bug.
- **Dev: MEASURED_SOURCES enrollment** → ✓ ACCEPTED by Reviewer: the registry's designed procedure, with real behavioural tests behind the enrolled renderer (stroke laws + booted wiring).

## Sm Assessment

Setup complete and verified on disk. Session file created, story rb4-11 moved to
`in_progress` in sprint tracking, branch `feat/rb4-11-ground-targets` cut from
red-baron `develop` at ded2bd2 (fast-forwarded 7 commits to the rb4-19 merge
before cutting). Story context generated at
`sprint/context/context-story-rb4-11.md`; curated epic context
`context-epic-rb4.md` confirmed untouched (git status clean apart from the new
story context). Jira intentionally skipped — local YAML tracking only; the story
id is the key. Merge gate clear: zero open PRs on slabgorb/red-baron.

Scope for the red phase (Cluster C10, subsumes OB-017/MI-008/OB-016/OB-018):
transcribe from 037007.XXX:1132-1230 the point-sets PFPYRM/PFHOME/PFTANK/PFPBOX,
their four decode-lists, and the PFODEC/PFLOB/.PFLOB/PFOFFS tables; ground waves
deploy two mountain target-groups (GRNDCT=2, GTIMER); BLCOLL
(RBARON.MAC:6270-6277) is the last PLNDB member missing from topology.ts.

Hazards for Imperator Furiosa (TEA):
1. **RADIX TRAP — this 037007.XXX region is `.RADIX 10` (DECIMAL).** Transcribe
   exactly as the existing correct topology.ts entries do. Do NOT apply rb4-1's
   hex correction here; it would corrupt every byte.
2. Verify the cited line window against the actual quarry file before pinning
   citations — generated contexts have fabricated ROM line numbers before.
   Quote from the source, and remember the quarry has three disagreeing copies
   (staircase line offsets).
3. red-baron ships via PRs to develop; citations suite (`npm test -- citations`)
   must stay green per AC-5.

Routing: workflow tdd (phased) → next phase red, owner tea.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 8-point transcription + behaviour feature; four ACs with data, machine, wiring, and collision surfaces.

**Test Files:**
- `tests/core/ground-target-data.test.ts` — AC-1/AC-2 transcription contract: full-value pins for the four point-sets (PFPYRM/PFHOME/PFTANK/PFPBOX), four decode-lists, PFODEC/PFLOB/PFLOB_SEG_BYTES/PFOFFS, PFOBJN, BLCOLL_POINTS. DECIMAL radix with inline hex-misreading refutations (PFOFFS, BLCOLL); the RBARON.MAC:430-433 address-equation byte-sum cross-check; the tank's authentic duplicate-centre-point pair.
- `tests/core/ground-targets.test.ts` — AC-2/AC-3 machine contract for NEW `src/core/ground-targets.ts`: GTIMER_INITIAL=1, deployGate (DEC/BMI/CMP I,8/BCS + re-arm, boundary pair 7/8), groupFromRandom (AND 3), deployGroup (PFOBJN types × PFOFFS offset triples, pill-box-last invariant), groundTargetSegments stroke laws (per-type VV counts 4/5/8/15, projection-free span ratios, the zero-length tank dot).
- `tests/core/blimp-collision.test.ts` — AC-4: the airship hit through the BLCOLL broadside box (±40 × ±16) via the SHARED collides with a target-carried window; discriminators red today (dy ±40, dx 44), KEEP guards green (centre, dx 36 orientation guard, plane COLLD window intact).
- `tests/ground-target-wiring.test.ts` — main.ts integration: placeholder decrement + literal-0 visible count gone; booted seed-444 cockpit deploys EXACTLY 2 groups (AC-3) and draws a full 3-target group (AC-2).
- `tests/core/ground-target-source.test.ts` — the quarry derivation record (GREEN from day one, plane-scale-source pattern): fingerprints the citable copy, rejects sibling + decoy, derives every symbol line, pins the PFPNTS third-argument discard and the radix governance machine-checked.

**Tests Written:** 87 across 5 files — 55 failing, 32 intended guards green (RED verified by testing-runner AND a direct scoped vitest run: `Test Files 4 failed | 1 passed (5)`, full suite `55 failed | 1286 passed | 1 todo`, zero pre-existing regressions; `tsc --noEmit` clean).
**Status:** RED (failing — ready for Dev). Committed as red-baron `2152bf3` on `feat/rb4-11-ground-targets`.

**Pre-GREEN pass audit** (every green is an intended guard): blimp-collision's 6 = KEEP/plane-window guards; wiring's 3 = sanity + two universally-quantified guards that are vacuous on empty recorders but paired with biting existence assertions (`deploys === 2`, full-group draw) in the same file; source suite green by design.

### Rule Coverage

| Rule (typescript.md) | Test(s) / measure | Status |
|------|---------|--------|
| #1 type-safety escapes | the two `as unknown as` mirrors + one computed-specifier import are each commented with WHY (house rb4-7 RED-mirror exception); no `as any`, no ts-ignore | enforced in test code |
| #2 readonly/interface | all mirror interfaces fully `readonly`; decode ops bounds-checked against their point-sets (no out-of-range vertex) | failing (data suite) |
| #4 null/undefined | `need()` throws NAMED errors on every missing export — no undefined-explosion reds; `?? Infinity` on first-deploy frame | enforced in test code |
| #8 test quality | zero vacuous assertions: every universally-quantified guard paired with a positive existence assertion; mocks DELEGATE to real implementations | self-checked |
| #10 input validation | source-suite parsers (opsFrom/pfpntsFrom/pfcolsFrom) THROW on malformed lines rather than silently truncating a table walk | passing (source suite) |

**Rules checked:** 5 of 13 lang-review sections apply to a test-only RED tree; the rest (React, build config, async) have no surface here.
**Self-check:** 0 vacuous tests found after audit (two recorder guards identified as empty-vacuous and deliberately paired with biting assertions — documented in the wiring suite).

**Sibling re-seat surface:** audited and EMPTY — blimp.test.ts stages its kill dead-centre (inside both windows) and its miss at +400 (outside both); blimp-wiring's shared-seam pins assert `explode`/`stepGuns` presence only; mission-clock's groundModeEnds contract is unchanged; mountain-scroll-wiring needs only that ground frames EXIST, which the real machine preserves. No sibling test needed re-seating.

**Quarry discipline:** all citations resolved against the citable `~/Projects/red-baron-source-text` (fingerprint: RBARON.MAC 6294 split-lines, :74 RADIX 16, :621 CALCNT=18; 037007.XXX `.TITLE RBPICS`, radix switch at :43/:80 only). The 037007.XXX ground window and RBARON.MAC:6217-6281 (BLCOLL) are `.RADIX 10` — DECIMAL, refuted-in-test against rb4-1's hex correction.

**Handoff:** To The Word Burgers (Dev) for GREEN. Build order that turns reds green fastest: (1) topology.ts data exports (data suite + source suite already proves the bytes), (2) `src/core/ground-targets.ts` machine, (3) the blimp window seam (Enemy.window optional + blimpTarget derivation), (4) main.ts wiring (replace the rb4-7 placeholder; thread the real visible count into groundModeEnds). After main.ts edits, run the citations suite (AC-5) — if `ours` anchors shifted, use the repo's reanchor tool, never hand-shift line numbers.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `red-baron/src/core/topology.ts` - GROUND TARGETS section: PFPYRM/PFHOME/PFTANK/PFPBOX, DEPFPY/DEPFHS/DEPFTK/DEPFPB, PFODEC/PFLOB/PFLOB_SEG_BYTES/PFOFFS, PFOBJN, BLCOLL_POINTS — all DECIMAL, verified against the citable quarry firsthand (037007.XXX:1125-1246, RBARON.MAC:3924-3927/:6270-6277/:425-433 read before transcribing)
- `red-baron/src/core/ground-targets.ts` - NEW: GTIMER_INITIAL, deployGate, groupFromRandom, deployGroup, groundTargetSegments, scrollBandAbs (the representation seam, in core per the house rule)
- `red-baron/src/core/enemy.ts` - Enemy gains optional `window` (target-carried collision bounds; absent = COLLD plate, planes unchanged)
- `red-baron/src/core/guns.ts` - collides bounds by the target's carried window via `??` (never `||`); COLLD plate stays the default
- `red-baron/src/core/blimp.ts` - BLIMP_WINDOW derived from BLCOLL_POINTS (broadside: x = max|z| = 40, y ±16); blimpTarget carries it; depth-extent derivation documented in place
- `red-baron/src/main.ts` - the deploy machine runs per mountain step in ground mode (spent-gate caller-side per TEA deviation); groups ride their carrier slot and shed at recycle; groundModeEnds(grndct, groundGroups.length) — the placeholder burn and the literal 0 are gone; INITGR arms GTIMER; draw() strokes groundTargetSegments per group against its carrier; groundRng sub-seeded stream
- `red-baron/tests/core/ground-target-data.test.ts` - ONE re-seat: the BLCOLL↔BLIMP_POINTS y cross-check (TEA premise false — gondola dips to −20, authentically outside the box; see deviation + finding)
- `red-baron/tests/core/screen-scale.test.ts` - MEASURED_SOURCES enrolls groundTargetSegments (the registry's deliberate act)

**Tests:** red-baron FULL suite 1344/1344 passing + 1 todo, 80 files (GREEN — the story's 87 across 5 files all green); `tsc --noEmit` clean; `npm run build` clean; `npm test -- citations` 41/41 (AC-5); check-citations.mjs exit 0, no reanchor needed.
**Branch:** feat/rb4-11-ground-targets (pushed, `7adc70e` on `2152bf3`)

**Verification beyond the suite:** orientation probe (throwaway node script, deleted) drove the REAL groundTargetSegments — pyramid apex projects at MAX ndc y (3 apex endpoints vs 5 base — not upside-down, which the sign-blind span-ratio laws cannot see), and all four groups land fully in-frame at a realistic centre-lane fallen carrier with segment totals 24/23/28/31 = exactly each group's decode-list VV sums.

**Handoff:** To next phase (verify or review). For the Thought Police (Reviewer): the two test-file edits are the diff-trace targets — the gondola re-seat (deviation 1, the transcription outranks the premise) and the MEASURED_SOURCES line; BLIMP_WINDOW is derived, never re-typed literals; the depth-extent question is answered in the Delivery Findings with the 0.0625-z-count derivation.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1344/1344 green, build clean, citations 41/41, tree clean, no debug code |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3 (2 MEDIUM, 1 LOW), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (LOW, defense-in-depth), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 17 rules, 61 instances, 0 violations |

**All received:** Yes (4 enabled returned — preflight, test-analyzer, security, rule-checker; 5 disabled via workflow.reviewer_subagents)
**Total findings:** 4 confirmed, 0 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Independent verification (not taken from Dev's word):**
- Transcription re-derived from the quarry by a fresh Reviewer script (not the vitest suites): all
  14 tables — 4 point-sets, 4 decode-lists, PFOFFS, PFODEC/PFLOB pointer orders, PFLOB_SEG_BYTES
  law, PFOBJN, BLCOLL_POINTS — 0 mismatches; radix governance confirmed (037007.XXX switches at
  :43/:80 only; BLCOLL governed by the `.RADIX 10` at RBARON.MAC:6217).
- The gondola dispute settled at the source: 037007.XXX carries `POINTP 8,-20,-8` (gondola) and
  `POINTP 0,-18,-14` (gun barrel) — Dev's re-seat premise is quarry-true, TEA's "±16 in y" was not.
- Preflight independently reran everything: 1344/1344 + 1 todo, tsc + vite build clean, citations
  41/41, working tree clean, zero debug patterns in the diff.

**Data flow traced:** trigger (Space) → fire() → Shell pool → stepGuns(guns, [...planes,
worldBlimpTarget(blimp, eye)], eye) → collides() reads the TARGET-carried window
(guns.ts:448-450, `??` fallbacks — the airship judged by its own BLCOLL broadside, a plane by the
COLLD plate) → Hit → scoreKill('blimp'|kind) → queueScore → SCOREM count-up → HUD. Safe because the
only external input (the `?seed=` URL param) is coerced `Number(x) >>> 0` before any stream is
seeded, and every collision bound derives from transcribed, `readonly` ROM data.

**Wiring verified:** main.ts imports the machine (structural pin), the deploy machine runs inside
the calc-frame mountain block (main.ts:671-693), draw() threads groundGroups → groundTargetSegments
against the live carrier (main.ts:485-492), and groundModeEnds consumes the REAL visible count
(main.ts:820) — the booted seed-444 cockpit deploys exactly 2 groups and never a third.

**Pattern observed (good):** the carrier-as-argument render seam at ground-targets.ts:120 —
groundTargetSegments mirrors mountainSegments/blimpSegments exactly (altitude-only eye, POSITH lift
via projectWorldSegment, behind-eye culling), so the new renderer entered MEASURED_SOURCES with
behavioural laws instead of by drift.

**Error handling:** scrollBandAbs and deployGate are total on NaN/±Infinity (ToInt32 folds to band
0; pure arithmetic never throws — security specialist verified both); deployGate's already-negative
clock case is pinned. The one gap — deployGroup/groundTargetSegments unguarded table indexing — is
confirmed LOW (unreachable through the sole caller's `& 3` mask) and logged as a finding.

**Observations (≥5, tagged):**
1. [VERIFIED] Transcription byte-exact — Reviewer's independent quarry diff, 14/14 tables, 0
   mismatches; DECIMAL radix proven for both regions. Complies with the epic's byte-exactness rule
   and lang-review #2/#17 (all 14 exports fully `readonly`, topology.ts:493-637).
2. [VERIFIED] collides window merge uses `??` never `||` — guns.ts:448-450; a legitimate 0 bound
   survives (P_IIDL[0] house rule). Plane path proven unchanged: spawn() never sets `window`
   (enemy.ts:548-574), and the rb4-17 plate regression tests still bite (blimp-collision.test.ts
   KEEP suite — substituting the un-yawed ±16 flips the 36-offset case).
3. [SEC] LOW confirmed: deployGroup (ground-targets.ts:97) and groundTargetSegments (:132) index
   PFOBJN/PFLOB/PFODEC without a bounds guard — safe only via the caller's AND-3 mask; add a
   fail-safe empty return (defense-in-depth, non-blocking).
4. [TEST] MEDIUM confirmed: the wiring recorder counts INPUT targets, not returned segments — the
   "is drawn" assertion is a call-detector; a zero-segment projection mutation would pass. Coverage
   gap only (geometry proven in the machine suite; composition probe-verified in-frame).
5. [TEST] MEDIUM confirmed: span-ratio stroke laws are sign-blind; no committed orientation pin —
   an inverted pyramid would pass. Probe proved apex-up once; the pin belongs in the suite.
6. [TEST] LOW confirmed: after the re-seat, the gondola's exact −20 is pinned nowhere — drift
   inside (−20, −16) is invisible to the whole suite. Pin the exact value beside the cross-check.
7. [RULE] Clean — rule-checker swept all 13 lang-review checks + 4 house rules across 61
   declarations: 0 violations; every `as unknown as` is a commented RED-mirror in tests; the only
   new main.ts literals are an RNG byte scalar and a sub-seed, not geometry.
8. [EDGE] (specialist disabled — covered by Reviewer + machine suite): deployGate's boundary pair
   7/8 pinned both sides; recycle-shed filter keeps equal-depth (inactive) carriers and sheds only
   the depth-snap-back; same-slot double-decorate is unreachable (traced: the second deploy always
   lands on a different slot) and the filter-then-add replace stays coherent even if reached.
9. [SILENT] (specialist disabled — covered by Reviewer): the two unbound catches in the new tests
   are both explicitly commented RED fallbacks whose absence is re-asserted by need()/non-empty
   checks; no swallowed error paths in src (rule-checker #11 concurs).
10. [DOC]/[TYPE]/[SIMPLE] (specialists disabled — covered by rule-checker + Reviewer): comments
    carry live citations I spot-checked against the quarry (GRDISP/DDIVIT reading confirmed at
    RBARON.MAC:3573-3601); all new types readonly-first; no dead code — every export has a consumer
    or a documented audit role.

### Rule Compliance

Mapped to .pennyfarthing/gates/lang-review/typescript.md (rule-checker's exhaustive sweep,
cross-checked by me): #1 type-safety escapes — 5 instances, all commented house-exception RED
mirrors, 0 violations. #2 generics/readonly — 20 instances (every new interface field, param, and
the 14 topology exports), 0 violations. #3 enums — none in diff. #4 null/undefined — 7 instances,
`??` used correctly everywhere it matters (guns.ts:448-450 the load-bearing case). #5 modules —
type-only imports correctly marked; extensionless per repo convention. #6 React — N/A. #7 async —
4 test-side instances, all awaited; src/core stays synchronous-pure. #8 test quality — passthrough
mock delegates via importOriginal with spread; no `as any`; no dist/ imports. #9 build config —
untouched. #10 input validation — no `as T` on external input. #11 error handling — 2 commented
RED-fallback catches, both re-asserted. #12 perf — test-time file reads only. #13 fix-regressions —
N/A round 1. House rules: core purity (5 files, 0 violations), no-geometry-in-main.ts (verified:
256 and 0x9f0b are RNG scalars, not spatial), readonly-first (14/14).

### Devil's Advocate

Assume this is broken. The strongest attack: BOTH target-groups deploy on the ground wave's first
calc frame — GTIMER arms at 1, four mountain events run per frame, and the centre-lane pair reads
band |4| < 8, so the "pacing clock" paces nothing. Is the machine then a fiction? I traced the
ROM's own arithmetic: DEC GTIMER runs per mountain event, BMI fires at −1, and the authored centre
lanes sit inside the CMP I,8 bound — the arcade's own opening deploys are exactly this fast. The
pacing bites only when the pilot has panned the lanes outward; ours does too. The difference that
survives scrutiny: if the ROM services one PF object per frame rather than four, its two deploys
spread over ≤4 calc frames (~384 ms) where ours land in one. No AC, test, or player-visible
behaviour distinguishes them; I note it and move on. Second attack: the offsets' negative y puts
targets BELOW the carrier's baseline — underground? No: the probe shows them at ndc y ≈ −0.7, on
the ground plane in front of the mountains, below the POSITH-lifted horizon, which is where ground
targets stand; the ROM's DDIVIT arrangement (offsets divided by the carrier depth into the
projection's translation, RBARON.MAC:3573-3601) is exactly what worldPoint reproduces. Third: the
ground wave now lasts up to ~190 calc frames (a horizon-carrier decoration) instead of rb4-7's ~2
— could that starve the schedule? The mode ends on the ROM's own condition (GRNDCT spent AND
nothing visible); mission-clock's contract is unchanged and the full suite agrees. Fourth: the
window seam — could a plane ever acquire a window and shrink its plate? Only blimpTarget sets one;
spawn() cannot; the type is optional-readonly. The genuine residue of this exercise is what the
specialists already caught: the wiring recorder measures calls, not pixels, and orientation is
probe-proven but not suite-pinned. Both are logged as findings for the verify phase; neither is a
shipped defect.

**Handoff:** To The Organic Mechanic (SM) for finish-story. Non-blocking findings (4) are logged
under Delivery Findings for TEA's verify pass or a successor story.
## Impact Summary

_Compiled manually by SM at finish (the auto-writer emitted no section — the known
word-wrap gap). Source: the 10 Delivery Findings above (TEA 3, Dev 3, Reviewer 4), all
non-blocking; review verdict APPROVED; PR #39 merged to red-baron develop (9423ac0)._

**Successor-story seeds:**
- Ground targets are SHOOTABLE in the ROM (GRCOLN vs the PFOCOL boxes topology.ts already
  carries) and tank/pill box are ACTIVE emplacements (+0x20 brighter, PFOBLN positions,
  fire back) — a successor story should add shoot/score + emplacement fire. (TEA)

**Test-hardening follow-ups (TEA verify pass or successor; none block):**
- Wiring recorder should measure groundTargetSegments' RETURNED segment count, not the
  input target count (today it is a call-detector). (Reviewer)
- Add a sign-anchored orientation pin — the span-ratio laws cannot catch an inverted
  shape; apex-up is probe-proven only. (Reviewer)
- Pin BLIMP_POINTS' gondola y exactly (−20) beside the re-seated BLCOLL cross-check. (Reviewer)
- Pin the scrollBandAbs lane behaviour (centre lanes |4| deploy immediately; outer |12|
  wait out GTIMER). (Dev)

**Defense-in-depth (non-blocking):** bounds-guard deployGroup/groundTargetSegments table
indexing (safe today via the caller's AND-3 mask). (Reviewer/Security)

**Questions closed:** TEA's BLCOLL depth-extent question answered with the 0.0625-z-count
derivation at blimp.ts BLIMP_WINDOW (shared WINDOW_Z keeps the axis — porting ±16 would
break sub-step anti-tunnelling). The gondola cross-check premise corrected at the quarry
(BLIMP y reaches −20; the ROM's box excludes the gondola by design).
