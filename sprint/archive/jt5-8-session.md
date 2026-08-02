# Session: jt5-8

## Story Details

- **Story:** jt5-8 — The DUMB brain's wingbeat — linet recomputes every wake, and LNTOFP's forced glide is missing
- **Jira:** jt5-8
- **Epic:** jt5 — Joust audio — the sound subsystem joust shipped without
- **Points:** 5 · **Priority:** p3
- **Repos:** arcade
- **Workflow:** tdd
- **Branch:** none
- **Branch Strategy:** trunk-based — work lands on `main`. `feat/jt5-8-dumb-brain-wingbeat` is a
  zero-commit visibility beacon for sibling checkouts, never a merge target.
- **Context:** `sprint/context/context-story-jt5-8.md`
- **Started:** 2026-08-02

## Workflow Tracking

- **Workflow:** tdd
- **Phase:** finish
- **Phase Owner:** dev

---

## SM Assessment (setup)

### Board probes — clear

- `git fetch --prune origin`, then a remote-branch grep for `jt5`: **no branch existed**. The only
  fresh remote branch was `feat/sw8-23-harden-comment-citation-guard`.
- Sibling session sweep across `/Users/slabgorb/Projects/a-*/.session/`: exactly one live session,
  `a-2/sw8-23-session.md` (star-wars). The glob returned a real path rather than a shell error, so
  this probe genuinely ran — per the standing note that `zsh: no matches found` reads identically
  to a clean board.
- No sibling contention: sw8-23 is star-wars audit tooling and touches nothing in `plugins/joust/`.

### The description was measured before anything was written — and it was mostly TRUE

This story arrived already re-scoped once (uf1-9's finish, 2026-08-02), so per the standing rule
its claims were re-measured rather than copied forward.

**ROM citations — all six verified line-exact.** `LNTUP :3746-3748` and `LNTOFP :3759-3762` quote
their instructions verbatim; so do the four "already shipped by uf1-9" anchors (`BRA BOUP1A :3853`,
`BRA B2UP2D :4037`, `LDA #2` at `:3823` and `:4008`). This matches the recorded asymmetry that
vendored ROM source is immutable and its citations do not rot, while in-repo ones do.

**In-repo claims about the dumb brain — all TRUE.** `linet()` is pure and latches nothing
(`enemy.ts:358-363`); `withWingCadence` explicitly clears the workspace for a linet enemy
(`enemy.ts:1227`, with the `:1040` comment saying so in prose); the port has neither half of the
alternation.

**The uf1-9 history claim — TRUE.** 21 pins re-baselined, two changed seed
(`sprint/archive/uf1-9-session.md:945-948`).

### Two claims were FALSE, and both were about the player side

1. **The title's "flapHeld still takes the press edge".** False. `shell/input.ts:44` computes
   `flapHeld = held.has(binding.flap)` — the LEVEL — and `flap` as its rising edge on the next
   line. That split has been there since jt1-6 and predates the monorepo import.
2. **The description's "frame.ts's player path still builds its own input".** False. `frame.ts:315`
   *receives* the input (`inputs?.[p.id] ?? NEUTRAL_INPUT`); it builds nothing. The only producers
   of a non-neutral `PlayerInput` anywhere in joust are `shell/input.ts:45` (human) and
   `enemy.ts:1162` (enemy, which uf1-9 fixed). `demo.ts:325` is another `NEUTRAL_INPUT` fallback,
   and joust has no autopilot — the `attract` references in `game.ts` are a GOVER mode flag, not an
   input driver.

The player half was additionally checked against the machine and against the suite:

- ROM `P2SAM`/`P2NJMP` `:7256-7264` builds `CURJOY` as A=direction : B=**raw button level**
  (`IS JUMP BUTTON PRESSED` / `INCB`) — so modelling `flapHeld` as a level is the faithful choice.
- The core spends the two fields correctly: `flight.ts:292` selects gravity from `flapHeld`,
  `flight.ts:258` gates the `ADDFLP` impulse on `flap`.
- It is **guarded**, at `tests/shell-input.test.ts:74-91`, under a heading that states the law
  ("flap is an EDGE, not a level").

**And the guard is non-vacuous — mutation-proven, not assumed.** Rather than reporting "a test
exists", the old title's claim was applied to the source verbatim as a mutant
(`flapHeld: flapHeld && !prevFlap`) and the suite re-run: **2 tests failed**. Source restored and
`git status --short` verified empty both before and after, with the anchor asserted unique before
the write.

So the player deliverable is **closed**, not descoped-by-assertion. The description had actually
posed this as an open question ("or is already correct by a different route") — that was the right
way to file it, and the answer is yes.

### The disposition was the user's, and it was put to them with the census attached

Two deliverables, one measurably complete, and a title asserting the refuted half. Per the standing
practice the backlog-shape question went to the user with the measurement already done, the options
pruned to the ones actually available, and a recommendation first. **Ruling: re-scope + retitle,
points held at 5.**

Applied to the board in one surgical write (`sprint/epic-jt5.yaml` only, +21/-2, every shard
re-parsed afterwards, no story in the epic carrying a wrong `repos` value):

- **Title** rewritten to name only the surviving deliverable.
- **Description** rewritten with an ALREADY-SHIPPED-BY-uf1-9 block, a CLOSED-AT-SETUP block for the
  player side carrying the citations and the mutation result, and the surviving scope.
- **Seven ACs derived** — the story carried `acceptance_criteria: null`, so these are SM-derived
  and are TEA's primary input. AC7 fences the closed player work and requires its guard to stay
  non-vacuous, so the closure cannot silently rot.

Points held at 5 on the reasoning that the removed half was a "check whether" item worth ~0 of the
estimate, while the surviving half carries the expensive re-baseline.

### Handed to TEA as claims to verify, not as facts

- **The blast radius is predicted, not measured.** uf1-9 moved 21 pins changing the SMART brains;
  its own R1-7 measurement (three seeds, 6000 frames of real `createGame` + `stepGame`) found only
  `linet` and `boundr` ever appear end-to-end. That makes a *larger* radius likely here, since
  `linet` is the more exercised brain — but "larger" is an inference, not a number. Measure it.
- **The audio consequence is reasoned, not measured.** The wing cue derives from the `flapHeld`
  transition (`enemy.ts:1163`), so forcing a glide wake after every dumb flap should change how
  often dumb enemies emit a wing sound. AC6 requires this be measured and stated rather than
  discovered when the audio suite moves. SM did not determine *which* audio tests will move.
- **Where the alternation state should live is deliberately unspecified.** `PjoyState`
  (`enemy.ts:219`) already exists as a three-variant union; whether the dumb wingbeat becomes a
  fourth variant, reuses `wing`, or takes a separate field is Dev's design call. The context says
  so explicitly so nobody reads the pointers as a prescription.

### Baseline, with a timestamp on it

`npx vitest run --project joust --project shared` — **126 files / 2939 tests, all passing**, tree
clean. The `3 citation error(s)` lines on stdout are a test exercising the citation checker's own
failure path, not a failure.

**This number is a claim with a timestamp, and it already moved once during setup.** The first
reading was 125 files / 2913 tests at 09:50; a sibling landed jt5-23 mid-setup (adding 26 tests in
one new file) and the rebase brought it in, so the handoff number was re-measured rather than
carried forward. Two sibling stories are live on `main` right now — sw8-23 (star-wars, RED
committed in `a-2`) and whatever follows jt5-23 — so **attribute any red before treating it as
yours**, and re-measure rather than trusting this line if time has passed. Neither sibling's
surface overlaps `plugins/joust/src/core/`.

### Setup housekeeping

- Story stamped `in_progress` explicitly (never assumed either way — verified from
  `pf sprint story show`, not from a report).
- Claim pushed as two pushes to the one remote: the stamp + context on `main`, and a zero-commit
  beacon branch so a sibling's branch probe lights up. The beacon was pushed via a refspec from
  `main` rather than by checking out, which structurally avoids pushing a stale ref.
- Labelled-token count re-run **after** this assessment was written, not merely after the files
  were created — the phase pointer, the repos field and the branch field must each appear exactly
  once, and this paragraph names them rather than spelling them, because the ceremony's parsers
  match those strings anywhere in the file.
---

## Design Deviations

### TEA (test design)

- **AC7's "these files are untouched" is asserted as BEHAVIOUR, not as a file diff**
  - Spec source: context-story-jt5-8.md, AC7
  - Spec text: "shell/input.ts, main.ts's prevFlap threading and tests/shell-input.test.ts:74-91 are untouched, and the non-vacuity of that guard is preserved (mutating input.ts:45 to flapHeld := flapHeld && !prevFlap must still redden it)"
  - Implementation: `dumb-wingbeat.test.ts` carries its own copy of the jt1-6 level/edge law, exercised through `mapPlayer1`/`mapPlayer2`, plus the frozen player cue counts in AC6. It does not compare those three files against a git ref.
  - Rationale: a file-identity assertion fails on a whitespace or comment change that breaks nothing, and passes on a semantic change made in a fourth file. The law itself is what AC7 protects, and the copy written here is reddened by the exact mutation AC7 names — so the non-vacuity requirement is met HERE rather than by pointing at another file's line numbers, which is also what stops it rotting the next time that file grows.
  - Severity: minor
  - Forward impact: Reviewer should read AC7 as "the law still holds and the player's cue count is unmoved", and check the three files' diffs by eye rather than expecting a test to do it.

- **AC5's re-baseline is pinned on ONE measured fixture, not on an inventory of all 20 moved assertions**
  - Spec source: context-story-jt5-8.md, AC5
  - Spec text: "the bound is stated explicitly — which digests moved, which did not"
  - Implementation: one frozen fixture (seed 0x2468 / 400 frames), chosen because its blast radius is a single row, asserting that the one enemy row moves while both players and the other enemy stay byte-identical. The other 19 moved assertions live in four sibling files and are Dev's to re-find and state.
  - Rationale: an inventory test naming all 20 would be an implementation transcript of the sibling suites and would redden every time one of them is legitimately edited. A single fixture that proves the change bites AND bounds it in the same assertion is the durable form; the full inventory belongs in Dev's assessment, which AC5 already requires.
  - Severity: minor
  - Forward impact: Dev must still state the full inventory in prose. A green suite here does NOT mean the re-baseline was done correctly — only that it was done at all.

### Dev (implementation)

- **The alternation state is a fourth `PjoyState` variant, and `linet()` was left pure**
  - Spec source: context-story-jt5-8.md, "Technical approach — measured pointers, not design"
  - Spec text: "Whether the dumb wingbeat is a fourth variant, a reuse of `wing`, or a separate
    field is **Dev's call** — this story does not prescribe it."
  - Implementation: a fourth variant `{ kind: 'glide' }` on `PjoyState`, carrying NO `timer`,
    written and read only by a new `dumbWingbeat(enemy, decision)` that sits between `runBrain`
    and the joystick build in `stepEnemyDetailed`. `linet()` is untouched.
  - Rationale: `pjoy` models `PJOY,U`, and `PJOY,U` is literally where `LNTUP` stores `#LNTOFP`
    and where `LNTSMT` stores the smart routine — one cell, so one field. The override could not
    go inside `linet()` because AC2's whole content is that the glide wake does not RUN the lane
    decision; the suite asserts `linet(glider).flap === true` as a precondition, so a `linet()`
    that consulted the state would fail the test that exists to prove the mechanism.
  - Severity: minor
  - Forward impact: `PjoyState` is now a 4-variant union and one variant has no `timer` — any new
    consumer that reads `.timer` off a bare `pjoy` must narrow first (`shadowDwellWake` needed
    exactly that, and tsc found it).

- **`promote()` clears `pjoy`, and it is belt-and-braces rather than load-bearing**
  - Spec source: context-story-jt5-8.md, AC3
  - Spec text: "LNTSMT (:3764-3775) overwrites PJOY,U wholesale with the smart routine, so a
    newly-promoted enemy begins its smart cadence carrying no leftover glide obligation."
  - Implementation: `promote()` returns `pjoy: undefined`, modelling `STX PJOY,U` (:3774).
  - Rationale: MEASURED — deleting that clear leaves all 34 tests green, because a freshly
    promoted enemy carries no `seek`, so its first smart wake always reaches `seekWake`'s decide
    and every route there rewrites `pjoy`. Kept anyway: AC3's cited mechanism IS this store, and
    writing it at the promotion site makes the contract local rather than a property of a
    function three calls away. Recorded as measured-redundant rather than left to read as the
    thing that makes AC3 true.
  - Severity: minor
  - Forward impact: TEA's M3 mutant ("the obligation stored in its own field, so promotion leaks
    it") does NOT bite on this design — see the Delivery Finding below. A reviewer checking AC3's
    fence for non-vacuity should read that finding first.

- **AC5's re-baseline moved one pin's SEED and one pin's ANCHOR, not only their values**
  - Spec source: context-story-jt5-8.md, AC5
  - Spec text: "every moved pin is re-found by sweeping for its own precondition, NEVER by
    nudging a number toward the new output"
  - Implementation: 20 assertions re-found by sweeping. Two could not be re-found in place —
    `audio-thud.test.ts`'s person-thud (empty solution set on all four seeds the file uses →
    moved to seed 0x2332) and its 0x2468 post-contact anchor (the contact it is defined as
    following moved PAST it, 611 → 746 → anchor 620 → 755).
  - Rationale: AC5 anticipates the seed case explicitly. The anchor case is the same defect in a
    different dress: frame 620 would have gone on PASSING while asserting the reverse of its own
    name, which is worse than a red.
  - Severity: minor
  - Forward impact: `audio-thud.test.ts` now uses a fifth seed (0x2332). Its
    `the digest is DISCRIMINATING` control still compares 0xbeef against 0x2468 and is unaffected.

