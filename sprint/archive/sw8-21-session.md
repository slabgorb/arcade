---
story_id: "sw8-21"
jira_key: "sw8-21"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-21: surface finishGround death gate

## Story Details
- **ID:** sw8-21
- **Jira Key:** sw8-21
- **Workflow:** tdd
- **Type:** bug
- **Points:** 1
- **Priority:** p3
- **Repos:** arcade
- **Branch:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

  The `none` value above is the documented escape hatch for a trunk-based story, set proactively
  at setup: `pf sprint story finish` scrapes that labelled Branch token by pattern anywhere in
  this file and tries to verify whatever follows it as a branch name (jt8-3). It must appear
  exactly ONCE, as the field. No agent should write that label again anywhere in this session —
  say "landed on `main` (`<sha>`)" instead.

## Story Context

The ROM's ground-flying routine PHEGD carries an identical death guard to what sw8-13 ported for space: 
`LDA S.GAS / LBMI PHIG0D ;J EXIT WHEN DEAD` (WSMAIN.MAC:1645-1646) sits BEFORE the PH.TIM walk that fires 
`JSR PMREB ;FINISH GROUND WITH REBEL` (:1673), so a last-shield fall on the crossing frame silences the 
finishGround cue on the cabinet.

Our surface stepper pushes `{type:'tune',tune:'finishGround'}` at the speed-crossing (sim.ts:996-998) BEFORE 
the frame's loseShield resolves (sim.ts:1127), with no lives gate — the cue starts over the death.

The fix mirrors sw8-13 in *intent*. The surface crossing is SPEED-driven (not phaseTime), so the
test fixture and timing differ from the space template.

> ⚠ This paragraph originally read "add `if (lives > 0)` gate before pushing the cue." SM measured
> that and it is **not available as written** — `lives` is not bound until `sim.ts:1128`, 131 lines
> below the cue push at :997, so a literal wrap at the cue site will not compile and the port has
> to re-order. See "The one thing that makes this 1-pointer non-trivial" in the SM Assessment
> below before designing the RED test.

Reachable only when the crossing and the last shield share one 0.05s frame — a fatal hit must resolve on the 
exact frame the speed threshold is crossed.

## Acceptance Criteria

> SM-derived — `sprint/epic-sw8.yaml` carries `acceptance_criteria: null` for this story, so there
> is no epic list these must match. Reproduced verbatim and identically in
> `sprint/context/context-story-sw8-21.md`.

- AC1 — The finishGround cue is not played when a player loses their last shield during the surface speed crossing, matching the ROM's PHEGD death gate (WSMAIN.MAC:1645-1646)
- AC2 — A test case documents the death-frame surface finishGround silence, following the sw8-13 template from space-music-milestones.test.ts (:348-358)
- AC3 — The finishGround cue push is decided against the lives remaining AFTER the frame's shield resolution (`sim.ts:1127-1128`), not before it, so that no `tune`/`finishGround` event is emitted on a frame whose last shield falls
- AC4 — A hit that leaves shields standing still cues finishGround: the gate keys on death, not on damage. The existing `it('cues exactly one finishGround tune during the surface traversal')` (`surface-traversal-end.test.ts:226`) must stay green

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T22:14:05Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T21:17:06Z | 2026-08-01T21:23:05Z | 5m 59s |
| red | 2026-08-01T21:23:05Z | 2026-08-01T21:34:26Z | 11m 21s |
| green | 2026-08-01T21:34:26Z | 2026-08-01T21:45:45Z | 11m 19s |
| review | 2026-08-01T21:45:45Z | 2026-08-01T22:01:46Z | 16m 1s |
| green | 2026-08-01T22:01:46Z | 2026-08-01T22:06:34Z | 4m 48s |
| review | 2026-08-01T22:06:34Z | 2026-08-01T22:09:06Z | 2m 32s |
| green | 2026-08-01T22:09:06Z | 2026-08-01T22:12:21Z | 3m 15s |
| review | 2026-08-01T22:12:21Z | 2026-08-01T22:14:05Z | 1m 44s |
| finish | 2026-08-01T22:14:05Z | - | - |

## Sm Assessment

**Setup complete. Routed to TEA for the RED phase.** Baseline measured before any edit:
`npx vitest run --project star-wars` → **196 test files, 2095 tests, all passing**. The Reviewer
should expect that count plus whatever TEA adds.

### The description's falsifiable claims were measured. Most verified; two cites drifted.

Per the standing rule that a backlog description is copied forward as current fact, every citation
was checked against the tree at `d5e0754`:

- **All four ROM citations verified exactly.** `PHEGD:` opens at `WSMAIN.MAC:1642`; the death gate
  `LDA S.GAS` / `LBMI PHIG0D ;J EXIT WHEN DEAD` is at **:1645-1646**; `JSR PMREB ;FINISH GROUND
  WITH REBEL` is at **:1673**, sitting below that gate inside the `LDA PH.TIM / CMPA #14. / IFEQ`
  chain. The ROM half of this story needs no correction.
- **The core premise verified.** Between `stepSurface` opening at `sim.ts:947` and the cue push at
  :997 there is no `lives` reference of any kind — the only occurrence of the string in that span
  is the English word in a comment at :974. The cue is genuinely ungated.
- **Reachability verified as same-frame-death-only.** `sim.ts:185` returns on
  `mode === 'gameover' || gameOver` before the phase dispatch at :345/:350, so a frame entered
  dead never reaches `stepSurface`. The 0.05s window in the description is the whole exposure.
- **Two `sim.ts` cites are off by one** and the corrected values are used throughout the context:
  the push block is **:996-998** (not :995-997) and `loseShield` is **:1127** (not :1126). Neither
  changes the mechanism. The epic YAML still carries the old numbers; the context reproduces its
  description verbatim under a `⚠ CORRECTION` block rather than editing it, so the annotation
  stays checkable against the text it annotates.

### The one thing that makes this 1-pointer non-trivial, and the description hides it

The description says "same fix shape as sw8-13's `if (lives > 0)` gate". Measured, that is
**not** available here: `const lives = surfaceHit.lives` is created at **`sim.ts:1128`**, 131
lines *below* the cue push at :997, so a literal `if (lives > 0)` at the cue site will not
compile. The only binding in scope there is `state.lives`, and gating on that would be wrong —
it describes a frame *entered* dead, which the dispatcher makes unreachable. sw8-13 had the
ordering for free (space: `loseShield` :633, gate :662); the surface stepper has them reversed,
so this port must **re-order**, not merely wrap.

SM measured only that it is feasible, and left the shape to Dev: `events` is the same array and
is still pushed to at :1141, and `scrollSpeed` / `state.surfaceScrollSpeed` are both in scope as
far down as :1158.

### Two ACs are SM-authored, and TEA should challenge them

`sprint/epic-sw8.yaml` carries `acceptance_criteria: null`, so `sm-setup` derived the list; there
is no epic list to diverge from. Two changes were made to that draft and both are mine, not the
story's:

- **AC3 was rewritten.** The draft read "gates the finishGround cue push on `lives > 0` before any
  event is emitted" — the mechanism refuted directly above. It now states the outcome and the
  ordering constraint (decide the push against post-resolution lives) without mandating a shape.
- **AC4 was added.** sw8-13's own comment records that a hit leaving shields standing must NOT
  gate. Without this, an over-aggressive gate silences the cue for a survivable hit and still
  passes AC1-AC3. It names `surface-traversal-end.test.ts:226` as the existing guard that must
  stay green.

### Test home is flagged as TEA's call, not mandated

The description names the sw8-13 block as the *template* and that is right — but the block lives
in the **space** file (`space-music-milestones.test.ts`, comment at :348, `describe` at :358).
Existing finishGround ownership is in `surface-traversal-end.test.ts` (:226 the one-shot test,
:251-258 the space-negative), which is the more natural home for a surface death-frame describe.
Recorded as a pointer; TEA decides.

### Sibling-contention probes: clean

`git branch -r | grep sw8-21` → no hits. `ls /Users/slabgorb/Projects/a-*/.session/*-session.md`
→ one hit, `a-1`'s `ad1-2` (battlezone showcase), which shares no files with this story. Nothing
else is holding sw8-21.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/star-wars/tests/core/surface-traversal-end.test.ts` — seven tests appended as
  `describe('sw8-21 — a finishGround crossing on the death frame cues NOTHING')`, the file that
  already owns the PMREB cue.

**Tests Written:** 7 tests covering 4 ACs
**Status:** RED — 2 failing, ready for Dev

| Suite | Before | After |
|-------|--------|-------|
| `--project star-wars` | 196 files / 2095 tests, all green | 196 files / 2102 tests, **2 failed** |
| `npm run lint` | clean | clean |

The two failures are the death frames, and they fail on the cue assertion alone — every
fixture-validity assertion above them (`lives === 0`, `gameOver`, the damage event, and the
speed genuinely crossing) passes. That is the RED I wanted: the fixtures are proven to reach the
window, and only the behaviour under test is missing.

### What the tests pin

`stepSurface` pushes the finishGround cue at `sim.ts:996-998` with no lives gate, 131 lines
before `loseShield` resolves the frame's shield loss at `:1127-1128`. The ROM's PHEGD
(`WSMAIN.MAC:1642`) exits on `LDA S.GAS / LBMI PHIG0D` at `:1645-1646` — above the
`JSR PMREB` at `:1673` — so the cabinet never starts that cue over a death.

**SM's central measurement is confirmed, and I compiled it rather than reasoning about it.**
Wrapping the push in `if (lives > 0)` does not build:

```
sim.ts(997,9): error TS2448: Block-scoped variable 'lives' used before its declaration.
sim.ts(997,9): error TS2454: Variable 'lives' is used before being assigned.
```

So this is a re-ordering, not a wrap — sw8-13 had the ordering for free (space: `loseShield`
:633, gate :662) and the surface stepper has them reversed. That output is now quoted in the
test file's header so the next reader does not re-derive it.

### Two tests exist to refute near-miss fixes

Neither is named by an AC; both close a hole AC3 would otherwise leave open.

- **Turret bolt.** The bolt's hit-test is at `:1119-1123`, *below* the cue push, so at the cue
  site this frame's `damage` counter still reads 0. A fix that consults `damage` there passes
  the terrain-crash case and fails this one. (Terrain crash populates `damage` at `:1064-1070`,
  *above* the push — which is exactly what makes the naive fix look plausible.)
- **S-016 dropped hit.** Damage lands but `POST_HIT_SHIELD_WINDOW` folds it away, so the pilot
  lives. A gate written against `damage > 0` silences a cue that should sound.

Only the post-`loseShield` result satisfies all four death/no-death cases.

### Rule Coverage

Applicable checks from `.pennyfarthing/gates/lang-review/typescript.md`:

| Rule | Test(s) | Status |
|------|---------|--------|
| #14 derived EDGE computed inside one branch | the two death-frame tests + the turret-bolt variant — they force the crossing edge to be decided where *both* inputs (speed, post-hit lives) are visible | failing (RED) |
| #15 guards must be mutation-tested | whole block — battery below | passing |
| #17 comments asserting a mechanism nobody re-ran | header comment now quotes real `tsc` output instead of claiming "does not compile" | passing |
| #18 test apparatus that fails by PASSING | `the fixture really does cross on step one` — asserts the crossing is real, so the "silenced" cases cannot pass vacuously | passing |

Checks #1-#13 and #16 are not applicable: this diff is test-only, adds no casts, suppressions,
enums, async, JSX, or I/O.

### Mutation battery — the five green tests are proved, not assumed

Five of the seven pass on arrival, so they are worth nothing until shown to fail for the right
reason. Each mutation was anchor-checked for uniqueness first (an anchor miss scores the suite
as safer than it is), and `sim.ts` was restored byte-for-byte and asserted equal afterwards.

| Mutation | Result |
|----------|--------|
| M1 — delete the cue push entirely | kills all four "still cues" guards (fixture-crossing pin, shields-to-spare control, one-shield boundary, S-016) |
| M2 — drop the `was below` clause so it fires every frame past the threshold | kills `cues exactly one finishGround tune during the surface traversal` (:226) |
| M3 — disable the gameover early return at `sim.ts:185` | kills `a frame ENTERED dead never reaches the stepper` — and nothing else new |
| M4 — wrap the push in `if (lives > 0)` | `tsc` rejects it (TS2448/TS2454), quoted above |

**M2 is the one worth Dev's attention:** the one-shot property is invisible to every
single-frame test I wrote, and is caught only by the pre-existing traversal test. That is why
AC4 names it as must-stay-green — a fix that re-orders the push must not also re-arm it.

**Self-check:** one weak assertion found and fixed during review — `expect(MIN_SKIM_ALTITUDE)
.toBeGreaterThan(0)` asserted a constant against itself and proved nothing; it now reads
`expect(scraping.altitude).toBeLessThan(MIN_SKIM_ALTITUDE)`, tying the fixture to the floor it
claims to breach. No vacuous assertions remain: every test asserts on step output, not on inputs.

**Handoff:** To Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/star-wars/src/core/sim.ts` — the finishGround cue push moved out of the speed-crossing
  block and re-seated below the frame's shield resolution, gated on `lives > 0`.
- `plugins/star-wars/docs/audit/findings/*.json` (7 files) — line-number-only citation re-anchor,
  a mechanical consequence of the line shift above.

**Tests:** 2102/2102 passing (GREEN) · `npm run lint` clean · orchestrator 359/359
**Landed on:** `main` — trunk-based, no feature branch.

### The change

One block moved; no logic invented. It previously read, immediately after `scrollSpeed` was
computed and ~130 lines before the shield resolution:

```ts
if (state.surfaceScrollSpeed < SURFACE_FINISH_GROUND_SPEED && scrollSpeed >= SURFACE_FINISH_GROUND_SPEED) {
  events.push({ type: 'tune', tune: 'finishGround' })
}
```

It now sits directly after `pushFarewell(events, lives)`, with `lives > 0 &&` added as the first
clause. The crossing test itself is untouched — still the same frame-start/frame-end speed pair,
still monotonic, still one-shot. `surfaceScrollSpeed: scrollSpeed` is returned regardless, so a
cue silenced by the death is **lost, not deferred**, which is what the ROM's exit leaves behind.

A two-line breadcrumb stays at the old site pointing at the new one, because the crossing is
*detected* from a value computed there and read 130 lines away — without it the next reader has no
reason to look downward.

### Why it moved rather than being wrapped in place

TEA had already compiled the alternative and quoted the result; I re-confirmed the surrounding
constraint before moving anything. `lives` is bound by `loseShield`, so `if (lives > 0)` at the
old site does not typecheck (TS2448/TS2454). The two near-miss fixes that *would* have compiled
are both wrong, and TEA's tests fail them:

- reading the local `damage` counter at the crossing — the turret hit-test has not run yet, so
  `damage` is still 0 for a bolt death;
- gating on `damage > 0` — S-016 can drop a hit, and the pilot who survives it should hear the cue.

Only the post-`loseShield` `lives` distinguishes all four cases.

**Checked before moving the block:** there is no early `return` anywhere between the old site and
`loseShield`, so the relocation cannot skip a frame that previously cued. (Verified by scanning
`stepSurface` :996-1130 for statement-level returns — none; the only `return`s in that span are
inside `.map`/`.filter` callbacks.)

### Verification

| Check | Result |
|-------|--------|
| `--project star-wars` | 196 files / **2102 passed**, 0 failed |
| `npm run lint` | clean |
| `npm run test:orchestrator` | 359/359 |
| Citation gate | green after re-anchor (15 moved, 81 already correct, **0 lost**) |

**The gate clause is mutation-proved, not assumed.** Deleting `lives > 0 &&` and re-running the
suite returns it to `2 failed | 21 passed` — the exact RED state TEA handed over — so the clause
is doing the work and is not dead weight riding on the relocation. `sim.ts` was restored
byte-for-byte and asserted equal afterwards.

**Handoff:** To Reviewer.

---

## Dev Assessment — round 1 rework

**Implementation Complete:** Yes
**Files Changed:** `plugins/star-wars/tests/core/surface-traversal-end.test.ts` — comments only.
No source or test logic touched.

**Tests:** 2102/2102 passing · `npm run lint` clean · orchestrator 359/359
**Landed on:** `main` — trunk-based.

### R1-1 fixed, and fixed structurally rather than by re-pointing

