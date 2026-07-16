---
story_id: "sw7-7"
jira_key: "sw7-7"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-7: R7 Explosions and finale — piece lifetimes and age-keyed color ramp (TIE pieces never white-flash), 4-phase ring finale with looming prelim, authentic Death Star picture, tower/bunker debris

## Story Details
- **ID:** sw7-7
- **Jira Key:** sw7-7
- **Workflow:** tdd
- **Stack Parent:** sw7-1 (blocking: R7 depends on timebase from R1)
- **Points:** 12
- **Priority:** p2
- **Type:** feature (bug)
- **Status:** backlog

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T09:56:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T06:19:15Z | 2026-07-16T06:22:44Z | 3m 29s |
| red | 2026-07-16T06:22:44Z | 2026-07-16T09:08:07Z | 2h 45m |
| green | 2026-07-16T09:08:07Z | 2026-07-16T09:37:00Z | 28m 53s |
| review | 2026-07-16T09:37:00Z | 2026-07-16T09:56:04Z | 19m 4s |
| finish | 2026-07-16T09:56:04Z | - | - |

## Acceptance Criteria

> **SCOPE NARROWED 2026-07-16.** The original 12-pt sw7-7 subsumed six findings.
> Per the Jedi's ruling it was split (orchestrator commit 7245c4a): sw7-7 is now
> **R7a — the TIE explosion pieces only (X-002 + X-003)**. The rest moved out:
> **X-005** ground debris → **sw7-14 (R7b)**; **X-006 + X-007 + M-010** finale +
> authentic Death Star picture → **sw7-15 (R7c)**. Ground truth verified against the
> in-repo ROM `reference/atari-source/star-wars-1983/WSXPLD.MAC` (matches the
> findings' cited line numbers 1:1).

### AC-1 — X-002: per-piece TIE explosion lifetimes (wings outlive the globe)
ROM `BGAXP` (WSXPLD.MAC) spawns three pieces, each with its own `XP$TMR`,
decremented once per 20.508 Hz game frame by `DOXPLD`:
- **Wings** (`TP$TI1`/`TP$TI2`) `LDA #18` (:165, :196) = **0x18 = 24 frames = 24/20.508 ≈ 1.170 s**.
- **Centre globe** (`TP$TI3`) `LDA #10` (:224) = **0x10 = 16 frames = 16/20.508 ≈ 0.780 s**.
- RADIX 16 (`.INCLUDE WSCOMN`), immediates un-dotted ⇒ HEX (not decimal 18/10).
- Replace the single flat `TIE_DEATH_SECONDS = 0.7` (state.ts:263) — an avowed
  eyeball tunable — used for all three (sim.ts:309 cull, render.ts:390 spread).
- Observable: the wings must OUTLIVE the globe (globe pops first), and the whole
  cue must span ~the wing life (~1.170 s), not vanish at 0.7 s.
- Keep citations green; mark **X-002 remediated_by "sw7-7"**.

### AC-2 — X-003: age-keyed colour ramp; TIE pieces NEVER white-flash
ROM `VWTIN` colours each piece from its own timer: `CMPB #1F / IFHI → VJFLS`
("REALLY FLASH", white) only when timer > 0x1F=31; ELSE `TVWCLE[2×timer]` — an
age-keyed colour/intensity ramp (WSXPLD.MAC:761-770).
- Every TIE piece is born BELOW the flash threshold (24 and 16 ≤ 31) and the timer
  only ever DECs, so TIE pieces **NEVER take the VJFLS white branch** — that path
  belongs solely to ground objects (timer 0x20=32, finding X-005 → sw7-14).
- **CORRECTED** from pre-audit notes: TIE pieces do NOT flash white; the net
  divergence is purely the MISSING age-keyed ramp. Ours draws one static `TIE_GLOW`
  green for all three (render.ts:394-396).
- Pin the STRUCTURE (age-keyed, ≥2 distinct hues over a life, never white) — the
  exact TVWCLE hexes are AVG-hardware bitfields the finding leaves undecoded.
- Keep citations green; mark **X-003 remediated_by "sw7-7"**.

_Findings X-005 / X-006 / X-007 / M-010 are OUT of scope here — see sw7-14 / sw7-15._

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking): after editing the cited lines (`state.ts:263`
  `TIE_DEATH_SECONDS`, `render.ts:396` fragment draw), the citations suite
  (`tests/audit/citations.test.ts` "every committed findings file passes") goes RED
  until reanchored. Run `node tools/audit/reanchor-citations.mjs --write` AND set
  `remediated_by: "sw7-7"` on X-002/X-003 in `docs/audit/findings/pair-explosions.json`.
  Editing render.ts/state.ts also shifts the line numbers of the *other*
  pair-explosions citations (X-004..X-009) and any state.ts-citing findings — reanchor
  fixes both. A remediated DIVERGENCE must keep a well-formed `ours` (citations.test
  rejects `ours: null` for DIVERGENCE), so point it at a representative fixed line.
- **Gap** (non-blocking, test-enforced): the fix has TWO halves that must land
  together — the core cull (`sim.ts:309` `.filter(d => d.age <= TIE_DEATH_SECONDS)`)
  must keep the entry until the WING (max) life ~1.170 s, while the render must
  independently STOP drawing the globe fragment at the globe life ~0.780 s. Changing
  only the render gating leaves wings culled early (the "wings persist to 1.1 s" test
  bites). Affects `src/core/sim.ts` + `src/shell/render.ts`.