### Reviewer (audit)

All five logged deviations are **ACCEPTED**. Each was checked against the thing it claims, not
against its own rationale.

- **TEA — AC7's "these files are untouched" asserted as BEHAVIOUR, not a file diff** → ✓ ACCEPTED
  by Reviewer. The reasoning is right (a file-identity assertion fails on whitespace and passes on
  a semantic change made elsewhere), and TEA's forward-impact instruction was carried out rather
  than taken on trust: the three protected paths appear in **neither** jt5-8 commit
  (`git show --name-only` on `1b897d2` and `5318520` lists exactly seven files, none of them
  `shell/input.ts`, `main.ts` or `shell-input.test.ts`; their last-touching commits are `2376a81`
  and `45267f9`, both pre-dating this story). The mutation AC7 names was re-applied to the shipped
  tree — `flapHeld := flapHeld && !prevFlap` at `input.ts:45` — and reddened **exactly 4 tests, 2
  in `shell-input.test.ts` and 2 in this story's local copy**, the number Dev claimed. Source
  restored by copy and md5-verified identical (`4b4ca971…`).

- **TEA — AC5's re-baseline pinned on ONE measured fixture, not an inventory of 20** → ✓ ACCEPTED
  by Reviewer. An inventory test would be a transcript of four sibling suites and would redden on
  every legitimate edit to them. The condition TEA attached — that Dev state the full inventory in
  prose — was met (the 13-row table in the Dev Assessment), and the prose was spot-checked against
  the machine rather than read: see the Rule Compliance section, where three of its first-contact
  claims were re-swept independently and all three came back exact.

- **Dev — the alternation is a fourth `PjoyState` variant, and `linet()` was left pure** → ✓
  ACCEPTED by Reviewer. The design argument is not merely plausible, it is forced: AC2's test
  asserts `linet(glider).flap === true` as a *precondition* before asserting the wake glides, so a
  `linet()` that consulted the state would fail the very test that proves the mechanism. The
  variant's blast radius was enumerated rather than sampled — every `pjoy` read in
  `plugins/joust/src/` (13 sites) narrows on `.kind` before touching `.timer`, there is no
  `switch`/`never` exhaustiveness check anywhere that a fourth variant could silently bypass, and
  `tsc --noEmit` is clean. The forward-impact note about `.timer` narrowing is accurate and is
  discharged at `enemy.ts:1280`.