The Reviewer's three cites were re-measured before editing and all three were correct. But the
lesson this project already paid for (lang-review #17: "when a claim fails review twice, stop
correcting its values and ask what it should stop asserting") says re-pointing the numbers would
just set up the next drift — the fix moved code once and could again. So the two test comments were
re-anchored on the **mechanism** instead:

The durable fact is that the crossing is computed at `const scrollSpeed` (`sim.ts:983`), and that
line sits **between** the surface's only two damage sources — the terrain scrape above it
(`:965-969`) and the turret bolt's hit-test below it (`:1113-1120`). That is what makes the naive
`damage`-based fix look plausible for a scrape and fail for a bolt, and it stays true no matter
where the push ends up. Both comments now say that, naming `const scrollSpeed`, `liveShots` and
`loseShield` as anchors rather than a line the fix is free to move.

- `scraping` helper: `sim.ts:1064-1070` → `:965-969`, plus why that position matters.
- turret-bolt test: the false "hit-test at `:1119-1123`, AFTER the push at `:997`" is gone,
  replaced by the between-the-two-sources framing above.
- Header block: the pre-fix numbers are kept (they are the story's history and explain the tsc
  rejection) but are now fenced by an explicit `>>` note saying they describe the OLD layout and
  will not match the file, and listing the current anchors. The two quoted `sim.ts(997,9)` compiler
  lines are individually marked `(pre-fix)`.

### Verified, not asserted

Every citation surviving anywhere in the sw8-21 block was resolved against the current file:
`:983` `const scrollSpeed`, `:965`/`:969` the damage block, `:1113`/`:1120` the `liveShots` filter,
`:1122`/`:1123` `loseShield` and `const lives`, `:1145`/`:1150` the gated push, `:185` the gameover
branch, `:345-350` the phase dispatch, `:633`/`:662` the sw8-13 space pair. All correct. A grep for
every stale phrasing the Reviewer named returns nothing.

**Handoff:** Back to Reviewer for round 2.

---

## Dev Assessment — round 2 rework

**Implementation Complete:** Yes
**Files Changed:** `plugins/star-wars/tests/core/surface-traversal-end.test.ts` — comments only,
again. No source, no test logic.

**Tests:** 2102/2102 · lint clean · orchestrator 359/359
**Landed on:** `main`.

### R2-1 fixed by deletion, as instructed

The Reviewer's instruction was explicitly *not* "change 2 to 3", and I followed that. The census is
gone from both comments. What replaces it is the claim that cannot rot:

> the surface accrues `damage` at SEVERAL points, some above where the crossing is computed
> (`const scrollSpeed`, :983) and some below it, while `loseShield` (:1122) is the ONE place damage
> becomes death.

The turret-bolt comment was reworded the same way: it now says the bolt's hit-test runs below the
crossing while the scrape above it has already been counted, and ends "Only the post-`loseShield`
`lives` sees every source, **whatever they are**." Neither comment now contains a number that a
fourth damage source would falsify.

### Both new claims measured before writing them

Having just been rejected twice for unrun claims, I ran these rather than reasoning them:

- **"`loseShield` is the ONE place damage becomes death"** — exactly one `loseShield(` call exists
  inside `stepSurface` (`:947-1190`), at `:1122`. Verified by scanning the function's line range,
  not by grepping the file (which would also match space `:633` and trench `:1421`/`:1571`).
- **"some above ... and some below"** — the three `damage++` sites classify as `:967` above the
  crossing at `:983`, and `:1030` / `:1115` below it. So both halves of "some above and some below"
  are true, and the plural is correct on both sides.
- A grep confirms no census phrasing survives anywhere in the file.

**Handoff:** Back to Reviewer for round 3.

## Reviewer Assessment

**Verdict:** APPROVED
**Round:** 3

R2-1 is fixed the way it was asked to be fixed — by deletion, not by correcting the number. The
census is gone from both comments and what replaced it is a claim that cannot rot: damage accrues
at several points, some above where the crossing is computed and some below, and `loseShield` is
the one place damage becomes death. I verified both halves independently rather than reading them:
exactly one `loseShield(` call exists inside `stepSurface`'s line range (`:1122`), and the three
`damage++` sites do classify as one above `:983` and two below. Nothing in the file now contains a
number that a fourth damage source would falsify.

**The one enumerable claim left in the block, I ran rather than accepted.** The turret-bolt
fixture's inline note says "no scrape: the bolt is the only damage". That is exactly the category
that failed twice, and the test asserted the absence of `terrain-crash` but never of
`object-crash` — so a second source could have fired invisibly, since `loseShield` caps at one
shield per window and the test would pass either way. I added a temporary probe asserting
`object-crash` is empty and `player-death` has length 1, ran it, and it passed; the file was then
restored byte-for-byte and `git status` confirmed clean. The claim is true and now measured.

**Every anchor in the final block resolves**, checked one at a time against the current files:
`sim.ts` `:185` gameover branch, `:345` surface dispatch, `:633`/`:662` the sw8-13 space pair,
`:965`/`:969` the scrape, `:983` `const scrollSpeed`, `:1030` object-crash, `:1113`/`:1115`/`:1120`
the `liveShots` filter, `:1122`/`:1123` `loseShield` and `const lives`, `:1144`-`:1150` the gated
push; `WSMAIN.MAC` `:1642` `PHEGD:`, `:1645`/`:1646` the death exit, `:1673` `JSR PMREB`; and
`space-music-milestones.test.ts:358` the template describe. The pre-fix numbers in the header
remain, correctly fenced by the `>>` note and the two `(pre-fix)` markers.

**Data flow traced:** `dt` → `stepGame` (`:185` returns early if the run is already over, so only a
same-frame death is reachable) → `stepSurface`, where `dt` drives `scrollSpeed` (`:983`) and,
separately, three damage paths accumulate into one counter that `loseShield` (`:1122`) converts to
at most one lost shield → the two results meet at `:1144`, and only a surviving pilot's cue reaches
`events` → `main.ts:242` plays it on the shared `pm` channel.

**Pattern observed:** the surface gate now mirrors `sim.ts:662`, the sw8-13 space gate, so the two
death gates are structurally identical and directly comparable. The anti-pattern it removes —
taking a transition beside one of its inputs instead of below all of them — is lang-review #14, and
the trench still has it (routed as a Dev finding, unowned).

**Error handling:** nothing to handle. The gate is a boolean over two numbers; `loseShield` clamps
at zero (`Math.max(0, lives - 1)`), so a negative shield count is unrepresentable, and a NaN yoke is
neutralised upstream at `:962` before it can reach `altitude`.

**Verification:** 196 files / **2102 tests passed**, `npm run lint` clean, orchestrator **359/359**,
citation gate 12 passed with its source side genuinely running. Rounds 2 and 3 touched comments
only, confirmed mechanically both times — so the mechanism approved here is byte-identical to the
one that passed the full adversarial pass in round 1.

**Findings across all rounds:** R1-1 fixed and re-verified; R2-1 fixed and re-verified. No Critical
or High was raised at any point. Round 1's [EDGE], [SILENT], [TYPE], [SEC] and [SIMPLE] conclusions
stand unchanged, [TEST] stands as amended by the round-2 self-correction, and [DOC]/[RULE] is now
clear. Two non-blocking Delivery Findings are routed for SM: the trench carries the identical
ungated-cue bug (the third member of this family, unfiled), and both enabled review specialists
failed to return, so all three rounds ran without an independent read.

**Handoff:** To SM for finish-story

---

## Impact Summary (SM, finish phase)

Compiled by SM directly rather than by the `sm-finish` preflight subagent: two subagents already
failed to return during this story's review, and the preflight's known failure mode is scraping
findings across rounds and resurrecting a closed one as blocking. This story had **three review
rounds** and the session holds all three, so the round attribution below is stated explicitly.

**Blocking items: 0.**

**What shipped.** The surface `finishGround` (PMREB) cue is now decided against the lives remaining
*after* the frame's shield resolution, so a last-shield fall on the speed-crossing frame emits no
tune — the ROM's PHEGD behaviour (`WSMAIN.MAC:1645-1646` above `:1673`). One block moved in
`plugins/star-wars/src/core/sim.ts` and gained a `lives > 0` clause; seven tests added to
`plugins/star-wars/tests/core/surface-traversal-end.test.ts`; fifteen audit citations re-anchored
by line number only across seven finding files, with no `verbatim` evidence altered (proven by
parsing both revisions and diffing every leaf).

**Round history, and the final state of every finding.**

| Round | Verdict | Finding | Final state |
|-------|---------|---------|-------------|
| 1 | REJECTED | R1-1 — three false `sim.ts` citations in the new test comments | **FIXED** in round 2 and independently re-verified in round 3 |
| 2 | REJECTED | R2-1 — a fix-introduced "two damage sources" census (there are three) | **FIXED** in round 3 by deleting the census, both replacement claims measured |
| 3 | APPROVED | — | — |

No Critical or High was raised in any round. **The mechanism was correct from round 1 and never
changed**: rounds 2 and 3 touched comments only, confirmed mechanically both times, so the approved
code is byte-identical to the code that passed round 1's full adversarial pass. Anyone reading this
archive later should not mistake the two rejections for defects in the shipped behaviour — they were
both about the accuracy of prose describing it.

**One reviewer error is on the record deliberately.** Round 1's assessment asserted that a grep for
`damage++` in `stepSurface` "finds exactly those two", without running it. There are three. The
round-2 rework inherited the wrong number from that assessment, and round 2 corrected both the
comment and the reviewer's own claim rather than quietly dropping it.

**Findings routed, both non-blocking, both verified to have a real owner before this story closed.**

1. **The trench carries the identical bug** — filed as **sw8-22** (1pt, p3, bug, tdd, `repos:
   arcade`), with a description carrying the ROM citations (`PHEBS` at `WSMAIN.MAC:1839`, the exit
   at `:1842-1843`, `PMRRP` at `:1865`, `SPKTRU` at `:1874`), our unguarded push at
   `sim.ts:1247-1252` against `loseShield` at `:1421`, the two-shield-resolution complication that
   makes it *not* a copy of this fix, and the no-census lesson from this story's review rounds. The
   description was written in a second command because `story add` writes none.
2. **Both enabled review specialists failed to return.** `reviewer-rule-checker` and
   `reviewer-preflight` were spawned with full briefs and chased twice each; neither replied, so all
   three rounds ran with no independent read and the preflight's six mechanical checks were re-run
   by the Reviewer directly. Recorded in Delivery Findings; no story filed, because it is tooling
   behaviour rather than repo work, and the archive is the right place for it.

**Epic description left uncorrected, deliberately.** `sprint/epic-sw8.yaml`'s sw8-21 entry still
carries the two off-by-one `sim.ts` cites and the "same fix shape as sw8-13's `if (lives > 0)`
gate" phrasing that SM measured as unavailable. It is left as written so the `⚠ CORRECTION` block
in `sprint/context/context-story-sw8-21.md` stays checkable against the text it annotates —
rewriting the source would disguise the correction as the story having always said so.

---

### Round 2 — REJECTED (superseded by round 3 above)

The round-1 rework did the right thing structurally — it re-anchored the two test comments on
mechanism names instead of re-pointing line numbers, which is the correct response to that class of
defect. Every citation it wrote resolves correctly; I checked all fourteen. The diff is comments
only, verified mechanically (no non-comment line changed). Suite 2102/2102, lint clean,
orchestrator 359/359.

But the rework introduced a new false claim of the same family, and I have to own that I seeded it.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM][DOC][RULE] | The comments assert the surface has **two** damage sources; it has **three**. Introduced by the R1-1 fix (lang-review #13 fix-introduced regression, #17 unrun claim). | `plugins/star-wars/tests/core/surface-traversal-end.test.ts` — the header's "surface's two damage sources" and the turret-bolt test's "the two surface damage sources" | Stop asserting a census — see below |

### R2-1 — the census is wrong, and correcting the number is the wrong fix

`stepSurface` has **three** `damage++` sites, not two:

| Line | Source | Position vs the crossing (`const scrollSpeed`, `:983`) |
|------|--------|--------------------------------------------------------|
| `:967` | terrain scrape (below `MIN_SKIM_ALTITUDE`) | **above** |
| `:1030` | **object-crash** — flying into a standing tower/bunker (sw7-5 / D-020) | **below** |
| `:1115` | turret bolt (`liveShots`) | **below** |

The missing one is `object-crash` at `:1025-1032`. So "the surface's two damage sources" is false,
and the "sits BETWEEN the two" framing is structurally off as well: the crossing has one source
above it and **two** below.

**The instruction for round 3 is not "change 2 to 3."** This is the second consecutive round in
which these comments failed on an enumerable claim, and this project has already paid for that
lesson (jt8-6: three rounds of correcting values, and the fix that finally held was dropping the
category of assertion). So: **stop counting.** Delete the census and state the invariant that
cannot rot — that damage accrues at several points, some before the crossing is computed and some
after it, and that `loseShield` (`:1122`) is the single place damage becomes death, which is
precisely why the gate must read its result and not any earlier proxy. That claim stays true if a
fourth damage source is added tomorrow; a count does not.

Note the truth *strengthens* the argument the comment is making — with two sources below the
crossing rather than one, a `damage`-at-the-crossing gate is even more clearly wrong.

### Reviewer self-correction — I asserted this falsehood first

My round-1 assessment (below, under `[TEST]`) said: *"a grep for `damage++` in `stepSurface` finds
exactly those two, so the death paths are covered exhaustively, not representatively."* **That was
false and I did not run the grep** — I inferred it from having read two damage sites while building
the fixtures. The rework then picked the number up from my review. This is the same defect I
rejected round 1 for, committed by the reviewer, and it is corrected here rather than quietly
dropped because the archived session is the permanent record. The `[TEST]` bullet below stands
except for that sentence, which is withdrawn.

### Recorded non-finding, so it is not re-litigated

**The object-crash death path does not need its own test.** The gate is source-agnostic by
construction: all three sources funnel into one `damage` counter that `loseShield` converts at a
single site, and the existing pair already covers both structural positions — one source above the
crossing (terrain scrape) and one below it (turret bolt). A third test would be a second instance
of the "below" class and would pin nothing new. Verified the fixtures stay isolated: all 7 sw8-21
tests pass, and the maze at wave 7 puts no object near the cockpit plane on step 1, so
`object-crash` never fires incidentally in them.

### Round 2 verification

| Check | Result |
|-------|--------|
| Diff is comments-only | **confirmed mechanically** — every changed line in `13b0861` begins `//`, `*` or is blank |
| `npx vitest run --project star-wars` | 196 files / **2102 passed** |
| `npm run lint` | clean |
| `npm run test:orchestrator` | 359/359 |
| sw8-21 block in isolation | 7 passed |
| Every citation in the reworked comments | all resolve — `:983` `const scrollSpeed`, `:965`/`:969` the scrape, `:1113`/`:1120` `liveShots`, `:1122`/`:1123` `loseShield`/`const lives`, `:1144-1150` the gated push, `:185` dispatcher, `:345-350` phase dispatch, `:633`/`:662` the sw8-13 pair, ROM `:1642`/`:1645-1646`/`:1673` |
| Pre-fix numbers fenced | yes — the `>>` note and the two `(pre-fix)` markers are present and accurate |

Findings carried forward: none from round 1 — R1-1 is **FIXED** and independently re-verified.
[EDGE], [SILENT], [TYPE], [SEC], [SIMPLE] conclusions from round 1 are unchanged, because round 2
touched no code. [TEST] is amended by the self-correction above. [DOC]/[RULE] is R2-1.

**Handoff:** Back to Dev for fixes.

---

### Round 1 — REJECTED (superseded by round 2 above)

The mechanism is right. `stepSurface` now decides the PMREB cue against the frame's post-hit
`lives`, which is what the ROM's PHEGD exit does and what AC3 asks for, and I could not break it.
What fails is the paperwork around it: three `sim.ts` citations in the new test file's comments
point at code that is not there — one of them was wrong before the fix, and one now asserts the
exact opposite of the current layout. TEA predicted this drift in a Delivery Finding and asked the
GREEN phase to re-read the cites; that did not happen.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM][DOC] | Three false `sim.ts` line citations in the sw8-21 test comments | `plugins/star-wars/tests/core/surface-traversal-end.test.ts:275-282`, `:335`, `:360` | Re-point each to the code it names, and mark the pre-fix ones as historical |