- **Improvement** (non-blocking): wished-for X-002 API the core test imports —
  `TIE_WING_LIFE_SECONDS = 0x18 / TICK_HZ` and `TIE_GLOBE_LIFE_SECONDS = 0x10 / TICK_HZ`
  in `state.ts` (mirroring `DARTH_GLOW_SECONDS = 0x1f / TICK_HZ`). The render fraction
  `f = age / TIE_DEATH_SECONDS` (render.ts:390) becomes per-piece.
- **Question** (non-blocking): the ROM keys each piece's colour to its OWN countdown
  (wing born at 24, globe at 16 → `TVWCLE[2×timer]`), so wing and globe show DIFFERENT
  hues at the same wall-clock age. The suite pins age-keying + never-white but not
  per-piece hue divergence, and the exact TVWCLE hexes are undecoded — a faithful ramp
  keys colour to each piece's own age-fraction and routes exact hues to the citation.
  Affects `src/shell/render.ts`.

### Dev (implementation)
- **Gap** (non-blocking): the TEA Assessment cites ground truth at the in-repo path
  `reference/atari-source/star-wars-1983/WSXPLD.MAC` — that path does **not exist**
  (`star-wars/reference/` holds only `disasm/` + `README.md`). The real source is the
  machine-local greppable copy `~/Projects/star-wars-1983-source-text/WSXPLD.MAC`, which is
  also what `tests/audit/citations.test.ts` resolves by default (`STARWARS_SOURCE_DIR ??
  '/Users/slabgorb/Projects/star-wars-1983-source-text'`). I re-verified every cited line
  there and TEA's DECODE is correct 1:1 (:165/:196 `LDA #18`, :224 `LDA #10`, `.RADIX 16` at
  WSCOMN.MAC:5, VWTIN `CMPB #1F`/`IFHI`→VJFLS at :763-768) — only the PATH in the prose is
  wrong. Affects the session doc + any story context copying it (a future reader will look
  in a directory that isn't there).
- **Improvement** (non-blocking): X-004's `claim` prose still reads "a linear spread
  `s = f * TIE_DEATH_SPREAD` driven by age (render.ts:391)". The structural gap it describes
  (pieces carry no velocity state) is genuinely unchanged, so the finding correctly stays
  OPEN — but there are now two spreads (`ws`/`gs`) and that exact spelling is gone. Per the
  repo convention (don't silently rewrite a finding's prose) I re-anchored only the citation.
  Audit curators may want to refresh the wording.
  Affects `docs/audit/findings/pair-explosions.json`.
- **Improvement** (non-blocking): `tools/audit/reanchor-citations.mjs` reserializes findings
  with literal non-ASCII, so it normalized `pair-models.json`'s 19 `—` escapes to
  em-dashes — 38 diff lines of pure encoding churn with **zero** semantic change (proven by
  parse-and-compare vs HEAD: that file's only semantic deltas are the M-008/M-014 line
  reanchors; M-010 untouched). Nine of the ten findings files were already literal, so this
  converges the outlier — but every story that runs the tool carries this noise into files
  it never triaged. Affects `tools/audit/reanchor-citations.mjs`.

### Reviewer (code review)
- **Gap** (non-blocking): the fidelity property this story exists to create — the ROM's
  SHARED-ramp keying (wing and globe walk one table, so they differ at equal wall-clock age)
  — is pinned by NO test. **Proven by mutation:** reverting `tiePieceGlow`'s argument to the
  age-fraction model Dev's deviation explicitly rejected (`tiePieceGlow((1 - wf) * TVWCLE_DOMAIN)`)
  leaves **45/45 green**. Under that mutation both pieces are born the SAME colour and the
  per-piece tell vanishes silently. Compounding it: X-003 is now `remediated_by`, so the
  citation checker has permanently stopped re-opening that line — the test suite is the ONLY
  remaining guard, and it does not guard this. sw7-14 (X-005) is scheduled to modify this very
  function (ground pieces need the VJFLS branch). Suggested pin: wing-at-age-0 ≠ globe-at-age-0,
  and wing at timer 16 == globe at birth. Affects `tests/shell/render.tie-explosion-fidelity.test.ts`.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): TEA's blocking Delivery Finding instructs "A remediated
  DIVERGENCE must keep a well-formed `ours` … so point it at a representative fixed line."
  That contradicts `reanchor-citations.mjs`'s own documented contract ("the citation stays as
  the historical record of what our code said when it was audited, and its line number is
  deliberately frozen") and contradicts 12/12 prior remediated findings in this epic
  (sw7-1/2/3/5/11/13), whose frozen quotes all no longer match source. Dev correctly followed
  the tool + precedent. The TEA guidance should be corrected so the next story does not
  "launder" a frozen citation onto a live line. Affects the TEA test-design guidance / sidecar.
  *Found by Reviewer during code review.*

## Design Deviations

None recorded at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Story narrowed from six findings to two (X-002 + X-003)**
  - Spec source: session scope / story sw7-7 title + description (six findings)
  - Spec text: "…4-phase ring finale with looming prelim, authentic Death Star picture, tower/bunker debris"
  - Implementation: sw7-7 re-scoped to the TIE-piece cluster only; X-005 → sw7-14, X-006/X-007/M-010 → sw7-15 (orchestrator commit 7245c4a)
  - Rationale: audit surface was ~20-28 pts incl. the M-010 3D-sphere→2D-picture architecture reversal; the Jedi ruled a 3-way split
  - Severity: major
  - Forward impact: sw7-14 (ground debris) and sw7-15 (finale + authentic Death Star picture) now own the deferred findings; both depend on sw7-1 like the parent did