- **Dev — `promote()` clears `pjoy`, and it is belt-and-braces rather than load-bearing** → ✓
  ACCEPTED by Reviewer, and the honesty is the reason. Dev's claim that the clear is untestable was
  independently re-run, not taken on trust: deleting `pjoy: undefined` from `promote()` leaves
  **all 2463 joust tests green**, not merely the 34 in this story's files. Keeping the clear is
  right — it models `STX PJOY,U` (:3774) and makes promotion's contract local — but the test gap it
  implies is recorded as a finding below rather than left inside an accepted deviation.

- **Dev — AC5's re-baseline moved one pin's SEED and one pin's ANCHOR, not only their values** → ✓
  ACCEPTED by Reviewer. The anchor move is the more important of the two and it is correct: seed
  0x2468's first non-killing contact is now frame **746** (re-swept independently), which is past
  the old frame-620 anchor, so a test named "AFTER it" would have gone on passing while sitting
  strictly *before* the contact. Moving it to 755 (contact + 9, the offset jt5-4 and uf1-8 both
  used) is the right repair. The seed move is accepted in kind; one quantitative claim inside its
  comment is wrong and is filed as a LOW finding below — that does not affect the chosen seed,
  which is valid.

**No undocumented deviation found.** The one behavioural divergence this review turned up (the
promotion check a glide wake should not reach) is not a departure from the spec — the spec does not
cover it — so it is filed as a Delivery Finding and a follow-up story, not as an unlogged deviation.

## Delivery Findings

### TEA (test design)

- **Conflict** (non-blocking): `tests/audio-flap.test.ts:606` stages a dumb buzzard at `timeUp 1`
  and its comment reads the resulting one-wake wingbeat as "exactly LINET's LNTUP -> LNTOFP one-shot
  in the ROM" — a mechanism the port does not have. The observed alternation there comes from the
  flap impulse (a full −96 at low `timeUp` leaves the bird rising, so the LANE decision declines on
  its own), not from any latch. Affects `plugins/joust/tests/audio-flap.test.ts` (the comment
  attributes shipped behaviour to an absent mechanism; landing this story makes it true, so the fix
  is to say WHICH story added it). *Found by TEA during test design.*

- **Conflict** (non-blocking): `tests/audio-flap.test.ts:548-551` states that uf1-9's latch means
  "LINET holds B for exactly one wake (LNTUP -> LNTOFP)". uf1-9 built the held/pressed split for the
  SMART brains and explicitly denied linet a workspace (`enemy.ts:1227`), so as a claim about the
  port this is false today. Affects `plugins/joust/tests/audio-flap.test.ts`. Same resolution as
  above — this story is what makes the sentence true. *Found by TEA during test design.*

- **Gap** (blocking for AC6): `tests/audio-flap.test.ts:636` ("wings HELD across many wakes sound
  ONCE — the edge, never the level") is staged on a dumb buzzard at `timeUp 255`, which is precisely
  the state LNTOFP makes unreachable — a dumb bird will no longer be able to hold its wings down
  across wakes at all. The LAW is not repealed, only its actor. Affects
  `plugins/joust/tests/audio-flap.test.ts` (re-baselining this test to the new alternating stream
  would silently delete jt5-3's machine-gun guard; it must be re-staged on an actor that can still
  hold, or retired only because `dumb-wingbeat.test.ts` now carries it on the knight and on a smart
  bird). Marked blocking because the failure mode is a guard vanishing while the suite stays green.
  *Found by TEA during test design.*

- **Gap** (non-blocking): the same file's `a frame the buzzard does not WAKE on is silent` asserts
  silence for frame indices `[0, 1, 3, 4, 5]` under the message "frame N is not this buzzard's
  wake", but its own preceding precondition asserts the wake pattern is
  `[true, false, true, false, true, false]` — so indices 0 and 4 ARE wakes and are riding along
  under a false label. Index 4 is the one this story moves. Affects
  `plugins/joust/tests/audio-flap.test.ts` (the per-frame-vs-per-wake law is genuinely carried only
  by indices 1, 3 and 5; the other two should be asserted for what they actually are).
  *Found by TEA during test design.*

- **Gap** (non-blocking): the ROM's LINET has a SECOND entry into the flapping wake that the port
  does not model at all — the lava-troll looker, `DEC PLAVT,U / BGT / LDA LNTLAV / STA PLAVT,U /
  LDX PPREV / LDA PID,X / CMPA #LAVID / BEQ LNTUP` (JOUSTRV4.SRC:3725-3732): every `LNTLAV` wakes,
  a dumb bird with a lava troll immediately behind it in the process list flaps regardless of its
  lane. Affects `plugins/joust/src/core/enemy.ts` (`linet` implements only the lane decision at
  :3733-3757). Out of scope for this story — AC4 fences the lane decision and AC1/AC2 fence the
  alternation, and neither covers this — but it means the story context's "Only the alternation
  state around the decision is missing" is not quite the whole truth. Pinned as an ORACLE test in
  `dumb-wingbeat-source.test.ts` so it cannot be re-discovered from scratch, and worth its own
  story. *Found by TEA during test design.*

- **Improvement** (non-blocking): `docs/rom-study/claims/enemy.json` carries 29 claims about the
  enemy subsystem, including two about LINET's promotion path, and none about the LNTUP/LNTOFP
  wingbeat. Affects `plugins/joust/docs/rom-study/claims/enemy.json` (a claim for the alternation
  would put the mechanism under the live citation gate the epic context describes). Not required by
  any AC of this story. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): AC3's promotion fence does not DISCRIMINATE the design that shipped.
  TEA mutation-proved it against a throwaway that stored the obligation in its own field (M3), and
  it caught that. Re-run against the shipped `PjoyState`-variant design, the equivalent mutant —
  deleting `pjoy: undefined` from `promote()` — leaves all 34 tests GREEN, because `seekWake`
  rewrites `pjoy` on every first smart wake regardless. Affects
  `plugins/joust/tests/dumb-wingbeat.test.ts` (the AC3 group is a true statement about the port
  and a real guard against the field-based design, but on this design it cannot fail; a fence that
  bit here would have to reach into `seekWake`'s rewrite as well). Not a defect in the code — the
  obligation genuinely cannot survive promotion, by two independent routes — but the test should
  not be read as the evidence for that. *Found by Dev during implementation.*

- **Conflict** (non-blocking): `tests/audio-events.test.ts`'s `a quiet frame emits EXACTLY nothing`
  carried the comment "Frame 205 is the frame after the kill at 204" while stepping frame 200 — it
  was wrong about its own subject before this story. It is now accidentally true (the kill moved to
  199, so 200 IS the frame after it) and the comment says so with the history attached. Affects
  `plugins/joust/tests/audio-events.test.ts`. *Found by Dev during implementation.*

- **Improvement** (non-blocking): `audio-thud.test.ts`'s AC7 block asserts its bound in PROSE
  ("player rows and `rng` moving is a REGRESSION") and relies on each re-baseliner honouring it by
  hand — four stories have now done so correctly, but nothing mechanical checks it. A test that
  ran the digest and asserted only the PLAYER rows against a frozen array would make the bound
  enforceable instead of advisory, and would have caught a wrong re-baseline of any of the five
  anchors. Affects `plugins/joust/tests/audio-thud.test.ts`. Not required by any AC of this story.
  *Found by Dev during implementation.*

- **Question** (non-blocking): seed 0x1a2b3c4d now produces NO non-killing contact at all inside
  1300 frames (it had one at 611 before this story), so `audio-events.test.ts`'s
  `seed 0x1a2b3c4d, 240 frames` fingerprint — the one pin in these files this story does not move —
  is pinned on a window whose play has diverged less than the others. It is still a valid
  regression guard and it passed untouched, but the seed's contact-free character is worth knowing
  before someone re-stages a contact test on it. Affects `plugins/joust/tests/audio-thud.test.ts`
  (the first-contact table in the AC7 block, which now records this). *Found by Dev during
  implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): the ROM reaches `LNTSMT` only through `LINET`'s own first three
  instructions (`LDA NSMART / CMPA WSMART / BLO LNTSMT`, JOUSTRV4.SRC:3722-3724), and the scheduler
  dispatches a wake with `JSR [PJOY,U]` (:5830, :5951, :6456). A wake that enters at `LNTOFP`
  (:3759) therefore never executes the promotion check at all — so in the machine a dumb bird
  **cannot promote on its glide wake**. The port promotes at `frame.ts:345` on every enemy wake
  regardless of `pjoy`. Reproduced in real seeded play, not argued: seed 0x2468, frame 2688,
  process 514 promotes to `boundr` while carrying `{kind:'glide'}` (1 of 11 promotions across
  0xbeef/0x2468/0xface at 3000 frames). Affects `plugins/joust/src/core/frame.ts` (the promotion
  gate needs the same `pjoy?.kind === 'glide'` exemption `seekWake` and `withWingCadence` already
  carry) — and note it is determinism-affecting, so fixing it will move the pins this story just
  re-baselined. Out of scope here: no AC covers it, and it is the same shape as the lava-troll
  second entry TEA already fenced out. Worth its own story, alongside that one.
  *Found by Reviewer during code review.*