### R1-1 — the citations, measured

- **`:335`** says the terrain-crash damage is at `sim.ts:1064-1070`. It is at **`:965-969`**
  (`let damage = 0` :965, `if (altitude < MIN_SKIM_ALTITUDE)` :966, `terrain-crash` push :969).
  `:1064` is `events.push({ type: 'enemy-fire' … })` — a different mechanism. **This one was wrong
  when it was written**, not drifted: no edit in this story ever put the crash there. Worse, the
  nearest `let damage = 0` to the cited range is `:614`, which belongs to the *space* stepper — so a
  reader who goes looking lands in the wrong function.
- **`:360`** says "The bolt's hit-test is at `sim.ts:1119-1123`, AFTER the push at `:997`". The
  hit-test is at **`:1113-1120`** (`collides` :1114, `damage++` :1115) and the push is now at
  **`:1149`**. So post-fix the bolt test runs *before* the push, not after, and `:997` is now a
  comment about the WSGRND maze. Both halves are false, and the sentence is the entire stated
  reason that test exists.
- **`:275-282`** cite `:996-998`, `:1127` and `:1128`. These sit under a paragraph headed "OURS,
  BEFORE THIS STORY", so they are deliberate history and are *defensible* — but nothing on the line
  says the numbers are pre-fix, and a reader who opens `:996-998` today finds maze-laying code.