- **X-003 pinned as STRUCTURE, not exact hues**
  - Spec source: context-story-sw7-7.md AC / finding X-003
  - Spec text: "age-keyed color ramp — TIE pieces NEVER white-flash"
  - Implementation: tests assert age-keying (≥2 distinct fragment colours over a life) + never-white; they do NOT pin specific TVWCLE hexes
  - Rationale: the finding itself scopes X-003 to structure — the TVWCLE hues are AVG-hardware bitfields it leaves undecoded; pinning pixels rejects a faithful port (repo "colour-family + topology, not pixels" convention)
  - Severity: minor
  - Forward impact: exact hues land via the citation, not a unit test; per-piece hue divergence routed to a Delivery Finding
- **Fragments isolated by reading the existing `dyingTies` field (not fully seam-agnostic)**
  - Spec source: sibling test convention (sw3-8 render.tie-death-fragments stayed field-agnostic)
  - Spec text: sw3-8 "never name a new field"
  - Implementation: the render suite isolates fragment segments/colours with a `{...s, dyingTies: []}` self-baseline
  - Rationale: `dyingTies` is the ESTABLISHED death representation and THIS story modifies its lifetimes + colour; a fresh baseline carried an unmatched muzzle-flash confound (probed: ~40 phantom segments) that the self-baseline cancels exactly
  - Severity: minor
  - Forward impact: if Dev renames/replaces the `dyingTies` array wholesale, this suite needs a one-line re-seat (the field is public and unchanged today)

### Dev (implementation)
- **Colour ramp keyed to each piece's ABSOLUTE remaining timer, not its own age-fraction**
  - Spec source: session AC-2 (X-003) + TEA's non-blocking Question in Delivery Findings
  - Spec text: TEA's Question — "a faithful ramp keys colour to each piece's own age-fraction and routes exact hues to the citation"; AC-2 — "ROM `VWTIN` colours each piece from its own timer … `ELSE TVWCLE[2×timer]` — an age-keyed colour/intensity ramp"
  - Implementation: `tiePieceGlow(timerFrames)` keys off the absolute remaining ROM frames — `(LIFE - age) * TICK_HZ` — over the table's `0x00..0x1F` domain, so BOTH pieces walk ONE shared ramp; the wing merely starts higher up it (born 0x18=24) than the globe (0x10=16). Rejected the age-fraction reading TEA's Question proposed.
  - Rationale: an age-fraction normalises each piece to its OWN life, so both are born at t=0 and render the SAME hue — which erases the exact per-piece divergence the ROM has and TEA's Question asks about. The ROM indexes ONE table by the raw countdown: wing-at-birth = TVWCLE[48] ≠ globe-at-birth = TVWCLE[32], and a wing decayed to timer 16 shows the globe's birth colour. Verified numerically: wing born `rgb(93,196,54)`, globe born `rgb(62,157,36)`, wing at age 0.40 s (timer 15.8) → `rgb(61,156,36)` ≈ the globe's birth hue. Both readings pass TEA's structure-only tests; only this one reproduces the ROM's structure.
  - Severity: minor
  - Forward impact: sw7-14 (X-005, ground debris) shares this ramp's shape — ground pieces are born at timer 0x20=32, ABOVE the `#1F` threshold, so they DO take the VJFLS white branch on their first frames and only then fall into `TVWCLE`. `tiePieceGlow` deliberately clamps at `0x1F` and never whitens; sw7-14 must add the VJFLS branch for ground objects rather than reuse this function unchanged.
- **Two findings outside the story's named set (X-001, X-004) had their `ours` citations re-pointed**
  - Spec source: session AC-1/AC-2 ("mark X-002 / X-003 remediated_by") + `tools/audit/reanchor-citations.mjs` LOST triage rule
  - Spec text: AC scope is exactly two findings — "sw7-7 is now R7a — the TIE explosion pieces only (X-002 + X-003)"
  - Implementation: reanchor reported `LOST X-001` and `LOST X-004` (both cite lines this story re-spelled). Neither was stamped `remediated_by`; each had its `ours` line+verbatim hand-edited onto the new spelling and stays OPEN.
  - Rationale: the two-honest-exits rule. X-001 is a `CONFIRMED` **match** record ("three pieces, left/right lateral split") — the story PRESERVED that, so there was no divergence to remediate; stamping it would fabricate a fix. X-004 is `STRUCTURAL`/`accept` ("ours fakes motion in render from age") — the code STILL fakes motion from age (no velocity state added), so the gap is live and stamping it would close the gate's eye on a real divergence. Both were merely re-spelled, so exit #2 (fix the quote) applies. Reanchor now reports 0 lost.
  - Severity: minor
  - Forward impact: X-001/X-004 remain open and now cite render.ts:428/:426; a future story adding real per-piece velocity closes X-004 properly. `pair-explosions.json` is touched beyond the two named findings — intentional, and the audit suite is green (34/34).

### Reviewer (audit)

**TEA deviation 1 — "Story narrowed from six findings to two (X-002 + X-003)"** → ✓ ACCEPTED by Reviewer: the split is the Jedi's ruling, recorded in orchestrator commit 7245c4a, and `sw7-7-remediation.test.ts` mechanically pins the split-out findings OUT. Independently verified: M-010 `remediated_by` is `None`; X-005/X-006/X-007 unstamped.

**TEA deviation 2 — "X-003 pinned as STRUCTURE, not exact hues"** → ✓ ACCEPTED by Reviewer: the finding itself scopes X-003 to structure (its `reasoning` says the TVWCLE hues "are NOT fully decoded here, so this finding claims the STRUCTURE"). Pinning undecoded AVG bitfields would reject a faithful port. Note the cost is real and I have filed it as a finding — see [TEST] below: structure-only pinning is exactly what let the mutation survive.