- **Gap** (non-blocking): `plugins/joust/tests/dumb-wingbeat-source.test.ts:126` and `:155` are
  negative claims with no non-vacuity floor. `:126` iterates `insnsIn(lines, 3759, 3762)` and
  asserts inside the loop, so an empty parse asserts nothing; `:155` filters to `[]` and compares
  against `[]`, which an empty pre-filter list also satisfies. Neither can fire today (the ranges
  parse correctly — hand-verified against the vendored source), and on CI the whole file is skipped
  rather than vacuous. But the failure mode is precisely the one that matters: if `parseInsn`'s
  regex ever stopped matching, both tests would go green at the moment you most want them to
  scream. Affects `plugins/joust/tests/dumb-wingbeat-source.test.ts` (each needs a
  `expect(insns.length).toBeGreaterThan(0)` ahead of its claim). This also makes TEA's
  "**Self-check:** 0 vacuous tests written. Every `toBeGreaterThan(0)`/`toEqual([])` in the suite is
  preceded by a measured floor" false as written — `:155` is a `toEqual([])` without one.
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `plugins/joust/tests/helpers/enemy-contract.ts:250-253` — the
  jt1-3 double-entry contract type still declares `pjoy` as a THREE-variant union and never gained
  `glide`, so TEA's independent declaration now under-represents the production `PjoyState`
  (`enemy.ts:230-244`). Harmless today (no test in the eight consumer files constructs or matches
  `kind: 'glide'` — `grep -rn "'glide'" plugins/joust/tests/` returns nothing), and it follows from
  TEA's deliberate choice to specify the mechanism behaviourally. But the file's whole purpose is to
  mirror the module contract independently, and a future exhaustive `switch` written against it
  would compile clean while missing the glide case. Affects
  `plugins/joust/tests/helpers/enemy-contract.ts`. *Found by Reviewer during code review.*

- **Improvement** (non-blocking): `plugins/joust/tests/audio-flap.test.ts:707-708` uses `entity: e!`
  where `e = buzzardOf(d)?.enemy?.entity` is genuinely `EntityState | undefined`. The precondition
  on the line above, `buzzardStepped(prev, d)`, compares two `?.`-chained values with `!==`
  (`:619-620`) and so is satisfied by `undefined !== realEntity` — it does not establish that `e`
  is defined. If the buzzard ever left the process list mid-loop this throws inside `linet()`
  instead of failing cleanly. Affects `plugins/joust/tests/audio-flap.test.ts` (assert
  `expect(e).toBeDefined()` rather than asserting it away). *Found by Reviewer during code review.*

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a

**Test Files:**
- `plugins/joust/tests/dumb-wingbeat-source.test.ts` — the PROVENANCE half. 14 ORACLE tests that
  re-derive the LNTUP/LNTOFP law out of the vendored 1982 source. All green on arrival, by design.
- `plugins/joust/tests/dumb-wingbeat.test.ts` — the BEHAVIOUR half. 20 tests; 8 RED, 12
  green-on-arrival guards, each labelled in the file as one or the other.

**Tests Written:** 34 tests covering 7 ACs
**Status:** RED (8 failing — ready for Dev)

### The story's central prediction was right, and much bigger than predicted

The context handed over the blast radius as "predicted, not measured — measure it". Measured, on the
shipped tree, before a line of test was written: sampling every DISTINCT dumb-enemy state three
seeded replays actually reach, **seed 0xbeef reaches 1973 flapping dumb wakes and 1889 of them
(96%) would flap again on the very next wake.** The other two seeds agree (835/867 and 955/1001).
The port's dumb birds are not occasionally double-flapping; they are in a permanent wing-down hold.

The dominant real-play shape is not the fast-faller I expected but a bird hovering ONE pixel below
its lane with a nearly-spent impulse — `pixelY=130 target=129 velY=88 timeUp=11` — where the flap
cancels the fall almost exactly and the condition never clears.

### The audio consequence runs the OPPOSITE way to the intuition, and that is the AC6 finding

AC6 asked for the wing-cue change to be measured rather than discovered. It is, and the direction
is the reverse of "halving the flap rate makes it quieter": **a continuous HOLD sounds ONCE however
long it runs** (`wingEdge` is an edge detector), while an alternation sounds on every single flap.
Measured over 2000 frames with the mechanism in place versus without:

| seed | `enemy-wing-down` before → after | `player-wing-down` |
|---|---|---|
| 0xbeef | 105 → 111 | 154 → 154 |
| 0x2468 | 141 → 219 | 154 → 154 |
| 0xface | 69 → 180 | 154 → 154 |

Dumb enemies get **more** audible, by up to 2.6×, and the knight's cue count does not move at all on
any seed — which is the AC7 bound, measured rather than argued.

### The suite blast radius, measured with a throwaway implementation

A throwaway alternation was built and the full suite run against it before any test was written:
**20 assertions in 4 files** — `audio-events.test.ts` (8), `audio-thud.test.ts` (5),
`audio-flap.test.ts` (3), `audio-transporter-split.test.ts` (4). Comparable in count to uf1-9's 21,
but a DIFFERENT SHAPE and Dev should budget for it: where uf1-9 mostly moved digests, most of these
are **staged-moment fixtures** ("seed 0xface, frame 1889 emits player-materialise") whose frame has
moved. Each must be re-found by sweeping for its own precondition — the moment it stages — never by
nudging the frame number until it goes green.

The throwaway was applied, measured and reverted; `plugins/joust/src/core/enemy.ts` is byte-identical
to the tree it started on (md5 verified before and after, tree clean).

### One correction to a claim this story would otherwise inherit

uf1-9's Impact Summary states its determinism bound as "every PLAYER row in every entity digest is
unchanged". **That bound does not survive this story as a universal.** Measured: seed 0x2468 at 400
frames and seed 0x1234 at 300 frames leave both player rows byte-identical, but seed 0xbeef at 400
frames moves `player#1` — by then the knight has met a re-routed buzzard, and a collision is
downstream of everything. The AC5 pin was deliberately staged on 0x2468/400, whose blast radius is a
single row, and the header says why. Dev should state the bound as "unchanged until the knight meets
a moved bird", not as an invariant.

### The fixture that would have made this whole suite pass for the wrong reason

The obvious staging for "must not flap twice" is a buzzard below its lane — and it is a trap. At low
`timeUp` the flap impulse is a full −96, so the bird is RISING on the next wake and the lane decision
declines all by itself: the test passes with the mechanism absent. `audio-flap.test.ts:606` sits
exactly there and its comment already reads that silence as LNTUP/LNTOFP (see Delivery Findings).
The discriminating fixture is `pixelY 0x85, velY 0x200, timeUp 200` — impulse spent to −21 — which
flaps on twelve consecutive wakes today, still sunk and still falling on every one. It is named
`SUNK_AND_SINKING` in the suite and the natural-glide trap is kept beside it as a named control.

Every glide-wake assertion additionally asserts **its own precondition** — that `linet()` still
returns `flap: true` for that state — so suppression can never be confused with the bird having
simply stopped wanting to flap. That is AC2's "unconditional", made observable.

### Rule coverage

`.pennyfarthing/gates/lang-review/typescript.md` checks with a live test in this suite:

| Rule | Test(s) | Status |
|------|---------|--------|
| Vacuous assertions / meaningful expectations | every count and property test carries an explicit non-vacuity floor before its assertion | passing |
| Discriminating fixtures (no test that passes for the wrong reason) | `CONTROL — a SMART brain's wing hold DOES move with the wave` | passing |
| Exhaustive union handling | AC3's promotion fence runs three quarry routes, so no single route's incidental clearing satisfies it | passing |
| Purity / no hidden state | the observable-soundness group pins that nothing but the brain sets a dumb bird's wing level | passing |
| Negative claims are checked, not asserted | the ORACLE "no PJOYT in LINET" and "no compare in LNTOFP" groups | passing |

**Rules checked:** 5 of 5 applicable checks have test coverage
**Self-check:** 0 vacuous tests written. Every `toBeGreaterThan(0)`/`toEqual([])` in the suite is
preceded by a measured floor, and the two `.not.toEqual` assertions (AC2's wave control, AC5's
digest) both carry a stated precondition that the compared runs are non-empty.

### Why 12 tests are green on arrival, and why that is not a botched RED

Three kinds, each labelled in the file:

1. **The observable's own soundness** (2). Everything in the file reads a wake's effective flap out
   of `enemy.prevFlapHeld`. That identity holds only because `steerWake` never turns a dumb bird, so
   both halves are asserted rather than assumed. If Dev makes the dumb brain steerable, these fail
   first and say so.
2. **Fences that CANNOT be red yet** (AC3, AC4). AC3 fences an obligation leaking through promotion —
   the obligation does not exist until Dev creates it, so there is nothing to leak today. AC4 fences
   the lane decision against regression.
3. **The re-staged machine-gun guard** (1), which must be in place BEFORE the fixture it replaces is
   re-baselined.

**These are mutation-proven, not assumed.** Three mutants were applied to the throwaway and the
suite re-run:

| Mutant | Caught by |
|---|---|
| M1 — the glide lasts TWO wakes instead of one | 4 tests, incl. AC2's "control returns on the wake AFTER" |
| M2 — the glide duration reads a per-wave DYTBL row | **exactly 1** — AC2's wave-invariance test |
| M3 — the obligation stored in its own field, so promotion leaks it | **exactly 1** — AC3's promotion fence |

M3 is the one that matters: it is a plausible ALTERNATIVE DESIGN (a dedicated field rather than a
`PjoyState` variant), and it proves the green-on-arrival AC3 fence bites. M2 and M3 being caught by
exactly one test each is the evidence that the guards are uncoupled rather than three views of one
assertion.

### Left to Dev, deliberately

- **Where the alternation state lives is not specified anywhere in this suite.** A fourth
  `PjoyState` variant, a reuse of `wing`, and a separate field all pass. The throwaway used a
  variant and hit one design snag worth passing on: `PjoyState`'s consumers assume every variant has
  a `timer` (`shadowDwellWake`, `enemy.ts:1217`), and both `seekWake` (:1066) and `withWingCadence`
  (:1227) CLEAR a dumb bird's `pjoy` on every wake — so a variant-based design must exempt itself
  from three existing sites, and `tsc` will find the first one for you.
- The 20 sibling assertions, and the prose inventory AC5 requires.

**Verification:** `npx vitest run --project joust --project shared` — **128 files / 2973 tests, 8
failing, all 8 mine and all in `dumb-wingbeat.test.ts`.** Baseline on arrival was 126 files / 2939
tests, so this adds 2 files and 34 tests and breaks nothing else. `npx tsc --noEmit` 0 errors.
`npm run test:orchestrator` 372/372. Re-measured AFTER rebasing onto four sibling commits that
landed mid-phase (cp6-1, jt5-7 claims) — none touched joust source or tests, so the frozen digests
and cue counts above stand.

**Handoff:** To Dev for implementation
---

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/enemy.ts` — the mechanism: a fourth `PjoyState` variant (`glide`, no
  timer), `dumbWingbeat()` in the wake pipeline, `promote()` discarding `PJOY`, and the three
  existing sites that wiped a linet enemy's workspace taught to carry this one state through.
- `plugins/joust/tests/audio-events.test.ts` — 4 staged frames re-found, 2 fingerprints re-measured.
- `plugins/joust/tests/audio-flap.test.ts` — 1 digest re-measured, 1 test re-staged (law-holder
  change), 1 mislabelled index pair corrected, 2 stale ROM attributions corrected.
- `plugins/joust/tests/audio-thud.test.ts` — 4 digests re-measured, 1 pin moved to a new SEED, 1
  anchor moved because its contact had moved past it.
- `plugins/joust/tests/audio-transporter-split.test.ts` — 3 re-entry frames re-found.

**Tests:** 2991/2991 passing across `--project joust --project shared` (129 files), GREEN.
`npx tsc --noEmit` 0 errors. `npm run test:orchestrator` 382/382.
**Branch:** none
Trunk-based: landed directly on `main` as `5318520`, pushed. No PR.

### The mechanism, and why it is not inside `linet()`

`PJOY,U` is a routine POINTER, and LINET writes it twice: `LNTUP` parks `#LNTOFP` on a flapping
wake (:3746-3748), and `LNTOFP` — where the next wake therefore begins — restores `#LINET`, `CLRB`s
and `BRA LNTFLP`s (:3759-3762). So the alternation is two pointers and no countdown, and the glide
wake is unconditional because entering at `LNTOFP` means the lane decision at :3733-3745 is never
executed at all.

Modelled as a fourth `PjoyState` variant rather than a separate field, because `pjoy` already IS
that cell — the same cell `LNTSMT` overwrites on promotion. The override lives in a new
`dumbWingbeat()` between `runBrain` and the joystick build, NOT inside `linet()`: `linet()` is the
code at :3733, and "unconditional" means precisely that a glide wake does not run it. The suite
demands this directly — AC2 asserts `linet(glider).flap === true` as a *precondition* before
asserting the wake glides anyway.

Three existing sites wiped a dumb enemy's `pjoy` on every wake (uf1-9's "the dumb brain has no
workspace"): `seekWake`'s non-smart return, `withWingCadence`'s linet guard, and — by type, not by
behaviour — `shadowDwellWake`'s `.timer` read, which tsc caught because a `glide` has no timer. The
first two now carry a `glide` through and still wipe everything else; the third narrows it out,
since `dumbWingbeat` is the only writer and the shadow lord can never be in one.

### AC5 — the re-baseline, and its bound

**20 assertions in 4 files, exactly the count and the files TEA predicted.** Every one re-found by
sweeping for its OWN precondition. The bound, stated as AC5 requires:

**What did NOT move, on any pin:**
- `rng` is bit-identical on all three fingerprints (0xbeef/2400 `2_006_456_271`, 0x2468/900
  `3_436_766_652`, 0x1a2b3c4d/240 `1_928_172_029`). Four consecutive stories have now re-baselined
  everything around these and never this — the law the group exists to pin.
- **Every PLAYER row, at every anchor** — `audio-flap`'s 0xbeef/200 digest and all four of
  `audio-thud`'s. The `player-wing-down`/`player-wing-up` cue counts are likewise unmoved on all
  three seeds (154/154, measured, and pinned in `dumb-wingbeat.test.ts`). That is AC7's bound,
  measured rather than argued.
- `audio-events`' 0x1a2b3c4d/240 fingerprint and its `egg-collected` pin: untouched.
- `audio-thud`'s 0xbeef first contact: still frame 119. `audio-transporter-split`'s 0xbeef frame
  214 re-entry: still frame 214, still knight 2.

**What moved, and to what:**

| pin | file | was | now |
|---|---|---|---|
| enemy-death frame | audio-events | 0xbeef 204 | 0xbeef **199** |
| player-death frame | audio-events | 0xface 1888 | 0xface **2062** |
| player-materialise | audio-events | 0xface 1889 | 0xface **2063** (still death+1) |
| wave advance | audio-events | 0xface 1726 | 0xface **1900** |
| fingerprint | audio-events | 0xbeef 2400 | wave 2→**1**, procs, scores, lives |
| fingerprint | audio-events | 0x2468 900 | procs order, scores, lives |
| entity digest | audio-flap | 0xbeef 200 | `enemy#257` dead → `egg#65793`; `enemy#258` |
| entity digest ×2 | audio-thud | 0xbeef 118 / 160 | `enemy#257` only |
| entity digest | audio-thud | 0x2468 188 | `enemy#257` only |
| post-contact anchor | audio-thud | 0x2468 **620** | 0x2468 **755** |
| person thud | audio-thud | 0xface 260 | **seed 0x2332** 973 |
| re-entry frame | audio-transporter | 0xbeef 372 | 0xbeef **340** |
| re-entry frame | audio-transporter | 0xface 1889 | 0xface **2063** |