**Why a documentation cluster is blocking here**, when the severity table says Medium does not
force a reject: the table makes Critical/High *sufficient* to reject, not *necessary*, and four
things push this over the line. The project's own lang-review #17 exists for exactly this failure
(origin: uf1-13), and jt8-6 was rejected three consecutive rounds on citation prose, so this is the
established bar in this repo, not my taste. `comment_analyzer` is disabled, so nothing downstream
catches it. TEA named the risk in writing and it went unactioned. And the fix is three line numbers
— one short round, with no judgment call to litigate. Filing a follow-up story for that would cost
more ceremony than the fix.

### Observations

- **[DOC]** R1-1 above — confirmed, blocking this round.
- **[RULE]** Rule-by-rule pass over all 18 TypeScript checks plus the core/shell boundary is in
  `## Rule Compliance`. #14 is the rule this story implements and it passes; #17 is the one that
  fails. No other rule is violated.
- **[EDGE]** `[VERIFIED]` The relocation cannot skip a frame that previously cued — there is **no
  statement-level `return`** between the old site and `loseShield`; the only `return`s in
  `sim.ts:996-1130` are inside `.map`/`.filter` callbacks (`:1113-1120`). Both inputs are `const`
  and bound once (`scrollSpeed` :983, `lives` :1123), so no later path can move them.
- **[EDGE]** `[VERIFIED]` The one-shot property survives. The crossing still compares the frame's
  own start/end speed pair (`:1146-1147`), `surfaceScrollSpeed: scrollSpeed` is returned
  unconditionally at `:1179` — so a silenced cue is lost, not deferred — and `enterPhase` reseeds
  `surfaceScrollSpeed: SURFACE_SEED_SPEED` at `:1879`, so a *new* surface correctly re-arms it.
  Mutation M2 (dropping the `was below` clause) is caught by the pre-existing traversal test.
- **[SILENT]** `[VERIFIED]` Nothing is swallowed. The gate has no `else`, logs nothing, and
  discards no error; the suppressed cue is the specified behaviour, and its absence is asserted
  positively by two tests rather than being an untested silent path.
- **[TYPE]** `[VERIFIED]` `lives > 0` is the correct predicate, not a proxy. `loseShield`
  (`:1710-1718`) returns either the unchanged count or `Math.max(0, lives - 1)`, and the stepper
  derives `gameOver: lives <= 0` / `mode: lives <= 0 ? 'gameover'` from that same value at
  `:1178-1179` — so `lives > 0` and `!gameOver` are the same condition here, and `lives` cannot be
  0 for any reason other than dying. No new type, cast, or widening is introduced.
- **[SEC]** `[VERIFIED]` No security surface. The core is a pure offline simulation with no I/O,
  no network, no storage, no user-supplied strings and no auth; the diff adds one boolean clause.
  The only externally-reachable data are audit JSONs, and those changed only in `"line"` fields.
- **[SIMPLE]** `[VERIFIED]` Minimal. One block relocated, one `&&` clause added, nothing
  abstracted, no helper invented, no adjacent refactor. The 2-line breadcrumb left at the old site
  is justified: the crossing is *detected* from a value computed there and *emitted* 150 lines
  away, and without a pointer the next reader has no reason to look down. One redundant
  `as GameEvent[]` cast noted under Rule #1 as [LOW] — matches the file's existing idiom, no change
  requested.
- **[TEST]** `[VERIFIED]` The five pass-on-arrival guards are mutation-proved, not assumed:
  deleting the cue push reddens all four "still cues" cases; disabling the gameover branch reddens
  the reachability case and nothing else new. No fixture's value is its own expectation. Both
  surface damage sources (terrain crash, turret bolt) are exercised — a grep for `damage++` in
  `stepSurface` finds exactly those two, so the death paths are covered exhaustively, not
  representatively.
- **[VERIFIED]** **The audit re-anchor altered no evidence.** Parsed both revisions of all 7
  finding files and diffed every leaf: 15 values changed, the changed field name set is exactly
  `{'line'}`, and the JSON structure is identical. Re-pointing a line number is legitimate;
  rewriting a `verbatim` quote would have been falsification, and none occurred.

### Preflight substitution — the six mechanical checks, re-run

| Check | Result |
|-------|--------|
| `npx vitest run --project star-wars` | **196 files / 2102 tests, all passed** (baseline was 2095; TEA added 7) |
| `npm run lint` (`tsc --noEmit`, repo-wide) | clean, no output |
| `npm run test:orchestrator` | **359 passed, 0 failed** |
| `git status --short` | one entry, `sprint/epic-sw8.yaml` — the expected `in_progress → in_review` stamp from `complete-phase`, not leftover work. No stray scratch files; the mutation probes were run from the scratchpad and `sim.ts` was restored byte-for-byte. |
| Debug residue in the story diff | none — no `console.log`, `debugger`, `.only`, `.skip`, `TODO`, or `FIXME` added |
| Citation gate | **12 passed, 0 skipped.** The source side genuinely ran: `/Users/slabgorb/Projects/star-wars-1983-source-text` exists, so the silent-skip hazard in `plugins/star-wars/CLAUDE.md` did not fire. |

### Data flow traced

A frame's `dt` enters `stepGame`, which returns early at `:185` if the run is already over — so a
dead frame never reaches `stepSurface` at all, and the only reachable case is a death resolving
*this* frame. Inside the stepper `dt` drives `scrollSpeed` (`:983`), which is compared against the
frame-start speed to detect the PMREB crossing; independently, altitude and turret bolts accumulate
`damage`, which `loseShield` folds into at most one lost shield per S-016 window (`:1122`). Those
two independent results meet at `:1145`, and only if the pilot survived does a `tune` event reach
`events`. The shell then plays it on the shared `pm` channel (`main.ts:242`). Safe because the
decision point is downstream of *both* producers, which is precisely what was wrong before.

### Pattern observed

The good pattern is `sim.ts:662` — the sw8-13 space gate, which sits below its `loseShield` at
`:633` and needed no relocation. This fix makes the surface match it, so the two death gates are
now structurally identical and a reader can compare them directly. The bad pattern it replaces —
computing a transition beside one of its inputs rather than below all of them — is catalogued as
lang-review #14 and is exactly what the trench still does (see the Dev finding).

### Error handling

There is no error path to handle: the core is total, the gate is a boolean over two numbers, and
`loseShield` already clamps at zero (`Math.max(0, lives - 1)`, `:1718`) so a negative shield count
is unrepresentable. NaN was considered — a NaN yoke is neutralised upstream at `:962` before it can
reach `altitude`, and NaN cannot reach `scrollSpeed`, which derives from `SURFACE_ACCEL * dt` and a
clamped `Math.min`. A NaN `dt` would make the crossing comparison false and silently drop the cue,
but that is pre-existing, out of this story's scope, and already fenced by the `:962` reset.

### Devil's Advocate