**TEA deviation 3 — "Fragments isolated by reading the existing `dyingTies` field"** → ✓ ACCEPTED by Reviewer: verified sound. `dyingTies` is read in exactly ONE place in render (`render.ts:418`) and nothing else in render or sim derives a count/scale from it, so the `{...s, dyingTies: []}` self-baseline cancels the backdrop exactly with no confound. Field is public and unchanged.

**Dev deviation 1 — "Colour ramp keyed to each piece's ABSOLUTE remaining timer, not its own age-fraction"** → ✓ ACCEPTED by Reviewer, and it is the best judgment call in this story. Dev rejected the reading TEA's own Question proposed and chose the more faithful one. Independently verified three ways: (a) the ROM reading is corroborated at primary source — `VWTIN` indexes ONE table (`LDU #TVWCLE / LSLB / LDD B(U)`) by the raw `XP$TMR`, not by any per-piece fraction; (b) the shared-ramp property is robust, not incidental — the wing's timer is ALWAYS exactly 8.0 frames above the globe's (`(1.1703-0.7802)×20.508 = 8.0`), so the two can never collide at any age, and `g` always differs by ~38.7/255; (c) the rejected fraction model provably erases the tell (both born `t=0` → same hue). Dev's numeric figures reproduce exactly.

**Dev deviation 2 — "Two findings outside the story's named set (X-001, X-004) had their `ours` citations re-pointed"** → ✓ ACCEPTED by Reviewer: the triage is correct in both directions and I re-derived it independently. X-001 is `class: CONFIRMED` — a MATCH record whose subject (three pieces, lateral split) this story preserved; stamping it would have fabricated a fix. X-004 is `class: STRUCTURAL / recommendation: accept` — the code still fakes motion from age with no velocity state, so the gap is live; stamping it would have closed the gate's eye on a real divergence. Both re-pointed quotes verified byte-for-byte against live source (render.ts:428, :426). Reanchor: 0 lost.

**UNDOCUMENTED (found by Reviewer)**
- **Dev silently overrode TEA's explicit instruction on remediated citations.** TEA's blocking Delivery Finding says "point it [the remediated `ours`] at a representative fixed line." Dev instead FROZE X-002/X-003 at their historical quotes (`state.ts:263 "export const TIE_DEATH_SECONDS = 0.7"`, `render.ts:396 "…TIE_GLOW)"`) — lines that no longer exist. Not logged as a deviation. **Severity: Low, and the outcome is CORRECT** — freezing is what `reanchor-citations.mjs` documents ("the citation stays as the historical record … its line number is deliberately frozen"), what the tool enforces (it skips `remediated_by` findings), and what 12/12 prior remediated findings in this epic do (all have frozen quotes that no longer match source). Dev followed the tool and the precedent over TEA's prose; that was right, but overriding a written instruction from the prior phase should have been recorded. No action required on the code — filed as a Delivery Finding so TEA's guidance gets corrected.

## Technical Approach

