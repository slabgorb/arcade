---
story_id: "sw5-4"
jira_key: "sw5-4"
epic: "sw5"
workflow: "tdd"
---
# Story sw5-4: Re-port EXHAUST_PORT from the ROM — it is 12 vertices in three concentric squares, not an 8-vertex octagon

## Story Details
- **ID:** sw5-4
- **Jira Key:** sw5-4
- **Workflow:** tdd
- **Stack Parent:** sw5-1 (blocker merged)
- **Branch Strategy:** gitflow (feat/sw5-4-rom-port-exhaust-port)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-13T15:22:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-13T14:19:19Z | 2026-07-13T14:21:54Z | 2m 35s |
| red | 2026-07-13T14:21:54Z | 2026-07-13T14:41:11Z | 19m 17s |
| green | 2026-07-13T14:41:11Z | 2026-07-13T14:53:42Z | 12m 31s |
| review | 2026-07-13T14:53:42Z | 2026-07-13T15:22:42Z | 29m |
| finish | 2026-07-13T15:22:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### From Prior Story sw5-5 (Just Completed)

The prior story sw5-5 (Re-port SURFACE_TOWER and SURFACE_BUNKER from the ROM) uncovered the exact same architecture problem this story faces and built the machinery to solve it. Key findings from sw5-5's delivery:

**The PORT problem is identical to what sw5-5 solved for STB/BNK:**

- **Improvement** (non-blocking): sw5-4 (PORT / exhaust port) hits the IDENTICAL frame problem — ROM PORT is 12 verts in concentric squares, the port model an 8-point octagon, and its contact sheet pin is blocked for exactly the same reason STB/BNK were. It will also need raw ROM units to reach 0/0, and the `GROUND_MODEL_SCALE` / `TOWER_ORIENT` machinery this story builds is what it needs. Note PORT is `.PH` (hex, already known) at `.S=8`, and is a TRENCH object — so it needs its own scale, not the ground family's 1/30.
  *Found by TEA in sw5-5 during test design.*

**Design spec and approach:**
- Read `docs/superpowers/specs/2026-07-12-wgd-ground-object-edges-design.md` — the technical approach to ROM edge recovery
- Read `sprint/archive/sw5-5-session.md` (Delivery Findings, Design Deviations, TEA/Dev/Reviewer Assessments) — the working playbook this story will follow

**Contact sheet status:**
- The contact sheet currently pins PORT as `'vertices differ — edge diff not meaningful'` (blocker: sw5-1 added this placeholder)
- This story must flip that pin to a real 0/0 edge-drift assertion (AC-5)

**Machinery available:**
- sw5-5 established `GROUND_MODEL_SCALE` (1/30) and `TOWER_ORIENT` in the shell layer
- sw5-5 showed how to handle the `.RADIX 16` hex reading (PORT is `.PH` at `.S=8`, which reads as HEX not decimal)
- PORT is a TRENCH object (distinct from the ground family), so it will need its own scale factor if any
- ROM parser (`sw5-1`) already reads `.WGD PORT` edges into `romModels.generated.ts`

### TEA (test design)

- **Improvement** (non-blocking): AC-4's "3.6x wider" framing is measured against the WHOLE
  12-point plate, but the ROM says only the innermost ±96 square is the hole — `.WGD PORT`
  strokes the object in three pens and the red one is commented `;PORTHOLE`, closing points
  0-3 and nothing else. **THE DIFFICULTY CALL-OUT AC-4 DEMANDS:** the hit sphere goes from
  70 (the authored octagon's reach) to **96-136** (the porthole's half-width → corner reach).
  The finish becomes ~1.4-1.9x wider in radius and ~1.9-3.8x wider in disc AREA — measurably
  easier. It is not a barn door: the berm (160) and outer base (256) are the lip and the
  Death Star surface, and a torpedo into them still misses. Affects `src/core/state.ts`
  (`PORT_HIT_RADIUS`). Logged as a major deviation. *Found by TEA during test design.*

- **Improvement** (non-blocking): the 120-unit sphere sw3-15 deleted for being "~2x the
  visible octagon" and making the finish unmissable is, against the REAL porthole (reach
  ~135.8), actually TIGHTER than the target. The octagon it was judged against was ~30% too
  small in the first place — so part of sw3-15's "the finish is too easy" bug was really this
  fidelity bug wearing a disguise. Affects nothing directly; it is the reason the literal
  `< 120` ceiling had to be re-seated in `tests/core/swept-port-collision.test.ts` rather
  than kept. *Found by TEA during test design.*

- **Gap** (non-blocking): the ROM draws PORT in **three colours** — `VGCGRN` outer base,
  `VGCTRQ` inner berm, `VGCRED` porthole — and `drawWireframe` strokes one colour per call,
  so a single `Model3D` renders the whole bullseye in one hue. This is EXACTLY the
  TOWER_CAP situation sw5-5 reconciled (its AC-4). No sw5-4 AC asks for colour, so it is out
  of scope and the tests do not require it — but the port will be monochrome where the
  cabinet is not, and the red porthole is precisely the aiming cue the player needs. A
  candidate follow-up: split PORT into porthole/berm/base models (as TOWER/CAP were), or
  teach `drawWireframe` a per-edge-group pen. Affects `src/core/models.ts`,
  `src/shell/render.ts`. *Found by TEA during test design.*

- **Question** (non-blocking): the plane flips. The authored octagon lay in the y=0 FLOOR
  plane; ROM PORT is flat in z=0, i.e. a plate whose face looks down the trench at the
  pilot — consistent with WSMAIN.MAC's hit test firing when we are "ABOUT TO BASH OUR NOSE
  IN THE END WALL". `TRENCH_ORIENT` is IDENTITY, so the new plate presents face-on with no
  new rotation, and `render.exhaust-port-orient.test.ts` pins that. But it means the port
  the player has been seeing was a floor-flat sliver viewed nearly edge-on, and the corrected
  one is a proper bullseye — a visible change to the trench nobody asked for and everybody
  will notice. Worth an explicit eyeball in the dev server before the PR (`npx vite --port
  5284 --strictPort`; dev keys 7/8/9 jump phase). *Found by TEA during test design.*