**Two pins had an empty solution set, and both are the shape AC5 warned about:**

1. **The person thud had to change SEED, and off every seed the file uses.** Swept 2600 frames of
   all four (0xbeef, 0x2468, 0x1a2b3c4d, 0xface): with the dumb brain alternating, not one produces
   a `player-thud` anywhere. The buzzards keep more height, so what used to be a bump now resolves
   as a joust or as enemy-vs-enemy. A seed scan found four hits (0x2221 f=1241; 0x2332, 0x310f and
   0x3442 all f=973); 0x2332 is the earliest. Verified enemy-vs-PLAYER from the process positions,
   not assumed: player#1 at (145,162) with enemy#256 at (128,162), while player#2 has never left
   its perch at (200,128). The assertion got *tighter* — the stream is now exactly `['player-thud']`
   with no wing cue riding along.
2. **0x2468's post-contact anchor had to move, and this one would have passed while lying.** That
   seed's first contact moved 611 → **746**, past the frame-620 anchor, so a test named "AFTER it"
   would have gone on being green while sitting strictly BEFORE the contact. Moved to 755 — the
   same contact+9 offset jt5-4 and uf1-8 both used.

**Method, stated because AC5 asks for it:** every frame was re-found by sweeping the seed for the
test's own stated precondition (an enemy process leaves the list; a player process leaves and
returns; the wave counter advances AND deals a complement; a player id appears that was not there
last frame), and reading off the hit. No number was nudged toward a passing value. The sweep
harnesses were temporary files, run, and deleted — `git status` verified clean before the first
edit to a pinned file.

### AC6 — the cue change, measured, and it runs the way TEA said

Confirmed on the shipped implementation, not on a throwaway. A continuous HOLD sounds ONCE however
long it runs (`wingEdge` is an edge detector); an alternation sounds on every flap. So dumb enemies
get **more** audible, not less: 105→111, 141→219, 69→180 across the three seeds, up to 2.6×. The
knight's counts do not move on any seed. Both directions are now pinned in `dumb-wingbeat.test.ts`.

Three sibling comments in `audio-flap.test.ts` were corrected rather than left to rot, all three
being TEA Delivery Findings:
- `:606`'s "exactly LINET's LNTUP → LNTOFP one-shot in the ROM" attributed the natural-glide
  fixture's silence to a mechanism the port lacked. It is the flap IMPULSE, and that fixture reads
  the same with the latch absent — now says so, and points at the `NATURAL_GLIDE` control.
- `:548-551`'s "LINET holds B for exactly one wake" was false for the whole of uf1-9's life. This
  story makes it true; the comment now says which story, and distinguishes LINET's timer-free
  alternation from BOUNDR's DYTBL-scaled countdown.
- The per-frame test asserted indices `[0,1,3,4,5]` are "not this buzzard's wake" while its own
  precondition said 0 and 4 ARE wakes. Split: 1/3/5 keep the per-frame-vs-per-wake law, 0 and 4 are
  now asserted for what they are — and index 4 is the one this story moves (silent → wing-UP).

### The machine-gun guard was re-staged BEFORE its fixture was re-baselined

TEA marked this blocking, and it was handled in that order. jt5-3's `wings HELD across many wakes
sound ONCE` is staged on a dumb buzzard — the exact state `LNTOFP` makes unreachable. Re-baselining
it to the alternating stream without more would have deleted the guard silently. The law is not
repealed, only its actor, so it now lives in `dumb-wingbeat.test.ts` on the two actors that CAN
still hold (the knight holding the button 14 frames → exactly one cue; a smart bird whose PJOYT
cadence holds two wakes → `down` then `null`), and the old site pins what replaced it — the
alternation through the whole `stepDemo` pipeline, with each wake asserting the lane decision still
WANTS a flap, so suppression is never confused with the bird having stopped asking.

### Non-vacuity, mutation-proven on the shipped code

Not inherited from TEA's throwaway — re-run against what landed, each mutant applied to a backed-up
copy and restored by copy (never `git checkout`, on an uncommitted tree), md5 verified identical
before and after:

| mutant | caught by |
|---|---|
| the glide lasts TWO wakes (LNTOFP does not restore LINET) | 6 tests |
| the glide wake RE-RUNS the lane decision | 8 tests |
| `promote()` does not clear `pjoy` (TEA's M3, on this design) | **0 tests — see the finding** |
| AC7's `flapHeld := flapHeld && !prevFlap` on `shell/input.ts:45` | 4 tests (2 in
  `shell-input.test.ts`, 2 in this story's own AC7 copy) — the guard is still non-vacuous |

The M3 result is reported as a finding rather than buried: on the shipped design the obligation
cannot survive promotion by two independent routes, so the fence cannot fail. `promote()`'s clear is
kept as AC3's cited mechanism (`STX PJOY,U`, :3774) and the code comment now says plainly that it is
belt-and-braces.

### Left standing, deliberately

- The ROM's SECOND entry into LINET's flapping wake — the lava-troll looker (`DEC PLAVT,U` …
  `CMPA #LAVID / BEQ LNTUP`, :3725-3732) — is still unmodelled. TEA pinned it as an ORACLE test so
  it cannot be re-discovered from scratch. Out of scope here (AC1/AC2 fence the alternation, AC4
  the lane decision, and neither covers it) and worth its own story.
- `docs/rom-study/claims/enemy.json` gains no claim for the LNTUP/LNTOFP wingbeat. Not required by
  any AC; TEA's Improvement finding stands.

**Handoff:** To review
---

## Subagent Results

Seven of the nine specialists are disabled in this repo's settings
(`pf settings get workflow.reviewer_subagents` — only `preflight` and `rule_checker` are `true`), so
their domains were assessed by the Reviewer directly rather than claimed as covered. Where that
happened the row says so and names the evidence.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all four numbers re-verified independently, see note below |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — boundary work done by Reviewer (the glide/promotion boundary is finding R-1) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer: no `try`/`catch`, no fallback and no swallowed path anywhere in the diff; `dumbWingbeat` is total over its input |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer via mutation, which produced findings R-2 and R-3 |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer against the vendored ROM and by re-running the counts, producing findings R-4 and R-5 |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — union exhaustiveness covered by rule-checker (Rule 3) and re-enumerated by Reviewer |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer: no I/O, no network, no auth, no user-supplied string reaches the diff; it is a pure offline simulation |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer: one measured-redundant branch, already disclosed by Dev and accepted (see the deviation audit) |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 3, dismissed 0, deferred 1 |

**All received:** Yes (2 enabled specialists returned, 7 pre-filled as disabled)
**Total findings:** 7 confirmed, 0 dismissed, 1 deferred

**Preflight was not taken on trust.** Every number it reported was re-run: `npx vitest run --project
joust --project shared` → 129 files / 2991 tests, `npm run lint` → 0, `npm run test:orchestrator` →
382/382, `git status --short` → only `sprint/epic-jt5.yaml`. All exact. **One correction to its
report:** its "Diff Statistics" section lists 12 files including `audio-seam-scope.test.ts`,
`jt5-7-flap-wording.test.ts`, `README.md`, `flight.ts` and `claims/audio.json` — those belong to
**jt5-7**, which landed between this story's RED and GREEN commits. jt5-8 touches exactly **seven**
files (`git show --name-only` on `1b897d2` and `5318520`), which is what Dev's assessment says. The
mechanical results are unaffected; the file inventory in that report is not this story's.

**Rule-checker disposition.** Confirmed: the stale `enemy-contract.ts` union (R-6), the `e!`
non-null assertion (R-7), and the two missing non-vacuity floors (R-3) — each re-verified against
the source before confirming. Deferred: its Rule 4 (ROM-citation accuracy) pass, which I had already
completed myself against `reference/williams-source/joust/JOUSTRV4.SRC` and instructed it to skip.

---