1. **Piece Color/Lifetime System**
   - Refactor explosion piece lifecycle to track birth frame and age
   - Implement 24-frame and 16-frame distinct lifetimes
   - Create age-keyed color ramp (verify TIE never reaches white #FF)
   - Separate TIE piece rendering path from ground object path (ground gets white flash at 32 frames, TIE never does)

2. **Authentic Death Star Pictures (M-010)**
   - Port BSHEM, BSCIR, BSTRN, BSDSH picture data from ROM
   - Configure picture multiplier M.=32 in renderer
   - Verify scale and placement in trench context

3. **Finale Animation (X-006)**
   - Implement 4-phase DCIRCL+DRING sequence (RED → blue → white → decay)
   - Total duration ~89 frames (~4.3s)
   - Integrate with game-end flow

4. **Looming Prelim (X-007)**
   - Add preliminary animation step before main finale
   - Use authentic Death Star pictures (M-010 output)
   - Test visual progression and timing

5. **Tower/Bunker Debris (X-005)**
   - Port TW1-3 (tower) and BK1-3 (bunker) debris piece data
   - Implement ballistic trajectory physics
   - Add ground shadow rendering
   - Test collision and visual appearance

6. **Audit Trail**
   - Update docs/audit/findings/ with remediated_by citations for X-002, X-003, X-006, X-007, X-005, M-010
   - Verify npm test citations green before PR merge

## Blockers & Dependencies

- **Blocked by:** sw7-1 (R1 Timebase) — must land first; all numeric constants re-bake on correct base
- **Required before:** sw7-8 can fully land (audio timing), sw7-9 splits (TIE VM and choreography)

## Sm Assessment

**Setup validated. Dependency `sw7-1` (R1 Timebase) is DONE — the frame-based
constants in this story (24f/16f lifetimes, ~89f finale) rest on a correct base.
Merge gate clear: no open PRs in star-wars.**

This is the largest engagement left in epic sw7 — 12 points subsuming **six** audit
findings (X-002, X-003, X-006, X-007, X-005, M-010). I have anticipated its shape:
it is not one feature but a *federation* of related fidelity fixes, and the RED
phase must fence each finding with its own failing test so the citations can be
marked `remediated_by` independently.

**Routing:** phased `tdd` → RED phase → **Han Solo (TEA)**.

**Context for TEA — three traps I have foreseen:**

1. **The white-flash inversion (X-003) is the sharp edge.** The CORRECTED spec is
   counter-intuitive: TIE explosion pieces are born with timers 24/16 frames
   *below* the `#1F` threshold and therefore **NEVER** reach the white-flash path.
   White flash (`#FF` at 32 frames) belongs *only* to ground objects. Write the
   test that would FAIL if a TIE piece ever renders white — that is the whole point
   of this finding. Do not let a "brighten toward white" ramp slip through green.

2. **M-010 is load-bearing for two other findings.** X-007 (looming prelim) and
   X-006 (finale) both consume the authentic Death Star pictures (BSHEM/BSCIR/
   BSTRN/BSDSH at multiplier `M.=32`). The audit note says our "no authentic data"
   comment is *refuted* — the data exists. For authentic vector picture data,
   the AVG picture ROM is NOT in the gitignored disasm; use the historicalsource
   `star-wars` WSVROM.MAC route (see the memory on AVG vectors). Sequence the RED
   tests so M-010's data contract is pinned before X-006/X-007 timing tests.

3. **Six citations must stay green.** Each finding says "keep citations green; mark
   remediated_by." The audit-trail step (Technical Approach #6) is an acceptance
   gate, not an afterthought — the reviewer will check it.

**Given the breadth (six findings, ~89-frame animation, ballistic debris physics),
this story may warrant splitting if RED reveals the surface is larger than 12
points can hold. TEA/Dev should flag early rather than smear one PR across all six.**

Handoff is clean. Han Solo — the RED phase is yours.

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity behaviour + numeric constants — pure TDD RED.

**Scope:** sw7-7 was NARROWED to R7a (X-002 + X-003, TIE explosion pieces) before
writing tests — see the split note under Acceptance Criteria and the major deviation.
Ground truth was verified against the in-repo ROM
`reference/atari-source/star-wars-1983/WSXPLD.MAC` (line numbers match the findings 1:1;
RADIX 16 via `.INCLUDE WSCOMN` confirmed — `#18`/`#10` are HEX 24/16).

**Test Files:**
- `tests/core/tie-piece-lifetimes.test.ts` — X-002 authentic per-piece lifetimes as
  frame-true constants (`0x18/TICK_HZ`, `0x10/TICK_HZ`), wings > globe by 24:16, with
  the flat-0.7 / decimal-radix / 60 Hz misreadings refuted in-test. (4 tests)
- `tests/shell/render.tie-explosion-fidelity.test.ts` — X-002 behavioural (wings
  outlive the globe; globe pops first; cue spans ~wing life) + X-003 (age-keyed ramp,
  ≥2 distinct hues, NEVER white). Fragments isolated by a `dyingTies:[]` self-baseline.
  (7 tests: 4 RED + 3 guards/sanity)
- `tests/audit/sw7-7-remediation.test.ts` — bookkeeping: X-002/X-003 `remediated_by
  "sw7-7"`; X-005/X-006/X-007/M-010 stay OUT (split to sw7-14/sw7-15). (6 tests: 2 RED + 4 guards)

**Tests Written:** 17 (10 failing RED, 7 intended guards/sanity) covering 2 ACs.
**Status:** RED — verified via testing-runner (RUN_ID sw7-7-tea-red): 10 failed /
1427 passed / 1437 total; the 10 failures are EXACTLY these three files, everything
else green (no develop-red, no collateral). Every failure fails for the intended
reason (undefined constants; 0 fragment segments past the globe life; `Set{'#30d158'}`
static; missing `remediated_by`).

### Rule Coverage

| Rule / property | Test(s) | Status |
|-----------------|---------|--------|
| RADIX-16 byte decode (`#18`=24, `#10`=16), not decimal | tie-piece-lifetimes: "neither lifetime is …a decimal-radix misread…" | failing |
| Frame-true timebase (`frames/TICK_HZ`, 20.508 Hz not 60 Hz) | tie-piece-lifetimes: wing/globe value + "…wrong 60 Hz timebase" | failing |
| Wings OUTLIVE globe (24:16) | tie-piece-lifetimes "…ratio 24:16"; render "at 0.9 s globe popped, wings fly" | failing |
| Old flat 0.7 s refuted | tie-piece-lifetimes "neither lifetime is the old flat 0.7 s…" | failing |
| Age-keyed colour ramp (not static) | render "…age-keyed…"; "…≥2 distinct fragment colours…" | failing |
| X-003 correction: TIE pieces NEVER white-flash | render "no TIE piece is EVER drawn white…" | guard (passes; bites on VJFLS) |
| Cue transient (no permanent cloud) | render "…cleared shortly after the wing life" | guard |
| ROM bookkeeping (remediated_by) | sw7-7-remediation X-002/X-003 | failing |
| Split scope not swept | sw7-7-remediation X-005/006/007/M-010 "stays OUT" | guard |
| Core/shell purity | X-002 constants live in core (state.ts); X-003 colour in shell (render.ts) — boundary respected; existing purity guards stay green | n/a (green) |

**Rules checked:** the applicable project rules here are core/shell purity (respected)
and the ROM-citation bookkeeping (covered above + existing citations suite). The
TypeScript lang-review checklist has no numeric/render-specific rule this change
triggers (no `as any` in production, no type-design/security/async surface).
**Self-check:** 0 vacuous tests. Each RED verified to fail for the correct reason; the
"never white" guard proven non-vacuous (it isolates and samples the fragment green
today, `sampled > 0`); the "age-keyed" ages were moved to 0.15/0.6 (both inside the
all-alive window) after the first draft passed for the WRONG reason (the 0.7 s cull
boundary emptied one set) — corrected and re-verified.

**Handoff:** To Yoda (Dev) for GREEN. Two coupled halves (core cull → wing life;
render globe-gate → globe life) + reanchor citations & mark remediated_by — see
Delivery Findings.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/state.ts` — replaced the flat eyeball tunable `TIE_DEATH_SECONDS = 0.7` with the
  two frame-true ROM constants `TIE_WING_LIFE_SECONDS = 0x18 / TICK_HZ` (24f ≈ 1.170 s) and
  `TIE_GLOBE_LIFE_SECONDS = 0x10 / TICK_HZ` (16f ≈ 0.780 s), each carrying its WSXPLD.MAC
  citation. `TIE_DEATH_SECONDS` now aliases the WING (longest) life, so the core cull in
  `sim.ts` keeps the entry for the full cue without `sim.ts` itself changing.
- `src/shell/render.ts` — per-piece gating (wings to wing life, globe to globe life, so the
  globe pops first) + `tiePieceGlow(timerFrames)`, an age-keyed ramp keyed to each piece's
  absolute remaining ROM timer over the `TVWCLE` `0x00..0x1F` domain. Never white.
- `docs/audit/findings/pair-explosions.json` — X-002 + X-003 marked `remediated_by: "sw7-7"`
  (quotes frozen as history); X-001 + X-004 re-pointed onto their new spellings and left OPEN
  (see deviation #2).
- `docs/audit/findings/pair-{hud,models,score-shields,surface,tie-ai,timing,trench}.json` —
  line-number reanchors only (verified: zero semantic change outside the two M-* line moves).

**Tests:** 1437/1437 passing (GREEN) — full suite, 120 files, RUN_ID `sw7-7-dev-green-final2`.
All 10 of TEA's RED tests now pass; the total matches TEA's 1437 baseline exactly, so no test
was lost, skipped, or renamed. `npm run build` (`tsc --noEmit && vite build`) exits 0 —
checked explicitly, since vitest strips types and would hide a type error.

**Verification beyond the suite:**
- Re-derived ground truth from the primary source (`~/Projects/star-wars-1983-source-text/`,
  NOT the non-existent path in the TEA Assessment — see Delivery Finding): `.RADIX 16`
  (WSCOMN.MAC:5) confirms `#18`/`#10` are hex 24/16; DOXPLD only ever DECs; VWTIN's
  `CMPB #1F / IFHI → VJFLS` is therefore unreachable for pieces born at 24/16. TEA's decode
  holds 1:1.
- Confirmed the piece→lifetime mapping against `models.ts`: FRAG_1/FRAG_2 are the wings, and
  FRAG_3 is `'TIE Fragment Cabin'` — the ROM's TP$TI3 centre globe (the `WING_FRAG_3` symbol
  is a misnomer, as X-001's own refutation records). So gating FRAG_3 at the globe life is
  the ROM's identity, not a guess.
- Numerically verified the ramp reproduces the ROM's shared-table structure: wing born
  `rgb(93,196,54)` vs globe born `rgb(62,157,36)` (different hues at equal wall-clock age),
  wing at timer 16 → the globe's birth colour, both cooling to `rgb(0,80,0)`, nothing ever
  near white.
- `reanchor-citations.mjs` reports **0 lost** (was 2); audit suite 34/34.

**Branch:** `feat/sw7-7-r7-explosions-finale` (pushed)

**Note for review:** `pair-models.json` shows 38 lines of `—`→`—` encoding churn from the
reanchor tool's reserialization. It is semantically null — proven by parse-and-compare
against HEAD (that file's only semantic deltas are the M-008/M-014 line moves; **M-010 is
untouched**, as `sw7-7-remediation.test.ts` requires). Logged as a Delivery Finding.

**Handoff:** To Obi-Wan Kenobi (Reviewer) for the review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (4 smells noted, all test-only) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 3 unique (36 rules, 53 instances) | confirmed 3 (all downgraded to LOW), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and assessed by me directly)
**Total findings:** 5 confirmed (1 Medium, 4 Low), 0 dismissed, 0 deferred

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (+ `javascript.md`, which it extends) and the star-wars/arcade CLAUDE.md hard boundary. Every construct the diff introduces, judged individually.