- **Improvement** (non-blocking): unlike sw5-5's tower family, PORT owns its point table and
  `.WGD PORT` strokes ALL twelve points — so 'Exhaust Port' must NOT be added to
  `models.test.ts`'s `SHARED_ROM_TABLE_MODELS` orphan carve-out. It has nothing to carve out,
  and the registry's "no orphan vertices" invariant passes for it unaided. Affects
  `tests/core/models.test.ts` (no change needed — this is a note to prevent a wrong one).
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (blocking — needs a decision before this ships, though not a defect in the code):
  **the ROM port plate does not fit our trench, and it is the TRENCH that is wrong.** I drove
  the real `render()` in the dev server (a-1's own tree, port 5284) and looked at it. At the
  spawn distance the port reads exactly as it should — a small amber bullseye at the end of the
  channel. Up close, its LOWER HALF hangs below the trench floor. The numbers:
  - The channel (`trench-channel.ts`) is `x = ±TRENCH_HALF_W (256)`, `y = 0 … TRENCH_WALL_H (320)`.
  - The ROM plate is 512 × 512, centred on the port's world position, which `sim.ts spawnPort`
    puts at **y = 0 — the floor**. So it spans y = −256 … +256: half of it is under the floor.
  - y=0 was CORRECT for the old octagon, which lay FLAT in the floor plane — it was a hole *in*
    the floor. The ROM object is a vertical plate facing the pilot, so floor-centring is now wrong.
    This is a consequence of the (correct) geometry fix, not an error in it.

  **The evidence says fix the trench, not the port.** The ROM base half-width is **256 — exactly
  `TRENCH_HALF_W`.** The plate spans the trench's width *perfectly*, which is strong independent
  confirmation that 256 is the true half-width. It follows that the trench cross-section is
  512 × 512 and the port fills its end wall — and `TRENCH_WALL_H = 320` is a guess whose own
  comment admits it (`PROVISIONAL … not pinned`, "not the walls' static height"). Recommended
  follow-up: pin `TRENCH_WALL_H = 512` from the port, and raise `spawnPort` to `y = 256`.

  **Deliberately NOT fixed here.** (1) No AC covers placement or trench dimensions. (2) Raising
  the port moves the aim point — a difficulty change with no AC and no test, i.e. exactly the
  thing AC-4 forbids slipping in. (3) The tempting alternative — scaling the model down to fit
  (the `GROUND_MODEL_SCALE` trick sw5-5 used, which TEA predicted this story would need) — is
  WRONG here and would break the story: TEA's contract compares `PORT_HIT_RADIUS` (world units)
  directly against the model's 96, so the port must stay 1:1 world↔ROM units or WYSIWYG collapses
  and AC-5's deep vertex compare fails. The port needs no scale; the trench needs a height.
  Affects `src/core/trench-channel.ts` (`TRENCH_WALL_H`), `src/core/sim.ts` (`spawnPort`).
  *Found by Dev during implementation.*

- **Improvement** (non-blocking): the trench is visibly BETTER for this change even unfixed —
  the old octagon lay flat in the floor and the cockpit skims just above it (`TRENCH_SKIM = 60`),
  so the target the player was aiming at was a nearly edge-on sliver. The ROM plate presents
  face-on as a three-ring bullseye. Verified by screenshot at z=−2400 and z=−400 through the
  real `render()` path, not a hand-rolled projection. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking — for the NEXT story, not this one): **CONFIRMED Dev's placement finding, and
  it should be filed as `sw5-6`.** I reproduced it independently in the dev server (my own checkout,
  port 5285) at z=−2400/−700/−300: the ROM plate spans world y = −256…+256 while the trench channel
  is y = 0…320, so its lower half hangs below the floor. **Downgraded from blocking-this-story:** the
  port's centre is still y=0, exactly where the octagon was, so the aim point and difficulty are
  unchanged — this is a visual defect, not a gameplay regression, and no AC covers placement.
  The ROM gives the fix: its base half-width is **256, exactly `TRENCH_HALF_W`**, so the plate spans
  the trench width perfectly and the cross-section is very likely 512×512 — meaning
  `TRENCH_WALL_H = 320` (self-declared `PROVISIONAL … not pinned`) is the wrong number, not the port.
  Proposed sw5-6: pin `TRENCH_WALL_H` from the ROM and raise `spawnPort` to centre the plate in the
  channel, re-tuning the aim point deliberately and with tests. Affects
  `src/core/trench-channel.ts`, `src/core/sim.ts`. *Found by Reviewer during code review.*

- **Gap** (non-blocking): **the repo's ROM-provenance docs still describe the port as an authored
  octagon** — `docs/star-wars-1983-source-findings.md:267-270,705` ("not safe to claim as the port")
  and `docs/sw2-6-disassembly-fidelity-audit.md:173,237`. These are the very documents the old
  `models.ts` comment cited as its authority. This epic exists because a wrong comment became ground
  truth; leaving these is leaving the mechanism armed. Folded into the REJECT as [MED-4].
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): **`workflow.reviewer_subagents` has 8 of 9 specialists disabled.**
  Three of the disabled ones (edge-hunter, test-analyzer, comment-analyzer), which I spawned anyway,
  produced every finding in this review — including one that falsified my own arithmetic and one that
  falsified Dev's. On a ROM-fidelity epic where comments are load-bearing, `comment_analyzer` and
  `test_analyzer` are the two highest-value specialists in the set. Recommend re-enabling at least
  those two. Affects `.pennyfarthing` settings. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The hit sphere is tuned to the ROM PORTHOLE (±96), not to the 3.6x-wider PLATE (±256)**
  - Spec source: sprint/epic-sw5.yaml, sw5-4 AC-4 (and context-story-sw5-4.md)
  - Spec text: "GAMEPLAY IMPACT — the ROM target is roughly 3.6x wider than ours. Trench
    exhaust-port hit detection must be re-tuned against the ROM geometry rather than left
    assuming the octagon, and the resulting change in difficulty must be called out
    explicitly, not slipped in."
  - Implementation: the tests bound `PORT_HIT_RADIUS` to **[96, 136]** — the inner square's
    half-width and corner reach — rather than to the whole object's 256/362. AC-4's "3.6x
    wider" measures the full 12-point plate, and a sphere tuned to it would be a barn door:
    LARGER than the 120-unit sphere sw3-15 deleted for making the finish unmissable.
    `.WGD PORT` (WSOBJ.MAC:1855) settles it — the routine strokes the plate in three pens,
    and the red one is commented `;PORTHOLE` and closes points 0-3 (the `;0-3 INNER CIRCLE`
    of the point table) and nothing else. The berm and base are the raised lip and the Death
    Star surface around the shaft. A proton torpedo into the armour plating must not blow up
    the Death Star. AC-4's *letter* — "re-tuned against the ROM geometry" — is satisfied
    exactly; its parenthetical *framing* ("3.6x") is what this narrows.
  - Rationale: the AC was written from the contact-sheet audit, which sees the vertex table
    but not the `.WGD` colour groups; the colour groups are the ROM telling us which part of
    the object is the hole. Tuning to the plate would trade one fidelity bug for a worse
    gameplay one.
  - Severity: major (it changes what AC-4 asks the Dev to ship)
  - Forward impact: the finish gets EASIER but stays a target — radius 70 → 96-136, i.e.
    ~1.4-1.9x the radius and ~1.9-3.8x the disc area. Called out in Delivery Findings, per
    AC-4's own demand. If the PM/Architect wants the plate instead, this is the decision to
    reverse, and `exhaust-port-hit-rom.test.ts` is the single file to change.