## Reviewer Assessment

**Verdict:** APPROVED

This is the strongest story I have reviewed in this epic. Every load-bearing claim in the Dev
Assessment that I could re-run, I re-ran, and they came back exact — including two that would have
been easy to fudge. It is approved with four LOW findings and two MEDIUM ones, none of which meet
the blocking bar.

### What I verified against the machine, not against the assessment

- **[VERIFIED] All six ROM citations are line-exact** — read out of
  `reference/williams-source/joust/JOUSTRV4.SRC` directly. `:3746-3748` is `LNTUP LDD #LNTOFP / STD
  PJOY,U / LDB #1` with Williams's own comment `GET OFF GROUND OR JUST FLAP`; `:3759-3762` is
  `LNTOFP LDD #LINET / STD PJOY,U / CLRB / BRA LNTFLP`; `:3749` is `LNTFLP TST PFACE,U` / `MOVE IN
  DIRECTION OF FACING`; `:3773-3775` is `LDX DSMART,X / STX PJOY,U / JMP ,X`. The alternation, the
  unconditionality and the absence of a timer are all exactly what the source says.

- **[VERIFIED] AC1 holds end-to-end in real play, by a method independent of the suite's.** The
  story's own test samples reachable states; I instead drove `createGame`/`stepGame` for 4000 frames
  on three seeds and tracked `prevFlapHeld` per process across scheduler wakes: **3783 dumb wakes,
  451 of them flapping, ZERO consecutive flapping wakes.** Two unrelated methods agree.

- **[VERIFIED] AC5's sweep claims are true where checkable** — `enemy.ts` behaviour re-measured by
  sweeping each seed for a thud. First non-killing contact: 0xbeef **119** (Dev: unmoved, 119),
  0x2468 **746** (Dev: 611 → 746), 0x1a2b3c4d **none inside 1300 frames** (Dev: same). All three
  exact. This is what makes the 620 → 755 anchor move correct rather than convenient.

- **[VERIFIED] AC6's cue figures are exact** — measured on the shipped tree over 2000 frames:
  `enemy-wing-down` = **111 / 219 / 180** on 0xbeef / 0x2468 / 0xface, matching Dev's 105→111,
  141→219, 69→180 precisely.

- **[VERIFIED] AC7's guard is still non-vacuous** — the mutation the AC names, applied to the
  shipped tree, reddens **exactly 4 tests** (2 in `shell-input.test.ts`, 2 in the local copy),
  exactly as claimed. `input.ts` restored by copy, md5 identical before and after
  (`4b4ca971b52760e67bb0f5fe04e7fb86`), tree clean.

- **[VERIFIED] The mechanism is wired, not stranded.** `runBrain` has exactly **one** production
  call site (`enemy.ts:1182`) and `dumbWingbeat` is applied immediately after it, so no path reaches
  the lane decision without the alternation. `glide` is genuinely written in real play (317 / 366 /
  220 occurrences across the three seeds), so this is not the "correct pure function nobody calls"
  failure this repo has been bitten by before.

- **[SEC] [VERIFIED] Nothing to attack.** The diff is a pure offline simulation — no I/O, no
  network, no auth surface, no deserialisation, no user-supplied string. The only file reads are in
  test helpers, against a gitignored vendored tree, and they degrade to skip rather than throw.

- **[SILENT] [VERIFIED] No swallowed failure.** There is no `try`/`catch`, no `?? fallback` that
  masks an error, and no empty branch in the diff. `dumbWingbeat` is total: three explicit returns
  covering non-linet, glide-pending, and flap/no-flap.

- **[SIMPLE] [VERIFIED] One redundant branch, and Dev found it first.** `promote()`'s `pjoy:
  undefined` is measured-redundant. Keeping it is correct (it models `STX PJOY,U`), and Dev
  disclosed it rather than letting it read as load-bearing — which is the behaviour I want, not a
  finding against them.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[EDGE]` | **R-1** — a glide wake can still promote. The ROM reaches `LNTSMT` only via `LINET`'s own `:3722-3724`, and a wake dispatched through `JSR [PJOY,U]` to `LNTOFP` (:3759) never executes it — so the machine cannot promote a dumb bird mid-glide. The port promotes on every wake. Reproduced: seed 0x2468, frame 2688, process 514 promotes to `boundr` carrying `{kind:'glide'}` (1 of 11 promotions across three seeds) | `plugins/joust/src/core/frame.ts:345` | Follow-up story — no AC covers it, and it is determinism-affecting, so it will move the pins this story just froze. Do not fold it in here |
| [MEDIUM] `[TEST]` | **R-2** — AC3's promotion fence cannot fail on the shipped design. Mutation-verified on the landed code: deleting `pjoy: undefined` from `promote()` leaves **all 2463 joust tests green**, not just the 34 | `plugins/joust/tests/dumb-wingbeat.test.ts:350-398` | None now — Dev disclosed this accurately and the code is right by two independent routes. A fence that bit would have to reach into `seekWake`'s rewrite; file with R-1 |
| [LOW] `[TEST]` | **R-3** — two ORACLE negative claims have no non-vacuity floor: `:126` asserts only inside a `for` over `insnsIn(...)`, and `:155` compares a filtered list to `[]`. An empty parse passes both | `plugins/joust/tests/dumb-wingbeat-source.test.ts:126,155` | Add `expect(insns.length).toBeGreaterThan(0)` ahead of each claim |
| [LOW] `[DOC]` | **R-4** — the seed-scan census is materially wrong. The comment says "a seed scan found four hits"; measured, **36 of 400 seeds** in `[0x2200,0x2390)` produce a `player-thud`, **20 of them at frame 973**. The four named seeds are each individually correct (0x2221@1241, 0x2332@973, 0x310f@973, 0x3442@973) and the chosen seed is valid — the *rarity narrative* is what is false, and a future re-baseliner will believe such seeds are scarce when roughly 9% of them work | `plugins/joust/tests/audio-thud.test.ts` (the person-thud comment) | Reword to what was actually swept, or drop the count |
| [LOW] `[DOC]` | **R-5** — the Dev Assessment says the player cue counts are "154/154" on all three seeds. Measured: 0xface is **154/153**. The pinned test has it right (`dumb-wingbeat.test.ts:493`); only the prose is wrong | Dev Assessment, AC5 §"What did NOT move" | Correct the assessment line |
| [LOW] `[TYPE]` `[RULE]` | **R-6** — the jt1-3 double-entry contract type still declares a THREE-variant `pjoy` and never gained `glide`, so it now under-represents production's `PjoyState`. Harmless today (nothing in the eight consumer files matches `kind: 'glide'`), but a future exhaustive `switch` written against it compiles clean while missing the case | `plugins/joust/tests/helpers/enemy-contract.ts:250-253` | Add the fourth variant |
| [LOW] `[RULE]` | **R-7** — `entity: e!` where `e` is genuinely `EntityState \| undefined`. The precondition above it compares two `?.`-chained values with `!==`, which `undefined !== realEntity` also satisfies, so it does not establish `e`. A missing buzzard throws inside `linet()` rather than failing cleanly | `plugins/joust/tests/audio-flap.test.ts:707-708` | `expect(e).toBeDefined()` instead of asserting it away |

Two MEDIUM and five LOW. **No Critical, no High — so nothing blocks.** R-1 and R-2 are the two worth
carrying forward and they belong in one follow-up story, filed beside the lava-troll second entry
TEA already pinned.

### Rule Compliance

Checked exhaustively against `.pennyfarthing/gates/lang-review/typescript.md`, `CLAUDE.md`, and this
plugin's own conventions. Every instance, not one exemplar per rule.