Let me argue this change is broken. The strongest case is the one I spent the longest on: **the fix
silently changed the order of events within a frame.** The cue used to be the first thing pushed
after the scroll advanced; it is now pushed after the terrain-crash, enemy-fire, enemy-death and
player-death SFX and after `pushFarewell`'s three speech lines. The shell's audio model makes this
genuinely dangerous rather than cosmetic — `audio.ts:98-140` documents that *every* PM entry, music
and tune alike, claims POKEY voices 1-4 through an unconditional clear with no resume, so within one
frame the last `pm` claimant wins and everything earlier is cut off. If any event now preceding the
cue routed to `pm`, this fix would have converted a too-loud bug into a too-quiet one, and the tests
— which only count `tune` events in the core, never channel arbitration in the shell — could not
see it. That is a real hole in the test strategy, not a hypothetical.

It survives, and only by measurement: every one of those events dispatches to `audio.play(...)` or
`audio.speak(...)` in `main.ts:155-250`, never `playTune`/`startLoop`, so none touches `pm`. The cue
keeps its position relative to `tower-bonus` (`:1149` before `:1162`). The one remaining `pm`
competitor, `enterPhase`'s `music` push at `:1784`, still lands after the whole stepper because
`progress()` runs on `stepSurface`'s output — so a surface that clears on the crossing frame still
correctly ends with trench music ringing, not a stale tune. And the only two core consumers that
inspect `events` (`:1273`, `:1735`) are order-independent `.some()` existence checks that never look
at tunes.

A confused maintainer is the likelier casualty, which is what R1-1 is about: they will read "the
bolt's hit-test is AFTER the push at :997", open `:997`, find maze code, and reasonably conclude the
test rests on a stale premise and can go — deleting the guard for the harder of the two death paths.
That is a slow-acting correctness risk carried by a comment, and it is why I am not waving it
through. What I could *not* find was a way to make the shipped behaviour wrong: I tried a huge `dt`
(the crossing is a one-way monotonic comparison, so it still fires exactly once), a hand-built state
with `lives: 0` and `gameOver: false` (unreachable in play — the stepper derives both from the same
value), a second surface phase (correctly re-armed by the `:1879` reseed), and deleting the gate
clause (restores the exact RED state, so it is load-bearing).

**Handoff:** Back to Dev for fixes.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No | error — spawned, chased twice, never replied | none returned | N/A — domain re-run by Reviewer, results below |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A — Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A — Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A — Disabled via settings |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A — Disabled via settings |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A — Disabled via settings |
| 9 | reviewer-rule-checker | No | error — spawned, chased twice, never replied | none returned | N/A — domain covered by Reviewer's own rule-by-rule pass |

**All received:** Yes (7 pre-filled as disabled; 2 enabled specialists errored with no response — recorded as errors, not skips, and their domains audited by the Reviewer directly per the completion gate's "errors are not skips" rule)
**Total findings:** 1 confirmed, 0 dismissed, 0 deferred

Preflight's six mechanical checks, re-run by the Reviewer with output quoted in the assessment
below. The rule-checker's domain was covered by the `### Rule Compliance` enumeration. Both
substitutions are weaker than an independent read, and finding R1-2 records that.

## Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (#1-#18), plus the core/shell boundary
from `plugins/star-wars/CLAUDE.md`. The diff is `sim.ts` (one block moved + one clause + comments),
one test file, and seven audit JSONs.

| # | Rule | Applies | Verdict |
|---|------|---------|---------|
| 1 | Type-safety escapes | Yes | **Pass with a note.** No `as any`, `as unknown as`, `@ts-ignore`, or non-null assertion added. One redundant `as GameEvent[]` at test :315 — `GameState.events` is already `GameEvent[]` (`state.ts:1209`), so it is a no-op — but it copies the file's established idiom at :81 and :260. Left alone deliberately: removing only the new one would make the file inconsistent. |
| 2 | Generic/interface pitfalls | No | No generics, `Record<string,any>`, or parameter types introduced. |
| 3 | Enum anti-patterns | No | No enums. `TuneName` is already a string-literal union (`events.ts:266`), which is what this rule asks for. |
| 4 | Null/undefined handling | Yes | **Pass.** No `\|\|`/`??` introduced. The new predicate is a numeric comparison on `lives`, which `loseShield` guarantees is a number (`Math.max(0, …)`, `sim.ts:1718`). |
| 5 | Module/declaration | Yes | **Pass.** Test imports added to an existing `from '../../src/core/state'` group; `surfaceShip` added to the existing `sim` import. No new relative-extension risk. |
| 6 | React/JSX | No | No `.tsx` in the diff. |
| 7 | Async/Promise | No | Nothing async; the core is synchronous by design. |
| 8 | Test quality | Yes | **Pass.** Covered in detail under #15/#18. |
| 9 | Build/config | No | No config touched. |
| 10 | Type-level input validation | No | No external input; the core takes `dt` and a seeded RNG only. |
| 11 | Error handling | No | No `catch` anywhere in the diff. |
| 12 | Performance/bundle | No | One `&&` clause on an existing per-frame branch — no new allocation or iteration. |
| 13 | Fix-introduced regressions | Yes | **Pass.** Re-scanned the fix diff against #1-#12 and #14-#18: it adds no cast, no `\|\|`, no suppression. |
| 14 | Derived EDGES computed inside one branch | Yes | **Pass — this rule IS the story.** The crossing is a transition (`was < T && now >= T`) that was being taken before one of its inputs existed. It is now taken where both are final: `scrollSpeed` is `const` at `sim.ts:983`, `lives` is `const` at `:1123`, neither is reassigned anywhere in `stepSurface`, and no statement-level `return` sits between them. |
| 15 | Source-text assertions matching a token | Partial | **Pass.** No grep-over-source assertions were added. The rule's universal clause ("every guard must be mutation-tested") is satisfied: deleting the cue push reddens all four "still cues" guards; disabling the gameover branch at `:185` reddens the reachability guard and nothing else new; deleting `lives > 0 &&` restores the exact 2-failed RED state. |
| 16 | Accessible names | No | No DOM, no `aria-*`. Core is pure. |
| 17 | Comments asserting a mechanism nobody re-ran | Yes | **FAIL — finding R1-1.** Three `sim.ts` citations in the test file's comments point at the wrong code. Detail in the assessment. |
| 18 | Test apparatus that fails by PASSING | Yes | **Pass.** No fixture's value is also its expectation — `atCrossing` seeds `THRESHOLD - 1` and the assertions are on the *integrated* result, so a zero `SURFACE_ACCEL` would fail them. `finishCues` is a plain filter, reimplements no platform algorithm, and is unique in the suite (the space file's helper is named `spaceCues`). |
| — | Core/shell boundary (`plugins/star-wars/CLAUDE.md`) | Yes | **Pass.** The moved block imports nothing new, touches no DOM/`window`/`document`, and calls no `Date.now()`/`performance.now()`/`Math.random()`/`requestAnimationFrame`. It reads only `state`, the frame's `dt`-derived `scrollSpeed`, and `lives`. Determinism is preserved: `npx vitest run --project star-wars` is reproducibly green. |

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): The epic description's "Same class, same fix shape as sw8-13's
  `if (lives > 0)` gate" is actively misleading and cost SM a measurement to refute; TEA then
  compiled it to confirm. Affects `sprint/epic-sw8.yaml` (the sw8-21 description — the phrase
  should say the gate must be re-ordered below the shield resolution, not wrapped around the cue
  push). SM already fronted `sprint/context/context-story-sw8-21.md` with a correction, so the
  context is safe; the epic YAML still carries the original wording for whoever greps it next.
  *Found by TEA during test design.*