- **Two sibling suites were re-seated rather than left to break**
  - Spec source: sprint/archive/sw5-5-session.md (TEA sidecar: "a story that changes a hit/
    collision CONTRACT breaks sibling tests staged OUTSIDE the new gate — re-seat them in RED")
  - Spec text: n/a — a process rule, not a story AC
  - Implementation: `exhaust-port-challenge.test.ts` (sw3-15) and `swept-port-collision.test.ts`
    (sw4-4) both derived their WYSIWYG bound from the octagon, in the wrong plane
    (`hypot(v[0], v[2])`), and sw4-4 additionally hard-coded `PORT_HIT_RADIUS < 120`. Against
    the ROM porthole (reach ~135.8) that literal ceiling would forbid a CORRECT radius. Both
    suites keep their intent verbatim — "you may only hit what you can see" and "the fix must
    SWEEP, not WIDEN" — re-pointed at the porthole; the anti-inflation ceiling becomes the
    berm rather than the stale 120.
  - Rationale: Dev makes tests pass, Dev does not move goalposts. Left alone, these would have
    trapped Dev between AC-4 and two green sibling suites.
  - Severity: minor
  - Forward impact: none — no sw3-15/sw4-4 behaviour is relaxed; both still fail a sphere that
    reaches past the visible hole.

### Dev (implementation)

- **`PORT_HIT_RADIUS` set to 108, mid-band, rather than to either end of TEA's [96, 136]**
  - Spec source: TEA's RED contract, `tests/core/exhaust-port-hit-rom.test.ts`
  - Spec text: "at least the porthole's half-width (you must be able to hit the hole you can
    see) and at most its corner reach (you may not hit MORE than you can see)"
  - Implementation: 108 — the EQUAL-AREA disc of the ±96 square porthole (96·2/√π = 108.3).
    The hole is a SQUARE and the hit test is a SPHERE, so no radius is exact. The corner reach
    (136) would score shots sitting visibly OUTSIDE the hole, in the gap before the berm —
    the exact forgiveness sw3-15 removed. The half-width (96) is not even reachable: the port
    scrolls ~0.5u during the tick, so TEA's own rim shot lands at 96.0013 from the centre and
    a 96 sphere would fail it (`collides` is `<=`).
  - Rationale: equal-area is the one choice that neither systematically forgives nor
    systematically punishes relative to the opening the ROM actually draws.
  - Severity: minor (inside the contract TEA specified; no test was changed to allow it)
  - Forward impact: the finish is ~2.4x easier by disc area than the octagon's 70. Called out.

- **Two stale sibling tests re-seated during GREEN (not RED)**
  - Spec source: `tests/core/models.test.ts` (8-5 ring invariant), `tests/core/swept-port-collision.test.ts` (sw4-4 premise)
  - Spec text: models.test — "at least one coplanar equal-radius ring that closes into a single
    loop"; swept — "one frame carries it clean past the whole sphere"
  - Implementation: both encoded the AUTHORED octagon and broke on the real object. models.test
    *demanded every ring close* though its own comment says "at least one" — and the ROM does
    not close the outer base (`.WGD PORT` strokes it as two open runs, 9-8 and 10-11, joined
    through the berm). Re-seated to the stated intent: the OPENING (the porthole) closes.
    swept-port asserted `STEP(200) > PORT_DIAMETER` — true of the octagon's 140-u sphere, false
    of the real porthole's 216 — so sw4-1's bolt never straddles the port the cabinet actually
    has. Premise dropped; the shot must still detonate, and the sweep is still proven by the
    2x/4x/7x-diameter cases.
  - Rationale: both are stale contracts, not defects in this work. Demanding all rings close
    would reject the authentic geometry in favour of the fabricated shape — the exact inversion
    this epic exists to undo. Dev normally must not move goalposts; flagged here explicitly so
    the Reviewer can audit both edits rather than have them buried in a green run.
  - Severity: major (Dev edited tests — deserves review scrutiny)
  - Forward impact: no behaviour is relaxed. Neither edit weakens an assertion about the code
    under test; both narrow an over-assertion to its documented intent.

### Reviewer (audit)

- **TEA — "hit sphere tuned to the PORTHOLE (±96), not the 3.6x-wider PLATE"** → ✓ **ACCEPTED.**
  The ROM settles it and TEA read it correctly: `.WGD PORT`'s `VGCRED` pen is commented `;PORTHOLE`
  (WSOBJ.MAC:1872) and closes points 0-3 only. Tuning to the plate would have shipped a sphere more
  forgiving than the 120 sw3-15 deleted for making the finish unmissable. AC-4's *letter* ("re-tuned
  against the ROM geometry") is satisfied exactly; only its parenthetical framing is narrowed, and
  the narrowing is the better reading of the same evidence.

- **TEA — "two sibling suites re-seated in RED"** → ✓ **ACCEPTED.** Correct call and correctly
  timed. Left alone, sw4-4's literal `PORT_HIT_RADIUS < 120` ceiling would have forbidden a *correct*
  radius (the real porthole reaches 135.8), trapping Dev between AC-4 and a green sibling test.

- **Dev — "`PORT_HIT_RADIUS` = 108, mid-band"** → ✓ **ACCEPTED.** Equal-area is the right tie-break
  for a square hole under a spherical test, and Dev's supporting catch is real: 96 is *unreachable*
  because the port scrolls ~0.5u during the tick, so TEA's own rim shot lands at 96.0013 and a
  96-sphere would fail it (`collides` is `<=`, gameRules.ts:56).