- **Core/shell boundary (CLAUDE.md's "single most important rule in every game") — COMPLIANT.**
  `enemy.ts` is `src/core/`. The diff adds no `Date.now`, `Math.random`, `performance.now`, DOM
  access or `../shell/` import. `plugins/joust/tests/purity.test.ts` and `purity-scanner.test.ts`
  (75 tests) pass. Evidence: `dumbWingbeat` at `enemy.ts:1228-1242` reads only its two parameters
  and returns fresh plain objects.

- **Determinism — COMPLIANT.** The new state rides on `EnemyState.pjoy`, which is part of the
  serialised entity state, not a module-level variable. No `Map`/`Set`/`WeakMap` keyed on object
  identity is introduced in `src/`. The two collections added (`cueCensus`'s `Map<string,number>`,
  `reachableDumbStates`'s `Set<string>`) are test-harness only and keyed on strings derived from
  primitive fields. The strongest evidence is the suite itself: `rng` is bit-identical on all three
  fingerprints (`2_006_456_271`, `3_436_766_652`, `1_928_172_029`) and those pins pass.

- **Exhaustive union handling — COMPLIANT, enumerated site by site.** `PjoyState` goes from three
  variants to four, and the fourth carries no `timer`. All 13 `pjoy` reads in `plugins/joust/src/`
  narrow on `.kind` before touching `.timer`: `:623` `'interval'`; `:635` `'dwell'`; `:636-637`
  `'wing'`; `:677` `'wing'`; `:762` `'dwell'`; `:773` `'interval'`; `:1079` `'dwell'`; `:1097`
  `'glide'` (the new carry-through); `:1121` `'interval'`; `:1233` `'glide'`; `:1274-1280`
  `'dwell'` then the new `kind !== 'glide'` guard before `running.timer`; `:1309` `'glide'`;
  `:1316` `'dwell'`. There is **no `switch` over `pjoy.kind` and no `never` exhaustiveness check
  anywhere**, so no silent fall-through was possible; `tsc --noEmit` is clean, and it is what
  caught `shadowDwellWake` during implementation. **Two structural guards were confirmed rather
  than assumed:** `steerWake` returns `turned: false` for any brain that is not `b2undr` or
  `shadow` (`:966-968`), so `wingsDown = decision.flap || steered.turned` reduces to
  `decision.flap` for a linet enemy and the forced glide cannot be overridden by a turn; and
  `withCliffDwell` early-returns on `brain === 'linet'` (`:1269`), so the one path that could
  clobber a glide with a `dwell` is closed. The single gap is the *test-side* contract type — R-6.

- **ROM-citation accuracy — COMPLIANT.** All six ranges verified by hand against the vendored
  source; see the VERIFIED list above. I found no citation that does not say what its comment
  claims.

- **Test non-vacuity — TWO VIOLATIONS (R-3), otherwise compliant.** Every count assertion in
  `dumb-wingbeat.test.ts` carries a measured floor before it, and AC2's wave-invariance test carries
  an explicit CONTROL proving wave-sensitivity is detectable at all — which is the difference
  between a real invariance test and one that passes because nothing is wave-sensitive. The
  re-baselined siblings were *strengthened*, not merely moved: `audio-events.test.ts`'s determinism
  test gained `expect(twice, 'a quiet frame would make this comparison vacuous').not.toEqual([])`,
  closing the "two empty streams compare equal forever" trap. The two ORACLE negative claims at
  `dumb-wingbeat-source.test.ts:126,155` are the exceptions.

- **No dead code / unwired feature — COMPLIANT.** Traced from `frame.ts:359` → `stepEnemyDetailed`
  → `dumbWingbeat` at `:1186`, unconditional. `glide` is written in real play. This repo's known
  failure mode (a correct pure function whose input every producer hard-codes) does not apply.

- **Type-safety escapes — ONE VIOLATION (R-7).** No `@ts-ignore`, `@ts-expect-error` or `as any`
  anywhere in the diff, and none in `enemy.ts` at all. The only non-null assertion that matters is
  `audio-flap.test.ts:707`. (`dumb-wingbeat.test.ts:497`'s `before[seed]!` is inert —
  `noUncheckedIndexedAccess` is off, so it asserts nothing away.)

- **Module/declaration hygiene — COMPLIANT.** Every new import carries the `.js` extension required
  by this repo's ESM rule, and type-only imports are correctly separated — e.g.
  `import { linet, type EnemyState } from '../src/core/enemy.js'`, where `linet` is newly used as a
  runtime value and correctly not type-only.

- **Null handling — COMPLIANT.** Every added coalesce uses `??`, not `||`: `prevFlapHeld ?? false`
  (×3), `tally.get(...) ?? 0`, `ctx?.player ?? null`.

### Devil's Advocate

Let me argue this is broken.

The strongest attack is the one that landed. This story models a routine POINTER as a piece of
state, and a routine pointer is not just state — it is also an *entry address*. `PJOY,U` decides
which instruction the next wake begins at, and every instruction *above* that address is skipped.
Dev modelled the state faithfully and the entry faithfully for the lane decision, but `LINET`'s
first three instructions are not the lane decision — they are the promotion check. A glide wake
enters below them. The port kept promoting on every wake, so it now does something the machine
cannot. I reproduced it. That is the whole class of bug this modelling choice invites, and there may
be more of it: anything else that lives above `:3733` in the routine is skipped on a glide wake too,
which is exactly why the lava-troll looker at `:3725-3732` — already known to be unmodelled — is
more entangled with this story than "out of scope" suggests. It sits in the skipped region.

Second attack: the re-baseline. Twenty assertions moved, and a re-baseline is where a story hides
its own bugs — every moved number is a place where "the code changed" and "the code broke" look
identical. I pushed on this hardest. It held: the sweeps I re-ran came back exact, the anchor move
was necessary rather than convenient, and one test was made strictly stronger. But I did find that
the *prose* around the seed move overstates its own rarity by an order of magnitude, which is the
tell that at least one sentence here was written from impression rather than from output. That is
why I re-ran the cue counts too — and found a second, smaller prose slip (154/153). Neither touches
behaviour, but two-for-two on unrun numeric claims is worth saying out loud.

Third attack: the green-on-arrival tests. Twelve of them, and green-on-arrival is where a botched
RED hides. TEA mutation-proved them; Dev re-ran the mutants on the shipped code and reported that
one of the three no longer bites. I confirmed that, and it is worse than reported in scope — the
whole 2463-test suite stays green. So AC3's mechanism has no test that can fail. Dev said so
plainly, which is why this is a finding and not a rejection.

What a confused user would misread: the comment at `audio-flap.test.ts:606` used to attribute a
natural glide to LNTUP/LNTOFP. It was corrected here, and the corrected version names the control
that tells them apart. That is the right repair, and it is the pattern the other two corrections
follow.

Where I could not break it: the union. I enumerated all thirteen `pjoy` reads expecting to find one
unnarrowed `.timer`, and there isn't one; I looked for a `switch`/`never` that a fourth variant
would silently slip past, and there is none; I checked whether a turn could override the forced
glide, and `steerWake` structurally cannot turn a linet bird. AC1 I attacked by refusing to use the
suite's own observable and instead tracking scheduler wakes end-to-end — zero violations in 451
flapping wakes. The mechanism is right.

**Data flow traced:** scheduler wake → `frame.ts:359 stepEnemyDetailed` → `homingWake` → `steerWake`
(returns `turned:false` for linet, `:966-968`) → `seekWake` (carries a pending `glide` through,
`:1097`) → `withWingCadence` (carries it through, `:1309`) → `runBrain` → `linet()` lane decision →
`dumbWingbeat` (`:1228`: spends the glide and forces `flap:false`, or parks one on a flapping wake)
→ `wingsDown` → `PlayerInput` → `stepEntity` + `wingEdge` → `wingCue(..., 'enemy')` → `GameState.events`
→ the shell's dispatcher. Safe because the state is per-entity and serialised, the decision is
recomputed from it every wake, and nothing on the path reads a clock or an RNG outside the seeded one.

**Pattern observed:** the alternation is modelled *around* the decision rather than inside it
(`enemy.ts:1186`), which is what makes "unconditional" mean something testable — `linet()` stays the
pure code at `:3733` and AC2 can assert `linet(glider).flap === true` as a precondition before
asserting the wake glides anyway. That is a genuinely good structural choice and it is why the
suite can tell suppression apart from the bird having stopped asking.

**Error handling:** there is no failure path to handle — the function is total over its input and
the diff introduces no I/O. The degradation that does exist is the vendored-source gate: the ORACLE
file skips cleanly when `reference/williams-source/joust` is absent (CI), and every file read is
inside an `it()` rather than a `describe` body, correctly avoiding the collection-time throw that
has bitten this fleet before.

**Handoff:** To SM for finish-story