| Rule | Instances enumerated | Verdict |
|------|---------------------|---------|
| TS#1 Type-safety escapes | `as unknown as CanvasRenderingContext2D` (render.tie-explosion-fidelity.test.ts:89); `f!` ×4 (sw7-7-remediation.test.ts:38,44,52,59); production: **0** in state.ts + render.ts (grep-verified) | VIOLATION ×5 — all test-only, all pre-existing repo idiom. Downgraded to LOW, **not dismissed** (see [TYPE]/[RULE]) |
| TS#2 Generic/interface pitfalls | `Partial<GameState>` (test:120 — legitimate override-subset fixture); `ReturnType<typeof load>` (test:32) | Compliant — no `Record<string,any>`, no bare `object`, no `Function` |
| TS#3 Enum anti-patterns | 0 enums touched | N/A |
| TS#4 Null/undefined | `f!.remediated_by ?? undefined` (test:52,59) — `??` not `||`, correct | Compliant |
| TS#5 Module/declaration | render.ts:9-24 value vs `type` imports separated; relative imports omit `.js` — correct under `moduleResolution: bundler` (verified tsconfig) | Compliant |
| JS#4 Equality/coercion | `d.age <= TIE_WING_LIFE_SECONDS` (424), `<= TIE_GLOBE_LIFE_SECONDS` (431), clamp (83), `f.id === id` (32); no `==`/`!=` introduced | Compliant |
| JS#8 Test quality | `expect(f,msg).toBeTruthy()` ×4 as existence guards | Compliant (guards, not value-masking) |
| JS#11 / TS#23 Input validation | `JSON.parse(readFileSync(...))` typed by return annotation, no runtime schema (test:28-29) | VIOLATION ×1 — trusted repo-tracked fixture, test-only, pre-existing family idiom. Downgraded to LOW, **not dismissed** |
| **CLAUDE.md — core purity (THE hard rule)** | `state.ts:266,270,273` — new constants are pure `0xNN / TICK_HZ` arithmetic; imports are `@arcade/shared` + sibling core only (state.ts:12-16), **no shell import**; no `Date.now`/`Math.random`/`performance.now`/`rAF`/`document.`/`window.` | **Compliant** — verified against the live FORBIDDEN regex list in events.test.ts:289-295 |
| **CLAUDE.md — "window." comment-regex trap** | Every added comment line in state.ts + render.ts | **Compliant** — grep of all `^+` lines finds no `window` token at all |
| **CLAUDE.md — render is a pure fn of state** | `tiePieceGlow` (render.ts:82-88) — pure fn of one number, no closure/module mutable state, no wall-clock; `TVWCLE_DOMAIN` is an immutable const, not a frame counter; all inputs (`d.age`, `d.pos`) are sim-stamped (`sim.ts:308 age: d.age + dt`) | **Compliant** — this is exactly the sidecar's "animate off the sim stamp, never shell state or a wall-clock" rule, followed |
| **CLAUDE.md — shell does no game math** | render.ts:418-437 derives only draw/no-draw, spread distance, colour from an existing state field | Compliant — no scoring/collision/mutation |
| CLAUDE.md — no engine/backend added | `git diff --stat`: no package.json change | Compliant |
| Repo idiom — frame-true ROM constants | `TIE_WING_LIFE_SECONDS = 0x18 / TICK_HZ`, `TIE_GLOBE_LIFE_SECONDS = 0x10 / TICK_HZ` | Compliant — matches `DARTH_GLOW_SECONDS = 0x1f / TICK_HZ` (state.ts:246), `ENEMY_SHOT_TTL = 64 / TICK_HZ` (:240) |