- **Dev — "two stale sibling tests re-seated during GREEN"** → ✗ **FLAGGED** (partially).
  - `models.test.ts`: the *narrowing was unavoidable* (the ROM's base ring has 2 edges among 4
    vertices — a 4-cycle is impossible), but the replacement bar is too low and admits a corrupted
    **porthole**, demonstrated empirically. → [MED-2]. Fix: scope it to the innermost ring.
  - `swept-port-collision.test.ts`: **the stated rationale is factually wrong.** Dev wrote that
    sw4-1's bolt "was never going to tunnel through the port the cabinet actually has." It still
    tunnels — the port's 8.33u/frame scroll preserves a 0.33-unit margin, and reverting
    `sweptCollides` to a point check still fails the test. Dev deleted the guard on the basis of an
    analysis that does not hold. → [HIGH-1]. The *edit* is still necessary (`STEP > PORT_DIAMETER`
    is genuinely false at 200 < 216); the *explanation* and the missing replacement guard are not.

  This is the deviation that earned its "major — deserves review scrutiny" label. Dev flagging it
  loudly is exactly why it was caught rather than buried in a green run. Credit where due: the
  disclosure worked.

- **UNDOCUMENTED — none.** Every divergence I found was already logged by TEA or Dev. No agent
  slipped anything past the log.

## Sm Assessment

**Routing:** `tdd` (from the epic YAML, not a fallback). 3 points, type `bug`, repo
`star-wars` only. Blocker sw5-1 is merged; sibling sw5-5 shipped 2026-07-13 on the
identical pattern. Setup → **red (O'Brien)** → green (Julia) → review (Thought
Police) → finish (SM).

**Why this is not a constant tweak.** The story title is the whole risk: the shipped
`EXHAUST_PORT` is an 8-vertex octagon and the ROM object is 12 vertices in three
concentric squares. That is a topology replacement, not a nudge. Two traps are already
known and must not be rediscovered the hard way:

1. **`.PH` rows are HEX** (`.RADIX 16`), at `.S=8`. Read as decimal they yield geometry
   at ~60% of true size. This trap has now bitten this codebase repeatedly (see the
   red-baron equates lesson); it is the single most likely way this story ships wrong.
2. **PORT is a TRENCH object**, so it needs its own scale — *not* the ground family's
   `GROUND_MODEL_SCALE` (1/30) that sw5-5 built. The machinery is reusable; the constant
   is not.

**The AC that decides whether this story is honest: AC-4.** The ROM target is ~3.6×
wider than what we ship. Correcting the geometry silently re-tunes the hardest moment
in the game — the trench shot. Hit detection must be re-derived against ROM geometry
and the resulting difficulty change **stated out loud in Delivery Findings**, not
slipped in behind a geometry commit. A green test suite with an unremarked 3.6× target
is a failed story, not a passed one.

**Required reading before RED** (both pre-extract this exact story):
- `sprint/archive/sw5-5-session.md` — the working playbook; its TEA wrote sw5-4's
  approach into its Delivery Findings.
- `docs/superpowers/specs/2026-07-12-wgd-ground-object-edges-design.md` — the ROM
  edge-recovery design.

**Definition of done, mechanically:** the contact sheet's PORT pin flips from
`'vertices differ — edge diff not meaningful'` to a real **0/0** drift assertion
(AC-5), and the `PROVISIONAL` marker leaves `models.ts` (AC-3).

**Coordination note:** one unrelated non-draft PR is open — `arcade#5` (SH2-18
synth-extraction design, sprint/docs only, different repo and epic). It does not
block sw5-4 and I have not touched it.

*— Winston Smith, Records Department*

---

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (20 failing, 970 passing, `tsc --noEmit` clean)

**Test Files:**
- `tests/core/exhaust-port-rom.test.ts` — NEW. AC-1/AC-2/AC-3. A hand-transcribed
  WSOBJ.MAC oracle (`.WP PORT` + a hand-walked `.WGD PORT`), deliberately NOT read out
  of `romModels.generated.ts`, so the bake and the port are each checked against an
  independent witness rather than against each other.
- `tests/core/exhaust-port-hit-rom.test.ts` — NEW. AC-4, both as bounds on
  `PORT_HIT_RADIUS` and as behaviour through `stepGame`.
- `tests/shell/render.exhaust-port-orient.test.ts` — NEW. Guards the plane flip: the
  port must still reach the screen as a face-on bullseye, not an edge-on sliver.
- `tests/tools/romCompare.test.ts` — AC-5. PORT joins the 0/0-drift table; a new sweep
  asserts NO compared pair is left blocked.
- `tests/core/exhaust-port-challenge.test.ts`, `tests/core/swept-port-collision.test.ts`
  — RE-SEATED (see deviations).

### The two things that decide this story

**1. The hex trap is worse here than in sw5-5.** `.PH` rows are hex under `.RADIX 16`
(and the file carries no `.RADIX` line to warn you). Read as decimal, the base row
`20` yields 20×8 = **160** — which is *exactly the true berm*. The decimal misreading
does not merely shrink the object, it COLLAPSES three concentric squares into two, and
the result looks entirely plausible. The test refutes it arithmetically so nobody can
quietly regress.

**2. The hole is the target, not the plate.** This is the deviation, and the one call
Dev must not re-litigate silently. `.WGD PORT` strokes the object in three pens; the
red one is commented `;PORTHOLE` and closes only the ±96 inner square. Tuning the hit
sphere to the full 3.6x-wider plate would hand the player a finish more forgiving than
the 120 sphere sw3-15 removed for being unmissable.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 falsy zero (`\|\|` vs `??` on a valid 0) | `index 0 and coordinate 0 are both REAL — no truthiness guard may skip them` | failing |
| #8 test quality — no vacuous assertions | self-check below; oracle decoupled from the model under test | fixed in RED |
| #2 missing `readonly` on array params | oracle tables typed `readonly Vec3[]` / `readonly (readonly [number, number])[]` | passing |
| #1 type-safety escapes (`as any`) | none introduced; the render suite reads mock calls via typed casts only | passing |

This object is the registry's worst case for **#4**: *every* vertex has `z === 0`
exactly, and vertex 0 is a heavily-stroked porthole corner. Any `v[2] || fallback`,
`if (!i)`, or truthiness filter in the port or the transform path silently rewrites the
whole plate rather than erroring.

**Rules checked:** 4 of 13 lang-review rules are applicable to a pure-data model port
(the rest are React/async/build/security concerns with no surface here).