- **Improvement** (non-blocking): The two `sim.ts` line cites in the epic description are off by
  one (`:995-997` for a block at `:996-998`, `:1126` for a call at `:1127`) and will drift further
  the moment this story's fix re-orders that region. Affects `sprint/epic-sw8.yaml` (the sw8-21
  description). Worth noting that the same drift will hit this story's own ACs and the new test
  file's header comment once Dev moves the push — whoever lands GREEN should re-read the cites in
  `tests/core/surface-traversal-end.test.ts` rather than assuming they still point at the code they
  name. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): **The TRENCH is the third member of this family and still has the bug.**
  The ROM's `PHEBS` ("VIEW BASE TRENCH", `WSMAIN.MAC:1839`) carries the same death exit —
  `LDA S.GAS` / `LBMI PHIB0D ;J EXIT WHEN PLAYER DIES` at `:1842-1843` — and it sits ABOVE that
  phase's whole `PH.TIM` cue walk, which includes `JSR PMRRP ;THEN DO REBEL REPEAT THEME` (`:1865`)
  and `JSR SPKTRU ;LUKE, TRUST ME` (`:1874`). Ours pushes the trench voice cues at
  `plugins/star-wars/src/core/sim.ts:1250`, and `stepTrench`'s first shield resolution is
  `loseShield` at `:1421` — 171 lines later, with no lives gate. So a trench voice line still
  starts over the player's death on the frame a cue crossing and a fatal hit coincide, exactly as
  the surface cue did before this story. Affects `plugins/star-wars/src/core/sim.ts` (the
  `TRENCH_VOICE_CUES` loop at :1247-1252 needs the same re-ordering below :1421-1422 that this
  story applied to the surface). Space was sw8-13, surface is sw8-21, trench is unfiled — this
  completes the sweep that produced both. Not fixed here: this story's ACs and tests are
  surface-only, and the trench has a second shield resolution at `:1571` (the port hit) that needs
  its own ruling about which cues each one gates. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): **Both enabled review specialists failed to return anything.**
  `reviewer-rule-checker` and `reviewer-preflight` were spawned with full briefs, then chased twice
  each over ~6 minutes; neither replied. The other seven specialists are disabled in
  `workflow.reviewer_subagents`, so review round 1 ran with **zero independent input** — and this
  story had one session write the tests, the implementation, the specialist briefs AND the review,
  which is exactly the configuration the `rule-checker finds what Dev==Reviewer miss` lesson warns
  about. I re-ran every preflight check myself and recorded the results, but self-audit is a weaker
  instrument and the round should be read with that discount. Affects the review tooling, not this
  story's code (nothing to change here; recorded so the weakness is visible in the archive).
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): This edit shifted lines in a citation-audited source file, so
  `tools/audit/reanchor-citations.mjs --write` moved 15 `ours` citations across 7 finding files
  (81 already correct, 0 lost). The diff was verified to change only `"line"` numbers — no
  `verbatim` evidence text was touched. Affects `plugins/star-wars/docs/audit/findings/*.json`
  (nothing to change; recorded so the Reviewer can see 7 audit files in the diff and know why).
  *Found by Dev during implementation.*

## Design Deviations

None recorded at setup.

### TEA (test design)

- **AC2's named template file is used as a template, not as the test's home**
  - Spec source: context-story-sw8-21.md, AC2
  - Spec text: "A test case documents the death-frame surface finishGround silence, following the sw8-13 template from space-music-milestones.test.ts (:348-358)"
  - Implementation: the sw8-13 block was followed as the structural template (same describe shape, same control/boundary pairing), but the tests were appended to `tests/core/surface-traversal-end.test.ts`, which already owns the finishGround cue, rather than to the space milestones file.
  - Rationale: SM flagged the home as TEA's call and recommended this file. It keeps the new death-frame block adjacent to `cues exactly one finishGround tune during the surface traversal` (:226) — the guard AC4 names — so the pair reads together, and it keeps a surface behaviour out of a file whose every other test is space.
  - Severity: minor
  - Forward impact: none. AC2's citation still points at the correct template; only the destination differs.

- **Two tests were added beyond the four ACs, to refute near-miss implementations**
  - Spec source: context-story-sw8-21.md, AC3
  - Spec text: "The finishGround cue push is decided against the lives remaining AFTER the frame's shield resolution (`sim.ts:1127-1128`), not before it"
  - Implementation: added a turret-bolt death case (damage lands BELOW the cue site) and an S-016 dropped-hit case (damage lands but no death), neither named by any AC.
  - Rationale: AC3 states the required ordering, but a fix reading the local `damage` counter at the cue site — which the terrain crash populates before the push — would satisfy the terrain-crash test alone. These two make the AC's "AFTER the shield resolution" clause enforceable rather than aspirational.
  - Severity: minor
  - Forward impact: none. Both are additive; they constrain Dev toward the ordering AC3 already requires.

### Dev (implementation)
- No deviations from spec.

### Reviewer (audit)

- **TEA's "AC2's named template file is used as a template, not as the test's home"** → ✓ ACCEPTED
  by Reviewer: AC2 cites the sw8-13 block as the *template*, and the block was followed faithfully
  (same describe shape, same control/boundary pairing). Placing a surface behaviour in
  `surface-traversal-end.test.ts` beside the finishGround guard AC4 names is better than putting it
  in a file whose every other test is space. SM flagged the home as TEA's call in the setup
  assessment, so this is a ruled decision, not a drift.

- **TEA's "Two tests were added beyond the four ACs, to refute near-miss implementations"** →
  ✓ ACCEPTED by Reviewer: both additions are load-bearing and I verified their premises hold. The
  turret-bolt test's damage genuinely lands at `sim.ts:1113-1116`, and the S-016 test's drop path is
  real (`loseShield`, `sim.ts:1710-1718`, returns lives unchanged inside the window). Without them
  AC3's "AFTER the frame's shield resolution" clause would be satisfiable by two wrong fixes.

- **Dev's "No deviations from spec"** → ✓ ACCEPTED by Reviewer, with one qualification: the
  implementation matches AC3 exactly and invents nothing. But "no deviations" was recorded while a
  TEA Delivery Finding explicitly asked the GREEN phase to re-read the test file's line citations
  after the move, and that was not done. That is not a spec deviation — it is an unactioned handoff
  instruction — so the entry stands, and the omission is carried as finding R1-1 instead.

- **UNDOCUMENTED (added by Reviewer):** none. Every difference between the ACs and the shipped code
  is either logged above or is the code doing what AC3 asks.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->