### Devil's Advocate

*Arguing this code is broken.*

**"The rgb() strings are a format regression."** Every other glow in this file is a hex literal (`#30d158`), and the canvas stub in the tests only records whatever string it is handed — it never validates it. If anything downstream parsed the colour (sliced a hex, appended an alpha nibble for depth-fade), `rgb(93, 196, 54)` would break and every test would still pass. I chased this: `drawWireframe` (wireframe.ts:85) hands `color` straight into `withGlow({stroke: color})`, and the shared `withGlow` assigns `ctx.strokeStyle = style.stroke` and `shadowColor = style.color ?? style.stroke` with no parsing whatsoever. The attack fails — but it was the right place to look, and a future depth-fade would resurrect it.

**"NaN poisons the ramp silently."** If `d.age` were ever NaN, `timerFrames` is NaN, `Math.min(1, Math.max(0, NaN))` is NaN, and the template literal yields `"rgb(NaN, NaN, NaN)"` — which Canvas 2D **silently ignores**, leaving the *previous* strokeStyle in force. Fragments would render in whatever colour the last object used, with no error. That is a genuine silent-failure shape. It fails only because the gates `d.age <= TIE_WING_LIFE_SECONDS` / `<= TIE_GLOBE_LIFE_SECONDS` are false for NaN, so a NaN-aged piece is never drawn at all. The "redundant" wing gate is thus load-bearing after all — it is the NaN guard. Nobody wrote that down.

**"Overlapping glows blow out to white, violating X-003."** The whole finding is that TIE pieces must never be white. Three fragments plus a 10px shadowBlur, composited additively, would saturate toward white regardless of strokeStyle. Checked: the `globalCompositeOperation = 'lighter'` envelopes live at render.ts:971/1019/1141 — all in later HUD/effect functions, none wrapping the fragment loop at 418-437. Fragments draw under default `source-over`. The attack fails.

**"The ramp direction is guessed and could be inverted."** TVWCLE's hues are undecoded; if the table were brightest at index 0, the pieces would brighten as they die and the port would be backwards. The reading holds because `VJFLS` ("REALLY FLASH", the brightest state) is selected when timer > `0x1F` — i.e. brightness tracks HIGH timer — so a table that dimmed toward high indices would be discontinuous with the branch above it. Coherent, and the AC explicitly leaves hues unpinned.

**What a confused future maintainer does:** reads `tiePieceGlow(wf)`-shaped code elsewhere, "simplifies" the argument back to a fraction, and silently destroys the story's entire reason for existing — with a green suite. **This one lands.** See [TEST].

## Reviewer Assessment

**Verdict:** APPROVED