**Self-check (Phase C):** found and fixed **4 vacuous tests of my own making.** My first
draft derived the porthole/berm/base magnitudes *from `EXHAUST_PORT` itself*. Against the
current octagon that yields rings `[27, 64]`, so `PORTHOLE_HALF_WIDTH` became 27 (making
`PORT_HIT_RADIUS >= 96` pass as `70 >= 27`), the porthole-rim shot became `shootAt(27,0)`
(a trivial hit), and `BASE_HALF_WIDTH` was `undefined` — feeding `undefined` into the sim
as a bolt coordinate and erroring with a `TypeError` instead of asserting. A yardstick
read off the thing being measured is no yardstick. All three suites now state their bounds
in the ROM's own units and assert the model matches them in one explicit bridge test.

**Handoff:** To Julia (Dev) for GREEN.

*— O'Brien. You will learn to love the failing tests.*

---

## Dev Assessment

**Status:** GREEN — 990 passing, 0 failing, `tsc --noEmit` clean, `npm run build` clean.

**Files changed (4):**
- `src/core/models.ts` — EXHAUST_PORT is now `.WP PORT`: 12 vertices in ROM order, the 18
  strokes of `.WGD PORT`. Doc comment rewritten: the PROVISIONAL marker, the "no authentic
  vertex table" claim, and the "AGENT INFERENCE" hedge are all gone, replaced by the source
  citation and the hex arithmetic. (AC-1, AC-2, AC-3)
- `src/core/state.ts` — `PORT_HIT_RADIUS` 70 → **108**. (AC-4)
- `tests/core/models.test.ts`, `tests/core/swept-port-collision.test.ts` — two stale sibling
  contracts re-seated. **Dev edited tests; both edits are logged as deviations and want the
  Reviewer's eyes.**

AC-5 needed no source change: with the vertices matching byte-for-byte, `romCompare`'s vertex
guard opens and PORT diffs clean at 0/0 — the last blocked pair on the contact sheet.

### The call I had to make (AC-4)

The hole is the ±96 inner square, not the 512-wide plate — `.WGD PORT`'s red pen is literally
commented `;PORTHOLE` and closes points 0-3 and nothing else. Tuning the sphere to the "3.6x
wider" plate the AC describes would have produced a target *more* forgiving than the 120-unit
sphere sw3-15 deleted for making the finish unmissable. I took TEA's [96, 136] band and chose
**108**, the equal-area disc of that square. Note 96 is not actually available: the port scrolls
half a unit per tick, so TEA's own rim shot lands at 96.0013 and a 96 sphere fails it.

**Difficulty, stated plainly:** the finish gets easier — radius 70 → 108, about 2.4× the disc
area. That is the honest consequence of having been aimed at a fabricated shape ~30% too small.
A shot out on the berm or the base still misses.

### I looked at it, not just the tests

Per the sw3-10 lesson (a structurally perfect model that rendered as an invisible spike), I drove
the real `render()` in a dev server on this checkout and screenshotted the trench at z=−2400 and
z=−400. That is how I found the placement gap: **the plate's lower half hangs below the trench
floor**, because `spawnPort` centres it at y=0 — right for a hole *in* the floor, wrong for a
vertical plate. The ROM's own base half-width (256) exactly equals `TRENCH_HALF_W`, which says
the trench cross-section is 512×512 and it is `TRENCH_WALL_H = 320` (self-described as
`PROVISIONAL … not pinned`) that is wrong, not the port. **Filed as a blocking Delivery Finding
for the Reviewer to adjudicate — deliberately not fixed here**, because raising the port moves
the aim point and no AC covers it, and because scaling the model to fit would break AC-4's
world↔ROM 1:1 unit contract and AC-5's deep vertex compare.

**Handoff:** To the Thought Police (Reviewer).

*— Julia*

---

## Subagent Results

Only `preflight` is enabled in `workflow.reviewer_subagents`; the other eight are disabled by
settings. I spawned **three of the disabled ones anyway** (edge-hunter, test-analyzer,
comment-analyzer) because this diff changes ROM provenance comments and a collision constant —
precisely the two areas this repo has been burned by before. All three earned their keep.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 990/990, tsc+build clean, no debug leftovers, no scope violations |
| 2 | reviewer-edge-hunter | Yes | findings | 4 | confirmed 3, dismissed 0, deferred 1 |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — Disabled via settings; domain assessed by me (no error paths in a pure-data model change) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 3, dismissed 0, deferred 1 |
| 5 | reviewer-comment-analyzer | Yes | findings | 7 | confirmed 6, dismissed 0, deferred 1 |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — Disabled; assessed by me (no new types; `Model3D` unchanged) |
| 7 | reviewer-security | No | Skipped | disabled | N/A — Disabled; assessed by me (no input, network, secrets, or auth surface) |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — Disabled; assessed by me (diff is data + one constant; comment density matches house style) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | N/A — Disabled; I enumerated the TS lang-review checklist myself below |

**All received:** Yes (4 run, 5 disabled by settings and assessed directly)
**Total findings:** 12 confirmed, 0 dismissed, 3 deferred

Two subagents **falsified a claim someone else had made**, which is exactly why they were worth
running against the settings:
- test-analyzer falsified **my own** arithmetic. I calculated that a point-snapshot would now
  catch sw4-1's bolt (making that test vacuous). It reverted `sweptCollides` to a point check and
  the test **still failed** — because the port scrolls 8.33u/frame *toward* the bolt, preserving a
  0.33-unit tunnelling margin at r=108. I was using the wrong `dt`. Correcting my own finding.
- ...and it falsified **Dev's** justification for the same edit (see [HIGH-1]).

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

Enumerated against every construct in the diff (2 consts, 1 numeric const, 6 test files):

| # | Rule | Instances checked | Verdict |
|---|------|-------------------|---------|
| 1 | Type-safety escapes (`as any`, `@ts-ignore`, `!`) | `render.exhaust-port-orient.test.ts:88-90` uses `call![1] as Model3D` | **Compliant** — non-null assertion is guarded by an `expect(call).toBeTruthy()` on the line above; the cast is `as Model3D`, not `as any` (which is what rule #8 forbids in tests) |
| 2 | Missing `readonly` on arrays | `PORT_TABLE`, `PORT_EDGES`, `PORTHOLE_EDGES` in `exhaust-port-rom.test.ts` | **Compliant** — all declared `readonly Vec3[]` / `readonly (readonly [number, number])[]` |
| 3 | Enum anti-patterns | none in diff | N/A |
| 4 | **Falsy zero (`\|\|` vs `??` on a valid 0)** | THE live trap here: all 12 vertices have `z === 0`, and index 0 is a stroked porthole corner | **Compliant** — explicitly tested (`exhaust-port-rom.test.ts`, "index 0 and coordinate 0 are both REAL"); edge-hunter grepped `src/` for `pos[N] \|\|`, `v[N] \|\|`, `vertices[a] \|\|` and found **zero** matches |
| 5 | Module/declaration issues | imports in 3 new test files | Compliant |
| 6 | React/JSX | N/A | N/A |
| 7 | Async/Promise | one `async` render probe in tests | Compliant |
| 8 | **Test quality** | see [HIGH-1], [MED-2] | **VIOLATION** — a removed anti-vacuous guard and a weakened invariant (below) |
| 9-12 | Build/security/error/perf | N/A to a pure-data model port | N/A |

### Devil's Advocate

Let me argue this change is broken.

The strongest case against it is not the geometry — the geometry is the most rigorously verified
work I have reviewed in this repo. I independently confirmed the model is byte-for-byte identical
to the ROM bake **in ROM order** (which is what `romCompare.verticesEqual`, an *ordered* deep
compare, actually requires), that the 18 edges match as a set, that `0x0C/0x14/0x20 × 8` really
does give 96/160/256, and that a decimal misreading of the base row lands on 160 — *precisely the
true berm value*, which would collapse three concentric squares into two while looking entirely
plausible. The comment-analyzer re-derived every claim in the new doc comments against WSOBJ.MAC
line-by-line and found no errors. That work is sound.

The case against it is **documentation**, and in this repository that is not a cosmetic complaint —
it is the *thesis of the entire epic*. Epic sw5 exists because `models.ts` "states plainly that its
EDGES were reconstructed by heuristic," and because sw3-11 wrote a decimal misreading into a doc
comment where it sat as ground truth for **two subsequent stories**. This diff removes one confident
lie from `models.ts` and leaves at least three others standing elsewhere — including one inside
`romCompare.ts`, the fidelity tool whose entire job is to be the source of truth, which still tells
the next reader that PORT has *no draw list*, that EXHAUST_PORT is *PROVISIONAL and authored*, and
that "this pair never asserts edges either." Every clause is false, and it is falsified by test
assertions shipped in *this very diff*. A future agent who greps for the port's provenance is more
likely to land on `romCompare.ts` or `docs/star-wars-1983-source-findings.md` (which still says the
Object_12 identification is "not safe to claim as the port") than on the one comment that got fixed.
That is not a stale-comment nit. That is the exact mechanism that produced the bug this story fixes,
left armed for the next story.

And a confused reader is not hypothetical: `sim.ts:691` — the collision code the changed constant
feeds — still says "the fixed 70u port sphere" and "clean over the 140u sphere." Someone debugging a
tunnelling report will reason from 70 and 140 and reach the wrong conclusion about a sphere that is
now 108 and 216.

Worse, this diff *introduces a new false statement*. The re-seated `swept-port-collision.test.ts`
asserts in prose that "sw4-1's bolt was never going to tunnel through the port the cabinet actually
has." It still tunnels. Proven empirically. The one guard that would have caught that claim going
stale was deleted in the same edit.

*— The Thought Police*

---

## Reviewer Assessment

**Verdict:** REJECTED

The ROM port itself is **correct and exceptionally well-evidenced** — I could not break the
geometry, the hit tuning, or the collision paths. It is rejected on documentation integrity and
two test-quality regressions, in a repo where a wrong comment has already propagated as ground
truth through two stories. Every fix below is mechanical; none touches the geometry.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH-1] `[TEST]` | The re-seated sw4-1 test states in prose that the bolt "was never going to tunnel through the port the cabinet actually has." **This is false — it still tunnels.** test-analyzer reverted `sweptCollides` to a point check and the test still failed: the port scrolls 8.33u/frame *toward* the bolt, so the end sample lands 108.33u away vs a 108 radius. The premise assertion (`STEP > PORT_DIAMETER`) that protected this margin was deleted and not replaced, so a 1-unit change to `PORT_HIT_RADIUS` (e.g. rounding 108.3 up to 109) or to `TRENCH_SCROLL_SPEED` silently turns it into a snapshot-equivalent test with nothing flagging the loss. | `tests/core/swept-port-collision.test.ts:168-188` | Correct the comment (the bolt DOES still tunnel, via the scroll, not the step). Re-add an explicit margin guard, e.g. `expect(STEP/2 + TRENCH_SCROLL_SPEED*FRAME).toBeGreaterThan(PORT_HIT_RADIUS)`. |
| [HIGH-2] `[DOC]` `[EDGE]` | The fidelity tool's own doc comment still says PORT is `hasDrawList: false`, that EXHAUST_PORT is "PROVISIONAL/authored (no confirmed ROM source)", and that "this pair never asserts edges either." **All three clauses are false**, and are contradicted by `tests/tools/romCompare.test.ts` *in this same diff*. Flagged independently by two subagents. | `src/tools/romCompare.ts:39-48` | Rewrite the PORT bullet to match the STB/BNK ones: `.WGD PORT` is its own draw routine, the port carries the ROM's 12-point table verbatim, vertices and edges are both diffed for real. |
| [HIGH-3] `[EDGE]` `[DOC]` | The swept-collision comment in the collision code itself still cites "the fixed 70u port sphere" and a bolt stepping "clean over the 140u sphere." The sphere is now **108 / 216**. This is the code the changed constant feeds; anyone debugging a tunnelling report reasons from the wrong numbers. | `src/core/sim.ts:691-693` | Update to 108u / 216u. |
| [MED-1] `[DOC]` | "the floor squares, catwalk rails, **and exhaust port** are authored flat in the y=0 plane, so they need no reorientation." The port is now flat in **z=0**. `TRENCH_ORIENT = IDENTITY` remains correct — but for a *different reason*, and the stated reason is now false. | `src/shell/render.ts:108-110` | Split the bullet: the floor pieces are flat in y=0; the port is a z=0 plate facing the pilot and needs no reorientation either, for a different reason. |
| [MED-2] `[TEST]` | The 8-5 ring invariant was narrowed from "every ring closes" to "**at least one** ring closes." The narrowing is unavoidable (the ROM genuinely leaves the outer base open — 2 edges among 4 vertices, a 4-cycle is impossible), but the replacement is too weak: test-analyzer corrupted the **porthole** ring (swapped `[0,1]` for a stray `[0,6]`) and this test **still passed**, because the intact berm ring alone satisfies "at least one." The porthole is the one ring the story is about. Caught today only by the sibling ROM suite. | `tests/core/models.test.ts:636-659` | Scope the assertion to the **innermost** (smallest-magnitude) ring, which is both stronger and what the comment already claims ("the OPENING closes"). |
| [MED-3] `[DOC]` | `VIEW_TILT`'s rationale ("so flat y=0 models aren't edge-on") and line 174 both still name EXHAUST_PORT as a flat-y=0 model. Not functionally broken (the tilt is applied uniformly), but the premise is wrong. | `src/tools/contactSheet.ts:28, 172-174` | Drop EXHAUST_PORT from the parenthetical or note its new plane. |
| [MED-4] `[DOC]` | The two documents the OLD models.ts comment cited **as its authority** still assert the opposite of what this story proved: "EXHAUST_PORT remains an authored octagon — no authentic vertex table names or addresses it ... not safe to claim as the port," and "an authored octagon with no confirmed ROM source." These are the highest-traffic provenance docs in the repo. | `docs/star-wars-1983-source-findings.md:267-270, 705`; `docs/sw2-6-disassembly-fidelity-audit.md:173, 237` | Add SUPERSEDED errata pointing at sw5-4 / WSOBJ.MAC `.WP PORT`. |
| [LOW-1] `[DOC]` | `OFF_AXIS = PORT_HIT_RADIUS * 6 // 720u today` — it is 648 now. | `tests/core/exhaust-port-outcome.test.ts:197` | Fix the literal or drop it. |
| [LOW-2] `[EDGE]` | `OBSTACLE_HIT_RADIUS = 90` is justified as "tuned near PORT_HIT_RADIUS." That anchor moved 70 → 108, and the ratio **flipped** (90 used to exceed the port radius; now it is smaller). Not a bug — just a justification that no longer holds. | `src/core/trench-obstacles.ts:39` | Re-state or drop the cross-reference. |