Five observations below; the code is correct and unusually well-grounded in primary source. No Critical/High. The one Medium is a *test-coverage* gap, not a defect — the shipped behaviour is right; nothing stops a future story from silently un-righting it.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[TEST]` | The shared-ramp fidelity property — the story's whole purpose — is pinned by **no test**. Proven by mutation: reverting to the rejected age-fraction keying leaves **45/45 green**. X-003 is now `remediated_by`, so the citation gate has permanently stopped watching that line; the suite is the only guard left, and it does not guard this. sw7-14 will edit this exact function. | `tests/shell/render.tie-explosion-fidelity.test.ts` | Non-blocking. Pin: wing-at-age-0 ≠ globe-at-age-0, and wing at timer 16 == globe at birth. Routed to sw7-14/TEA as a Delivery Finding. |
| [LOW] `[RULE]` `[TYPE]` | `as unknown as CanvasRenderingContext2D` — literal TS#1 double-cast match | `render.tie-explosion-fidelity.test.ts:89` | None. Downgraded (not dismissed): test-only partial canvas mock, identical idiom in ~10 sibling suites, no typed alternative. |
| [LOW] `[RULE]` `[TYPE]` | `f!` non-null assertion ×4 — literal TS#1 match | `sw7-7-remediation.test.ts:38,44,52,59` | None. Downgraded: each preceded by `expect(f).toBeTruthy()` which throws first, so null is unreachable at the dereference; established in r8-/sw7-13-remediation. |
| [LOW] `[RULE]` `[SEC]` | `JSON.parse` typed by return annotation, no runtime schema | `sw7-7-remediation.test.ts:28-29` | None. Downgraded: repo-tracked trusted fixture, not attacker input, test-only. |
| [LOW] `[SIMPLE]` `[SILENT]` | The old `TIE_DEATH_SECONDS > 0 ? … : 1` zero-guard was dropped with no replacement or comment | `render.ts:425,432` | None. Cannot materialise: both divisors are non-zero compile-time literals (`0x18/TICK_HZ`, `0x10/TICK_HZ`; `TICK_HZ = 246.094/12`). Note only. |

**Verified good (evidence required):**
- `[VERIFIED]` `[SILENT]` **No silent colour failure.** `rgb()` strings survive the glow path unparsed — `wireframe.ts:85` passes `color` into `withGlow({stroke: color, width: 1.5, blur: 10})`; shared `glow.js` `withGlow` assigns `ctx.strokeStyle = style.stroke` / `shadowColor = style.color ?? style.stroke` with zero string manipulation. Complies with the render-purity rule.
- `[VERIFIED]` `[EDGE]` **NaN/negative-age boundaries are safe.** A NaN `d.age` would yield `"rgb(NaN,NaN,NaN)"`, which Canvas silently ignores (retaining the prior strokeStyle) — but `render.ts:424`/`:431` gate on `d.age <= LIFE`, which is **false** for NaN, so the piece is never drawn. Negative age clamps via `Math.max(0, …)` at `render.ts:83`. Channels are provably in-gamut: r∈[0,120], g∈[80,230], b∈[0,70].
- `[VERIFIED]` `[TYPE]` **Production code carries zero type escapes** — grep of `state.ts` + `render.ts` for `as any` / `as unknown as` / `@ts-ignore` / non-null assertion returns nothing. All 5 TS#1 matches are test-only.
- `[VERIFIED]` `[DOC]` **Comments are accurate and the purity-prose trap is avoided.** No added line in either file contains the token `window` (the guard's `/\bwindow\s*\./` at events.test.ts:295 matches English prose). `DyingTie`'s doc (state.ts:86-89) remains true — the shell still spreads by `age`, the sim still drops past `TIE_DEATH_SECONDS`. `render.ts:421-423` correctly records that `TIE_WING_FRAG_3` is a misnomer for the globe — corroborated by `models.ts:238 name: 'TIE Fragment Cabin'` and by X-001's own `refutation_corrections`.
- `[VERIFIED]` `[SEC]` **No security surface.** Client-only vector game, no backend/auth/tenancy/network/secrets. The only I/O is `readFileSync` of a repo-tracked audit fixture in a test, with a fixed call-site literal filename (no traversal vector).
- `[VERIFIED]` `[SIMPLE]` **No dead code.** `TIE_GLOW` still serves live TIEs (`render.ts:409`) and the GAME OVER banner (`:1050`); the `GLOW_FOR['TIE Fragment *']` entries are still consumed by `src/tools/contactSheet.ts:161,225,227`. The `TIE_DEATH_SECONDS` alias keeps `sim.ts:36,309` unchanged — deliberate, and its semantics (cue lifetime = longest piece) stay honest.
- `[VERIFIED]` **ROM ground truth re-derived from primary source, not taken on trust.** `.RADIX 16` at `WSCOMN.MAC:5` ⇒ `#18`/`#10` are hex 24/16; `LDA #18` at WSXPLD.MAC:165 and :196 (wings), `LDA #10` at :224 (globe) — line-for-line as cited. `DOXPLD` (:485-490) only ever `DEC`s. `VWTIN` (:761-770) takes `VJFLS` only when timer > `#1F`. And the decisive corroboration for the X-003 *correction*: ground/bunker pieces load `LDA #20` (= 32 > 31) at :330, :366, :401 — so the white branch really is theirs alone, and TIE pieces born at 24/16 can never reach it.
- `[VERIFIED]` **Audit ledger is honest.** Independently parsed: X-002/X-003 `remediated_by: sw7-7`; X-001 (`CONFIRMED` match) and X-004 (`STRUCTURAL`/accept) left OPEN with quotes re-pointed and matching source byte-for-byte (render.ts:428, :426); **M-010 `remediated_by` is `None`**. Reanchor: **121 correct / 0 lost**. `pair-models.json`'s 38-line churn confirmed semantically null by parse-and-compare vs HEAD (only M-008/M-014 line moves).
- `[VERIFIED]` **Tests/build re-run by me, not taken from the report:** full suite **1437/1437**, `tsc --noEmit` + `vite build` exit 0. Working tree clean after my mutation check was reverted. Branch 2 commits ahead / **0 behind** `develop` — no masked integration conflict. No open PRs (merge gate clear).

**Data flow traced:** player fire → `stepGame` collision kills the TIE → sim pushes `{pos, age:0}` onto `dyingTies` (`sim.ts:306-311`) → each frame `age += dt`, culled past `TIE_DEATH_SECONDS` (= wing life) → `render.ts:418` reads the entry → per-piece gate → `tiePieceGlow((LIFE − age) × TICK_HZ)` → `drawWireframe` → `withGlow` → `ctx.strokeStyle`. Safe because every value is sim-stamped and the shell adds no state; time enters only as `dt`.

**Pattern observed:** the sidecar's "animate a shell effect off the sim stamp, never shell effect-state or a wall-clock" rule, followed exactly — `render.ts:427,434` derive the frame from `d.age`, which `sim.ts:308` stamps. Same shape as the existing muzzle-flash/laser-flash idiom.

**Error handling:** no error paths introduced in production; the boundary cases (NaN/negative/over-age) are handled by the draw gates rather than by exceptions, which is correct for a per-frame render.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story.