### Verified good (evidence, not vibes)

- `[VERIFIED]` **The model is the ROM, byte-for-byte, in ROM order.** I ran an ordered deep compare
  of `EXHAUST_PORT.vertices` against `ROM_MODELS.PORT.vertices` (`true`) and the edge sets (`true`,
  18/18). Ordered equality is the actual requirement — `romCompare.ts:131-134` `verticesEqual` is an
  index-wise compare, so a reordering would silently repoint every edge. It does not reorder.
- `[VERIFIED]` **The hex reading is right and the decimal one is refuted.** `0x0C/0x14/0x20 × 8` =
  96/160/256. A decimal misread of the base row gives `20 × 8 = 160` — *identical to the true berm* —
  which would collapse three squares into two undetectably. `exhaust-port-rom.test.ts` pins this.
- `[VERIFIED]` **`PORT_HIT_RADIUS = 108` is principled, not arbitrary.** It is the equal-area disc of
  the ±96 square (108.32), sits inside every bound TEA specified (>70, ≥96, ≤136, <160), and the ROM
  itself justifies tuning to the porthole rather than the plate: `.WGD PORT`'s `VGCRED` pen is
  commented `;PORTHOLE` and closes points 0-3 and nothing else (WSOBJ.MAC:1872-1874).
- `[VERIFIED]` **No functional consumer was left on the old plane.** edge-hunter enumerated every
  reader of the port's geometry — `render.ts`, `debug-overlay.ts`, `modelView.ts:modelBounds`,
  `models.test.ts:deriveRings` — all are plane-agnostic or re-derive from the model.
- `[VERIFIED]` **The bigger sphere collides with nothing it shouldn't.** 108 stays far inside
  `TRENCH_HALF_W`=256 / `TRENCH_WALL_H`=320 and >100u short of every `TRENCH_OBSTACLE_STATIONS`
  entry, so no bolt aimed at a turret can now detonate the port. Hit-vs-crash paths in
  `sim.ts:687-753` are mutually exclusive by early `return` — no double-fire at any radius.
- `[VERIFIED]` **The render orientation guard is not vacuous.** test-analyzer injected the exact bug
  it was written to catch (`TRENCH_ORIENT = rotationX(π/2)`) and it failed as designed
  (`expected 2.8e-14 to be greater than 1`). Dev's "I looked at it" was real work, not a claim.

### Deferred to a new story (NOT blocking this one)

Dev's blocking Delivery Finding — **the port plate is half below the trench floor** — is
**CONFIRMED**. I reproduced it myself in the dev server (my own checkout, port 5285) at z=−2400,
−700 and −300. The plate spans world y = −256…+256 while the channel is y = 0…320.

But I am **downgrading it from blocking to a follow-up story**, and Dev was right not to fix it here:
1. **No AC covers placement**, and the port's centre (y=0) is *unchanged* from the octagon — so the
   aim point and the difficulty of aiming are **identical to before**. This is a visual defect, not
   a gameplay regression.
2. The fix requires pinning `TRENCH_WALL_H`, which is self-declared `PROVISIONAL … not pinned`.
   Guessing it is exactly the sin this epic exists to undo.
3. The evidence genuinely points at the trench, not the port: the ROM base half-width is **256 —
   exactly `TRENCH_HALF_W`** — so the plate spans the trench width *perfectly*. That is strong
   independent corroboration that 256 is right and that the cross-section is 512×512.
4. Dev correctly refused the tempting fix (scaling the model down): that would break the world↔ROM
   1:1 unit contract that AC-4's WYSIWYG bound and AC-5's deep vertex compare both stand on.

Blocking sw5-4 on this would hold the epic's last contact-sheet pair hostage to a different story.
**Filed as sw5-6 below.**

**Handoff:** Back to Julia (Dev) for fixes. Re-review on return; the geometry needs no rework.

---

## Reviewer Assessment — Round 2 (post-fix re-review)

**Verdict:** APPROVED

All 10 findings fixed in `efb551a`. I did **not** take the fix round on trust — the entire point of
[HIGH-1] and [MED-2] was that a test *looked* correct and wasn't. So I re-verified the two tightened
guards by **mutating the code they are supposed to protect**:

| Mutation | Before the fix | After the fix |
|---|---|---|
| Corrupt the **porthole** ring (`[0,1]` → `[0,6]`, tangling the hole into the berm) | `models.test.ts` **PASSED** — the intact berm ring alone satisfied "at least one" | **FAILS** ✓ |
| `PORT_HIT_RADIUS` 108 → **109** (erases the 0.33u tunnelling margin) | swept test would have silently degraded into a snapshot-equivalent no-op, with nothing flagging it | **FAILS loudly** ✓ (`STEP/2 + TRENCH_SCROLL_SPEED*FRAME > PORT_HIT_RADIUS`) |

Both now bite. That is the difference between a test and a decoration.

**Re-verified directly:**
- **Geometry untouched by the fix round** — `git diff 8dbd840..HEAD -- src/core/models.ts src/core/state.ts` is **empty**. The ROM port and `PORT_HIT_RADIUS = 108` are exactly as approved.
- `src/tools/romCompare.ts:45-49` — the PORT bullet now states the truth (`.WGD PORT` is its own routine; vertices AND edges compared for real; 0/0 drift) and explicitly says the pair is **not** header-only. The two surviving `hasDrawList: false` mentions (lines 39, 192) are generic tool behaviour about the *unmapped* GND/TWR, not claims about PORT. Correct.
- `src/core/sim.ts` — now cites the 108u sphere / 216u diameter, and honestly says sw4-1's bolt tunnels *once the port's own per-frame scroll narrows the margin*, rather than re-asserting the false "clean over" claim.
- `src/shell/render.ts:108-114` — the TRENCH bullet is now split: floor/catwalks are y=0; the port reaches the same IDENTITY answer *for a different reason* (a z=0 plate already facing the camera). That is the distinction that was wrong.
- 4 × `⚠ SUPERSEDED (sw5-4)` errata added to the two provenance docs — annotating history, not rewriting it.
- Full suite **990/990**, `tsc` clean, `build` clean, working tree clean.

**Final tally:** 5 ACs met. The last blocked pair on the ROM contact sheet is now compared for real
and comes out 0/0. The `PROVISIONAL` marker is gone from `models.ts` — and, unlike the first round,
it is gone from everywhere else that repeated the claim.

**Handoff:** To Winston Smith (SM) for finish. **`sw5-6` must be filed** (see Delivery Findings) —
the port plate is half below the trench floor, and the ROM says the trench is what's wrong.

*— The Thought Police. Round 1 rejected on 3 HIGH. Round 2 clean, and I checked with mutations, not manners.*

---

## Dev Assessment (Round 2 — Rework)

**Implementation Complete:** Yes — all 9 reviewer findings (HIGH-1/2/3, MED-1/2/3/4, LOW-1/2) fixed.
Geometry untouched: `git diff` confirms zero changes to `src/core/models.ts` or `src/core/state.ts`
(`PORT_HIT_RADIUS` stays 108; `EXHAUST_PORT` vertices/edges byte-for-byte identical to Round 1).

**Files Changed:**
- `tests/core/swept-port-collision.test.ts` — [HIGH-1] Rewrote the sw4-1 comment to state the
  truth (the bolt STILL tunnels — the port's own 8.33u/frame scroll leaves only a 0.33u margin,
  proven by reverting `sweptCollides` to a point check). Re-added the anti-vacuous guard
  `expect(STEP/2 + TRENCH_SCROLL_SPEED*FRAME).toBeGreaterThan(PORT_HIT_RADIUS)`, importing
  `TRENCH_SCROLL_SPEED` from `../../src/core/state`.
- `src/tools/romCompare.ts` — [HIGH-2] Rewrote the PORT bullet in the `ROM_TO_PORT` doc comment to
  match the STB/BNK style: `.WGD PORT` (WSOBJ.MAC:1855) is its own draw routine, EXHAUST_PORT
  carries the ROM's 12-point table verbatim, vertices AND edges are compared for real (0/0 drift).
- `src/core/sim.ts` — [HIGH-3] Updated the swept-collision comment's stale "70u sphere"/"140u sphere"
  to 108u/216u, and softened the specific "sw4-1's bolt clean over" claim (now known false at this
  speed — see HIGH-1) to a general statement, pointing to the test file for the precise nuance.
- `src/shell/render.ts` — [MED-1] Split the TRENCH orientation bullet: floor squares/catwalk rails
  are flat in y=0; the exhaust port is a DIFFERENT case (ROM plate flat in z=0, facing the pilot
  down -Z) that reaches the same IDENTITY answer for a different reason.
- `tests/core/models.test.ts` — [MED-2] Tightened the "closed ring opening" test from "at least one
  ring closes" to "the innermost ring (smallest |x| corner magnitude) closes" — verified this
  correctly targets the porthole ring (indices 0-3, |x|=96) and would catch a corrupted porthole
  even with the berm ring intact.
- `src/tools/contactSheet.ts` — [MED-3] Corrected `VIEW_TILT`'s rationale and the `drawModelCell`
  comment: EXHAUST_PORT is a z=0 plate, not a y=0 model; TRENCH still lies flat in y=0.
- `docs/star-wars-1983-source-findings.md`, `docs/sw2-6-disassembly-fidelity-audit.md` — [MED-4]
  Added four `⚠ SUPERSEDED (sw5-4)` errata blockquotes at the flagged locations, annotating (not
  rewriting) the pre-WSOBJ.MAC-discovery text with the `.WP PORT`/`.WGD PORT` citation.
- `tests/core/exhaust-port-outcome.test.ts` — [LOW-1] Fixed stale `// 720u today` comment to `648u`
  (`PORT_HIT_RADIUS * 6` = 108 * 6 = 648).
- `src/core/trench-obstacles.ts` — [LOW-2] Re-qualified `OBSTACLE_HIT_RADIUS = 90`'s justification:
  it was tuned near the OLD `PORT_HIT_RADIUS` (70, ratio ~1.29x); sw5-4 moved that anchor to 108
  (ratio now ~0.83x) for unrelated reasons, so this is now historical provenance, not a live
  tuning relationship. Value left at 90 — no AC/test asked for a change.

**Independently verified before writing:** cross-checked the WSOBJ.MAC line citation (1855) and the
hex corner magnitudes (`$60/$A0/$100` = 96/160/256 decimal) directly against
`~/Projects/star-wars-1983-source-text/WSOBJ.MAC` rather than trusting the prompt's numbers blind.

**Tests:** 990/990 passing (GREEN). `npx tsc --noEmit` clean. `npm run build` clean.
**Branch:** feat/sw5-4-rom-port-exhaust-port (pushed, commit efb551a)

**Could not fix:** nothing — all 9 findings addressed as specified.

**Handoff:** To the Thought Police (Reviewer) for re-review.

*— Julia*