---
story_id: "jt5-10"
jira_key: "jt5-10"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-10: Does the pterodactyl reach FLAPLP/FLIPLP? P7DEC binds the enemy wing cues to a bird with no flap model

## Story Details
- **ID:** jt5-10
- **Jira Key:** jt5-10
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T17:19:54Z
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T16:42:01Z | 2026-08-01T16:46:28Z | 4m 27s |
| red | 2026-08-01T16:46:28Z | 2026-08-01T16:59:58Z | 13m 30s |
| green | 2026-08-01T16:59:58Z | 2026-08-01T17:08:41Z | 8m 43s |
| review | 2026-08-01T17:08:41Z | 2026-08-01T17:19:54Z | 11m 13s |
| finish | 2026-08-01T17:19:54Z | - | - |

## Story Acceptance Criteria

**DERIVED CRITERIA — there is no `acceptance_criteria` key on jt5-10 in `sprint/epic-jt5.yaml`. These are SM-authored proposals for TEA to challenge and refine.** They were derived from the story `description` after every one of its citations was re-opened and verified (see *SM Setup Assessment* below), and from the user's scope ruling recorded under *Measured Background*.

1. **The P7DEC question is SETTLED from the source, in writing, with citations.** The port records — as a comment in `plugins/joust/src/core/ptero.ts` (the ptero's own module) and reachable from the audio seam's commentary in `plugins/joust/src/core/events.ts` — whether the ROM's pterodactyl reaches `FLAPLP`/`FLIPLP`, i.e. whether `PTERO` (`JOUSTRV4.SRC:1142`) can reach either of the two and only two sites that load through `DSNWU`/`DSNWD` (`JOUSTRV4.SRC:6183` and `:6217`). The record states the answer, the routine chain that proves it, and a `LABEL (:line)` citation for each hop. "Read the block, it binds the cues" is NOT a proof — the binding at `:5576` is the *question*, not the answer.

2. **The answer drives the code, and both outcomes are acceptable deliverables.** If the ptero DOES reach those loops, the port emits the already-existing `enemy-wing-up` / `enemy-wing-down` kinds (`plugins/joust/src/core/events.ts:73-74`) for the ptero at the ROM's edges. If it does NOT, no cue is emitted and the silence is recorded as deliberate, ROM-backed behaviour rather than an omission. Whichever branch the read produces, the OTHER branch is explicitly named in the record as refuted, so a later reader cannot re-open the question with less evidence than we have now.

3. **A test guards the settled answer against silent reversal.** Not a vacuous restatement: it must be capable of reddening. For the emit branch, that is an assertion that a ptero's flight produces the wing cues at the ROM-specified edges. For the silent branch, it is an assertion that a ptero's full flight through `stepPteroFlight` (`plugins/joust/src/core/ptero.ts:140`) emits NO wing cue — a test which would redden the moment someone wires a flap model to the ptero without revisiting the ROM. TEA decides the shape once the read lands; SM does not pre-empt it.

4. **The `SNETHD` ptero-vs-ptero arm is settled by the same read and its code consequence is FILED, not built.** Per the user's scope ruling, this story records the finding — that `OSTHT2` plays `SNETHD` at `:5019-5020` and then routes a ptero/ptero pair through `OSTH12` (`:5031-5033`) back to `OSTH11`'s ordinary bump, i.e. the ptero IS a full collision participant in the ROM — and states plainly that this port cannot reach that arm because `collisionPass` filters to `player|enemy` (`plugins/joust/src/core/demo.ts:859-861`). A follow-up story owns the collision change. **The follow-up must EXIST and its description must carry the finding**, not merely its title; per the jt5-5 finish lesson, "owned by X" is not a disposition until X's text says so.

5. **No fidelity regression and no scope leak.** `npx vitest run --project joust --project shared` stays green, and `collisionPass`'s eligible-set filter is NOT modified in this story.

## Measured Background (User Rulings & Corrections)

### User Ruling — SCOPE: settle the reads here, FILE the collision change

Asked at setup, before any RED, because the story bundles a ROM read (cheap) with a gameplay
mechanic change (not cheap) and TEA writes a different RED test for each branch. The census put to
the user: the ROM half of the ptero-vs-ptero question is *already settled* — `OSTHT2` at `:5019`
plays `SNETHD`, `:5022-5027` tests `PID` for `PTEID` on both parties, and `OSTH12` `:5031-5033`
sends a ptero/ptero pair back to `OSTH11`'s ordinary bump ("BR=YES, SAME OLD COLISION"); the
`enemy-thud` kind already exists in the port (`events.ts:76`, whose comment *already* names
ptero-vs-ptero); and baiters cap at three live pteros (`baiter.ts:6`), so pairs really occur.

**Ruling: settle both reads in jt5-10 and deliver whatever the wing-cue read supports. File the
ptero-vs-ptero collision reachability — pteros into `collisionPass`'s eligible set, pair →
`enemy-thud` + `OSTBMP` bump — as its own story.** Rationale accepted: the collision change alters
how three on-screen pteros behave and is a gameplay change, not a cue change; folding it into a
2-pointer would misprice it.

Consequence for TEA: **do not** touch the eligible-set filter at `demo.ts:859-861`. AC-4 is a
*recording and filing* obligation, not a build one.

### Measured Corrections

**None. This is the unusual case: every falsifiable claim in the story description verified.**
Recorded explicitly because the sidecar's standing rule is to measure a description's claims before
setup and pass corrections forward — a "no corrections" result is itself a measurement, and the next
reader should not repeat it. Eight citations re-opened against the tree at `e5457ab`; the full table
is in the *SM Setup Assessment* below.

### Two things the description states that are worth restating as SIGNALS, not conclusions

Both are SM observations from the same read. **They are claims for TEA to verify, not findings** —
per `sm-premeasured-corrections-can-be-wrong`, a pre-setup measurement arrives labelled MEASURED and
outranks the story, so it is marked here as what it is:

- **`P7DEC` zeroes the two RUN entries** (`:5576` — positions 5 and 6, where P3DEC-P6DEC carry
  `SNERU1,SNERU2`). The story reads this as "consistent with a bird that never touches the ground."
  Verified as textually true. It does not settle the flap question either way.
- **`P7DEC` field 6 of its FIRST row is `0`** (`:5574`: `FDB LINET,PTERO,0000,$0000,SCOPL2,0,TREPL3,EMYDIE`),
  where P1DEC/P2DEC carry `PLYR1`/`PLYR2` and P3DEC-P6DEC carry `PLYR3`/`PLYR4`/`PLYR5`. **SM did not
  determine what that field is.** If it is the animation/picture table, a `0` there is potentially
  decisive for AC-1; if it is something else, it is noise. TEA should identify the field before
  leaning on it, and should not cite this observation without doing so.

## Known Hazards

- **`rom-table-continuation-bit` applies to this story's own quarry.** A joust ROM sound table ends
  at the first pair whose code lacks `+$80`, and continuations sit on the NEXT LINE — a one-row
  citation has already shipped a 15x-wrong reading (SNPCR1, jt5-6 owns the structural fix). If this
  story quotes any `SN*` table row, read past it.
- **The citation gate re-opens the QUOTED LINE only** and cannot see a wrong reading carried in the
  claim body. Cite the MECHANISM, not just the value.
- **Comment-only edits shift pinned line numbers.** `plugins/joust/src/core/ptero.ts` and
  `events.ts` are both cited elsewhere; re-anchor after any edit and re-run the citation gate.
- **`prose-claims-are-the-unguarded-surface`.** This story's PRIMARY deliverable is prose — a
  recorded ROM finding. That is exactly the surface the guards cannot check and where jt8-6 burned
  three review rounds. State each routine's complete behaviour rather than line extents or
  instruction censuses.

## Sibling Contention

Probed at setup, both halves, output read rather than assumed:
- `git fetch --prune origin && git branch -r | grep -Ei "jt5"` → **no matches.** No sibling holds a
  jt5 claim branch.
- `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` → `a-2` holds `uf1-8-session.md` only.
  Different epic, different files. No contention on `ptero.ts`, `events.ts` or `demo.ts`.

## Delivery Findings

### TEA (test design)

- **Gap** (blocking): AC-4 requires a follow-up story for the ptero-vs-ptero collision
  reachability to EXIST with the finding written into its description, and TEA cannot file
  backlog stories. Affects `sprint/epic-jt5.yaml` (SM must run `pf sprint story add` at finish,
  then `pf sprint story update <minted-id> --description` — reading the minted id from the add's
  output, not guessing it, and auditing the `repos:` it writes). The description must carry the
  ROUTING, not just the title: `OSTHT2` sounds `SNETHD` at `:5019-5020` **before** dispatching;
  `:5022-5027` tests `PID` for `#$80+PTEID` on both parties; `OSTH12` `:5031-5033` sends a
  ptero/ptero pair back to `OSTH11`'s ordinary bump; the port's gap is
  `plugins/joust/src/core/demo.ts:859-861` filtering to `player|enemy`; and `enemy-thud` already
  exists as a kind. *Found by TEA during test design.*
- **Improvement** (non-blocking): jt5-2 needs NO new pterodactyl wing sample, and can now be
  told so rather than re-deriving it. The ptero's entire sound repertoire in its own code is two
  immediates that never touch `PDECSN` — `SNPTEI` (`:1467`, introduction) and `SNPTE` (`:1173`,
  the call). Affects `sprint/epic-jt5.yaml` (jt5-2's description could cite this story).
  *Found by TEA during test design.*
- **Conflict** (non-blocking): the story description's two supporting "signals" are both refuted,
  and the second was SM's explicitly-flagged open question. (a) "It zeroes the two RUN entries,
  consistent with a bird that never touches the ground" — true textually, but not a
  discriminator: `SNEMSK`, `SNEMS2` and `SNEFAL` are equally unreachable for a ptero and are NOT
  zeroed, so the row is boilerplate with two arbitrary zeros. (b) P7DEC field 6 is `DPLYR`,
  "RIDERS IMAGE" (`JOUSTRV4.SRC:109`) — a pterodactyl has no rider, so the `0` says nothing about
  flapping. Affects `sprint/epic-jt5.yaml` (jt5-10's description asserts (a) as evidence).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the ptero DOES animate its wings — `PTESEQ` (`:1580-1583`)
  cycles FLY1, FLY2, FLY3, FLY2 on an 8-tick hold from a frame timer in `PTESTF` (`:1493-1503`),
  with no flap bit anywhere. Anyone who sees four wing frames and infers a cue re-opens this
  story, so the record must disarm it explicitly. Affects `plugins/joust/src/core/ptero.ts`
  (Dev's comment must name `PTESEQ`; a test pins that it does). *Found by TEA during test design.*

### Dev (implementation)

- No upstream findings. TEA's four findings stand as written; the blocking one (AC-4's follow-up
  story must be FILED with the finding in its description) is SM's at finish and is unaffected by
  anything implemented here.

### Reviewer (code review)

- **Improvement** (non-blocking): the `/ptero/i`-across-the-whole-file assertion shape is a trap
  this suite should avoid generally — `events.ts` names the ptero in four unrelated cue kinds, so
  any whole-file token check about the ptero is close to vacuous there. Affects
  `plugins/joust/tests/` (a future story adding a per-kind claim to `events.ts` should anchor its
  assertion to the declaration LINE, as this story's now is). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): three of this story's five defects were failed ENUMERATIONS or
  EXTENTS (an extent, a five-item list, a four-item count — the real number was six). That is the
  same category jt8-6 lost three rounds to, and `tests/audit/citations.test.ts` structurally cannot
  see it: the gate re-opens the quoted line and never reads the claim body. Affects
  `plugins/joust/tests/audit/citations.test.ts` — a body-side check that every `:NNNN` in a claim
  body resolves, and that a label named beside it appears at or near that line, would have caught
  two of the three mechanically. I ran exactly that sweep by hand here (47 pairs); making it a test
  is a story, not a fix. *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)

- **[ACCEPTED]** **The records sit at the FOOT of `ptero.ts` and `demo.ts`, not beside the code they describe**
  - Spec source: context-story-jt5-10.md, AC-1
  - Spec text: "The port records — as a comment in `plugins/joust/src/core/ptero.ts` (the ptero's
    own module) ..."
  - Implementation: appended as titled trailing sections at end-of-file, with a zero-shift pointer
    comment on `collisionPass`'s eligible-set filter itself so the demo.ts record is reachable
    from the line that raises the question. `events.ts` was edited in place at equal line count.
  - Rationale: MEASURED, not aesthetic. Inserting beside `collisionPass` would shift roughly a
    hundred `demo.ts:N` citations carried by other suites; and eight `ptero.ts:N` citations live
    in `sprint/archive/jt3-4-session.md`, `jt3-5-session.md` and `jt3-7-session.md` — permanent
    records that cannot be corrected without falsifying them. Verified by hunk arithmetic that no
    existing line number moved in any of the three files, and spot-checked that `ptero.ts:190`
    still lands on the `coldx < 0` branch jt3-7's archive names.
  - Severity: minor
  - Forward impact: a future editor of these files inherits the same constraint — prefer EOF
    appends or equal-count in-place edits in `ptero.ts`, `events.ts` and `demo.ts`.

- **[ACCEPTED]** **Six claims were written, where the tests required four**
  - Spec source: `tests/audio-ptero-wing-source.test.ts`, "the chain's load-bearing lines are each
    covered by a claim"
  - Spec text: the test requires JT510 claims covering `:5576`, `:1510`, `:6135`, `:6480`.
  - Implementation: JT510-001..006 — the four required, plus `:1487` (creation entering the loop
    body, without which hop 1 of the chain is unsourced) and `:109` (`DPLYR`, which is the only
    thing that refutes the "field 6 is an animation table" reading the story offered as evidence).
  - Rationale: a chain with an unsourced hop invites the re-derivation this story exists to
    prevent, and a refuted reading that is not refuted IN the registry gets quoted forward.
  - Severity: minor
  - Forward impact: none — additive claims, all verbatim-gated.

### TEA (test design)

- **[ACCEPTED]** **AC-3's guard is GREEN on arrival, not RED**
  - Spec source: context-story-jt5-10.md, AC-3
  - Spec text: "A test guards the settled answer against silent reversal. Not a vacuous
    restatement: it must be capable of reddening."
  - Implementation: the behavioural guard (`a ptero flying 40 frames emits no wing cue of any
    species`) passes on the pre-story tree, because the ROM's answer turned out to be "silent"
    and the port is already silent. Its capacity to redden was proven by MUTATION rather than by
    starting red: adding `cue: 'enemy-wing-down'` to `frame.ts`'s ptero branch reddens it, and
    restoring the file greens it. A second, complementary guard (`the ptero branch of
    runBehaviour returns no cue — pinned at the source`) catches the mutation the first cannot —
    a `wingCue(...)` call that happens to return `undefined` — and is blind to the one the first
    catches. Each was verified against its own mutation with the source restored after.
  - Rationale: the AC deliberately admits both outcomes ("For the silent branch, it is an
    assertion that a ptero's full flight ... emits NO wing cue"), and the ROM chose the silent
    branch. A guard that had to start red would require breaking the port first.
  - Severity: minor
  - Forward impact: Dev must not "make it fail first". The RED that matters is Groups 3, 4 and 6
    — the record does not exist yet.

- **[ACCEPTED]** **The record's CITATIONS are pinned, its WORDING is not**
  - Spec source: context-story-jt5-10.md, AC-1
  - Spec text: "The record states the answer, the routine chain that proves it, and a
    `LABEL (:line)` citation for each hop."
  - Implementation: the tests assert that `ptero.ts` contains each label (`PTEFLY`, `PTESTF`,
    `AIROVR`, `STFLY`, `STFALL`, `SRCADP`, `PTESEQ`, `P7DEC`, `SNELWU`, `SNELWD`, `FLAPLP`,
    `FLIPLP`) and each line (`:1487`, `:1491`, `:1510`, `:6135`, `:6480`, `:5576`). No sentence
    is required to read any particular way.
  - Rationale: jt8-6 burned three review rounds on claim prose while its code was correct from
    round 1. A test that demands a sentence fails on a better sentence and passes on a wrong one
    that happens to contain the words.
  - Severity: minor
  - Forward impact: the Reviewer should read the prose Dev writes — the suite checks that the
    citations are present and byte-correct, not that the surrounding claim is true.

- **[FLAGGED]** **AC-4's filing half is not testable here**
  - Spec source: context-story-jt5-10.md, AC-4
  - Spec text: "A follow-up story owns the collision change. The follow-up must EXIST and its
    description must carry the finding."
  - Implementation: the ROM routing is pinned verbatim and the port's gap is recorded, but no
    test asserts a backlog story exists. Raised as a blocking Delivery Finding for SM at finish
    instead.
  - Rationale: joust's vitest project is the wrong surface for sprint-YAML invariants (that is
    the orchestrator suite's), and a test coupling a game's suite to backlog state would redden
    the moment the story is archived.
  - Severity: minor
  - Forward impact: AC-4 cannot be closed by a green suite. SM must verify the filing at finish.

## SM Setup Assessment (2026-08-01)

### Every citation in the description was re-opened. All eight hold.

| Claim in description | Verified against | Result |
|---|---|---|
| Decision blocks bind enemy sound tables, `P7DEC` is the last | `JOUSTRV4.SRC:5558-5577` | HOLDS — P3DEC:5558, P4DEC:5562, P5DEC:5566, P6DEC:5570, P7DEC:5574; their sound rows are :5560/:5564/:5568/:5572/:5576 |
| `P7DEC` at `:5576` reads `FDB SNELWU,SNELWD,SNEMSK,SNEMS2,0,0,SNEFAL,0,SNECRE` | `JOUSTRV4.SRC:5576` | HOLDS — byte-for-byte |
| It zeroes the two RUN entries | positions 5-6 vs P3DEC-P6DEC's `SNERU1,SNERU2` | HOLDS |
| The only loaders of `DSNWU`/`DSNWD` are `:6183` and `:6217` | `grep -n "DSNWU\|DSNWD" JOUSTRV4.SRC` | HOLDS — 4 hits total: the two `RMB` declarations at :118-119, and exactly two `LDX` reads at :6183 (`GET WING UP SOUND`) and :6217 |
| `PTERO` routine "around :1142" | `JOUSTRV4.SRC:1142` | HOLDS — `PTERO DEC PPVELX,U` exactly at :1142 |
| `:4961 BNE OSTHT2  BR=NO KILL (ENEMY VS. ENEMY, PTERO VS. PTERO)` | `JOUSTRV4.SRC:4961` | HOLDS — verbatim, comment included |
| `OSTHT2` tests PID for PTEID on both parties :5022-5027; PTEBRD at :5034/:5037-5038; OSTH11 at :5031-5033 | `JOUSTRV4.SRC:5019-5040` | HOLDS — all three spans correct. `SNETHD` is loaded at :5019 and sounded by `JSR VSND` at :5020 |
| `collisionPass` filters to `player|enemy` at `demo.ts:859-861` | `plugins/joust/src/core/demo.ts:859-861` | HOLDS — `(p.kind === 'player' \|\| p.kind === 'enemy') && p.collisionEnabled !== false` |

Two supporting facts confirmed while checking the above, both load-bearing for the ACs:
`enemy-wing-up`/`enemy-wing-down` already exist as kinds (`events.ts:73-74`), so the emit branch of
AC-2 needs no new kind; and `stepPteroFlight` (`ptero.ts:140-152`) genuinely has no flap model — its
own comment says "a still ptero (velY 0, **no flap**) HOLDS altitude."

### Board state at setup

`NEW_WORK_STATE`, backlog 57, merge gate clean, sprint 2628 at 1796/1970. jt5-10 was `p3`,
`status: backlog`, 2pt, `workflow: tdd`, `repos: arcade`, **no `acceptance_criteria` key** — hence
the DERIVED banner above. Story stamped `in_progress` by SM after setup (`sm-setup` is documented to
leave it at `backlog`; this run authored the artifacts inline, and the stamp was still applied
explicitly rather than assumed).

### Why setup ran inline rather than through `sm-setup`

This project stands on "do not use the Agent tool unless asked" (confirmed on jt5-5). The SM sidecar
separately documents five recurring `sm-setup` defects — a stub context reported as validated, ACs
edited after a verbatim instruction, corrections landing in the session but not the context, a
missing `**Repos:**` field, and the unstamped status. Authoring the two artifacts directly removes
all five failure modes rather than checking for them afterwards. Both files were written by SM and
carry the same measured facts; the context is not a stub.
## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/joust/tests/audio-ptero-wing-source.test.ts` — 30 tests in six groups: two ORACLE
  groups that re-derive the ROM chain from the vendored tree (pass on arrival), three RED groups
  requiring the port to RECORD the settled answer, and one green-on-arrival behavioural guard
  whose non-vacuity was proven by mutation.

**Tests Written:** 30 tests covering 5 ACs
**Status:** RED — 9 failing, 21 passing. Full suite: 2598 passed, 9 failed, all 9 in the new file.
`npm run lint` clean.

### The answer, which is the story

**The pterodactyl NEVER reaches `FLAPLP`/`FLIPLP`. `SNELWU`/`SNELWD` in `P7DEC` (`:5576`) are
dead bindings. The bird is silent by design — and jt5-2 therefore needs no new sample.**

The chain, each hop re-derived by `tests/helpers/joust-source.ts` (the independent reader nothing
under `src/` may import):

1. A ptero is created by `PTERST` (`:1423`) / `BAITST` (`:1427`), which ends `BRA PTESTF`
   (`:1487`) — landing *inside* the `PTEFLY` loop body, never in the bird state machine.
2. `PTEFLY` (`:1491-1510`) is closed: its last instruction is `BRA PTEFLY` (`:1510`),
   unconditional.
3. Every mention of a flap label in the entire file lies in `:6135-6226` — computed by scanning
   all 8000+ lines, not asserted by hand, so an unnoticed route would redden the test. The only
   mentions outside the loop body are `STFLY`'s `JMP FLAST2` (`:6135`) and `STFALL`'s
   `BNE FLAPS2` / `BRA FLIPS2` (`:6156-6157`) — both ground-state transitions.
4. A ptero makes neither: `PTEFLY` never calls `CKGND`, and `SRCADP` clamps it at `$D3-1` while
   clearing `PVELY` (`:1526-1531`), so it never lands and never falls out of the world.
5. `AIROVR` hands the flap bit back in B (`LDD CURJOY`, `:6480`) to a ptero exactly as to a
   buzzard — and `PTEFLY` discards it. There is no `TSTB` in the ptero's loop.

**Corroborating witness, because one chain deserves two.** All nine of `P7DEC`'s sound fields are
read at exactly one site each, and every site is in the ground/landing machine the ptero never
enters: `DSNWU` `:6183`, `DSNWD` `:6217`, `DSNSK` `:7238`, `DSNSK2` `:5987`, `DSNFAL` `:6142`,
`DSNTREF` `:5893`, `DSNCRE` `:5718`. The wing pair is not specially dead — the whole row is.

### What Dev has to build

Nothing mechanical. The deliverable is a RECORD, in three places, and the 9 red tests name them:

| Red group | What must exist |
|---|---|
| Group 3 (5 tests) | `plugins/joust/src/core/ptero.ts` states the answer and cites every hop; names the refuted branch (`FLAPLP`/`FLIPLP`) and the binding it refutes (`P7DEC`, `SNELWU`/`SNELWD`, `:5576`); names `PTESEQ` so the animate-but-silent trap is disarmed. `events.ts` names the ptero exclusion and points at jt5-10. |
| Group 4 (3 tests) | `JT510-*` claims in `plugins/joust/docs/rom-study/claims/`, covering at least `:5576`, `:1510`, `:6135`, `:6480`, each `verbatim` byte-matching the vendored line. |
| Group 6 (1 test) | `demo.ts` records why ptero-vs-ptero is unreachable here (`OSTHT2`, jt5-10) — and the eligible-set filter stays untouched. |

`JT510-` is free (verified; distinct from `JT51-` because every suffix is three digits).

### Two things I got wrong first, both worth the Reviewer's attention

**1. The behavioural guard failed on arrival, and it was my fixture, not the port.** My first
staging put one ptero beside the knights and asserted no wing cue. It failed on
`enemy-wing-down`, with `enemy-materialise` in the same stream: `createWaveDemo` keeps spawning
the wave's buzzards as frames run, so "the only enemy is my ptero" is true at frame 0 and false
by frame 12. Cues carry no process id, so attribution has to come from the fixture. Fixed with
`hushAllBut`, re-applied **every frame** — a process that did not exist at frame 0 cannot be
hushed at frame 0. Recorded in the file as measured necessity, not caution.

**2. My two guards catch different mutations, and neither catches both.** Verified, not assumed:

| Mutation to `frame.ts`'s ptero branch | Behavioural guard | Source pin |
|---|---|---|
| `cue: 'enemy-wing-down' as never` | **RED** | green |
| `cue: wingCue(null, 'enemy')` (returns `undefined`) | green | **RED** |

Source restored clean after each (`git status --porcelain` → 0 modified). The pair is
complementary by accident of what each can see; that is now stated in the file so nobody deletes
one as redundant.

### Rule Coverage

The reviewer specialists are disabled on this project, and `.pennyfarthing/gates/lang-review/`
holds no TypeScript checklist beyond the repo's own conventions, so the rubric applied was the
joust suite's own house rules:

| Rule | Test(s) | Status |
|------|---------|--------|
| Vendored reads live INSIDE `it()` (the tp1-8 collection trap) | every group — no module-scope read; only `existsSync` via the helper | passing |
| Source re-derivation degrades on CI | `describe.skipIf(!vendoredAvailable)` on Groups 1, 2, 6a; `it.skipIf` on the verbatim check | passing |
| The double-entry stays independent | uses `tests/helpers/joust-source.ts`; nothing under `src/` imports it | passing |
| A cue test asserts the PRECONDITION before the cue | ptero exists each frame, actually flew, actually moved | passing |
| No absence assertion without a positive control | `the control proves this harness CAN sound a wing` | passing |
| Citations are byte-exact, never paraphrased | Groups 1 and 6a use `toBe` on whole lines | passing |
| Claims carry a verbatim that matches the source | `every JT510 verbatim matches the vendored line byte-for-byte` | failing (RED) |
| Core purity — no `window.`/`document.` even in comments | tests are outside `src/core/`; no forbidden token written | passing |

**Rules checked:** 8 of 8 applicable house rules have coverage.
**Self-check:** 0 vacuous tests. Every `it()` asserts; the one absence-only group carries a
positive control and two mutation proofs.

**Handoff:** To Bicycle Repair Man (Dev) for GREEN — write the record, not a mechanic.
## Dev Assessment

**Status:** GREEN — 30/30 in the story's suite; **10851 app tests + 359 orchestrator all passing**;
`npm run lint` (tsc) clean; joust's 56-test citation gate green with the six new claims.

**What was built:** a record. No behaviour changed — no cue added, none removed, no mechanic
touched, `collisionPass`'s eligible set exactly as TEA found it.

| File | Change | Closes |
|---|---|---|
| `plugins/joust/src/core/ptero.ts` | 70-line settled-finding section at the foot of the module | Group 3 (4 tests) |
| `plugins/joust/src/core/events.ts` | the two `enemy-wing-*` kinds now read "NEVER a ptero (jt5-10)" | Group 3 (1 test) |
| `plugins/joust/src/core/demo.ts` | ptero-vs-ptero gap recorded with the ROM's routing + a pointer on the filter line | Group 6 (1 test) |
| `plugins/joust/docs/rom-study/claims/audio.json` | JT510-001..006, verbatim-gated | Group 4 (3 tests) |

### AC status

| AC | Status | Evidence |
|---|---|---|
| AC-1 — question settled in writing, with `LABEL (:line)` citations | **Met** | `ptero.ts` names `PTEFLY`/`PTESTF`/`AIROVR`/`STFLY`/`STFALL`/`SRCADP`/`PTESEQ` and cites `:1487`, `:1491`, `:1510`, `:6135`, `:6480`; JT510-001..006 each byte-match the vendored line |
| AC-2 — the answer drives the code; the losing branch named as refuted | **Met** | ROM said silent, so no cue is emitted and the silence is recorded as deliberate; the "it runs the same loops, therefore it flaps" branch is stated and refuted by name |
| AC-3 — a guard capable of reddening | **Met** | staged flight emits no wing cue (proven to redden by mutation), plus a source pin on `frame.ts`'s ptero branch that catches the mutation the first cannot |
| AC-4 — SNETHD recorded; collision change FILED | **Partly — the filing is SM's** | recorded in `demo.ts` with the ROM routing pinned verbatim; the follow-up story must be filed at finish (TEA's blocking Delivery Finding) |
| AC-5 — no regression, no scope leak | **Met** | full suite green; a test asserts the eligible-set filter is unchanged and forbids admitting `'ptero'` to it |

### Two judgement calls worth the Reviewer's attention

**1. Placement was chosen by measurement, and the measurement is the interesting part.** I wanted
the ptero record in the module header, where this file keeps its other ROM-law sections. Grepping
first showed eight `ptero.ts:N` citations sitting in **archived** sessions (jt3-4, jt3-5, jt3-7) —
`ptero.ts:190` is quoted in jt3-7's "N1 [FIDELITY] CLOSED" line. An archived session is a permanent
record; shifting the file would make it quietly wrong with no way to correct it honestly. Same for
`demo.ts`, at roughly a hundred references. So every edit here is an EOF append or an equal-count
in-place edit, verified by hunk arithmetic (`-220,0 +221,70`, `-73,2 +73,2`, `-861 +861` and
`-1494,0 +1495,39`) rather than by eye, and spot-checked against the archived anchors.

**2. JT510-001 states the mechanism that makes its own citation safe.** `:5576` is a table row, and
this epic has already shipped a 15x-wrong reading from citing one row of a multi-line ROM table
(SNPCR1, jt5-6). The continuation rule belongs to the `SN*` sound tables and not to decision
blocks — so rather than assert that, the claim gives the check: the row's **nine** FDB words map
one-for-one onto the **nine** sound offsets `DSNWU`…`DSNCRE` at `:118-126`, which is what proves it
complete on one line. A reader can verify the count without knowing the rule.

**Handoff:** To The Argument Professional (Reviewer). The code is inert; the risk here is entirely
in the PROSE, which is the surface the guards cannot check. The claim bodies and the three comment
blocks are where a defect would be — particularly any sentence that asserts more than its cited
line supports.
## Subagent Results

`pf settings get workflow.reviewer_subagents` reports `preflight: true` and the other eight
`false`, and this project separately stands on "do not use the Agent tool unless asked". So no
specialist ran, and every disabled domain was covered directly — by a 13-mutation battery and an
independent re-derivation of every citation from the vendored source.

| Subagent | Enabled | Covered by | Result |
|---|---|---|---|
| reviewer-preflight | true | ran directly: `npm run lint`, `npx vitest run`, `npm run test:orchestrator` | 10851 app + 359 orchestrator pass, tsc clean |
| reviewer-edge-hunter | false | the flap-label sweep re-derived; hunted for entry points the curated list missed | **FOUND: GOTFIT (:6207) omitted** — fixed |
| reviewer-silent-failure-hunter | false | reviewed by hand — this diff adds no control flow, no catch, no fallback | clean (nothing executable added) |
| reviewer-test-analyzer | false | 13-mutation battery + a pre-story replay of each assertion | **FOUND: `/ptero/i` vacuous** — fixed |
| reviewer-comment-analyzer | false | all 47 label/line pairs in the three comment blocks re-derived against the ROM | **FOUND: CORROBORATION typo, baiter-cap overstatement** — fixed |
| reviewer-type-design | false | reviewed by hand — no type introduced or changed anywhere in the diff | clean |
| reviewer-security | false | reviewed by hand — no I/O, no input parsing, no secret, no network; test-only fs reads | clean |
| reviewer-simplifier | false | reviewed by hand — the only executable change is one filter comment; no dead code added | clean |
| reviewer-rule-checker | false | the 8 house rules checked in TEA's Rule Coverage table, re-verified | clean |

**All received: Yes**

## Reviewer Assessment

**Verdict: APPROVED**

**Round 1.** Five defects found, all five fixed in place and each fix re-verified. None changed the
story's answer, and none was in executable code — which is itself the correct reading of this
story's risk: the diff adds one comment to a filter line and otherwise ships prose and claims.

### Findings

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | **Medium** | The `events.ts` assertion was `toMatch(/ptero/i)` over the whole file. `events.ts` has always declared `ptero-arrives` and `ptero-death`, so it **passed on the pre-story tree** — a guard that could not fail, and the mutation that deleted the exclusion survived it. | FIXED — anchored per kind to the declaration line; mutation re-run and it now reddens |
| 2 | **Medium** | The flap-label sweep hard-coded eleven labels and omitted `GOTFIT` (:6207), a genuine entry point inside the loops. The sweep's entire purpose is to prove nothing enters from outside; it could not have seen a `JMP GOTFIT`. Verified harmless today — GOTFIT's only reference is `BRA GOTFIT` at :6204, inside the region. | FIXED — the label set is now derived from the labels defined in :6163-6226, complete by construction (12 labels, GOTFIT among them) |
| 3 | Low | `JT510-004` gave STFLY's extent as `:6121-6135`. STFLY's label is `:6123`; `:6121` is its header comment. | FIXED — extent dropped, not corrected. Line extents are the assertion class jt8-6 lost three rounds to, and the neighbouring `JT53-008` already avoids them |
| 4 | Low | `JT510-003` named a PJOY swap as a "way out" and then said it was not one, and asserted "the only ways out" — beyond what its cited `BRA` supports. | FIXED — see below; it now asserts the mechanism and no census |
| 5 | Trivial | `demo.ts` said baiters "cap at three live pteros"; `MAX_BAITERS` caps **baiters**, and a wave's own pteros are counted separately. Plus a `COROBORATION` misspelling in `ptero.ts`. | FIXED |

### The finding worth the next reviewer's time: three failed enumerations in one claim

Finding 4 took three attempts, and the sequence is the point:

1. Original: listed a PJOY swap as an escape route, then denied it was one.
2. My first correction named **five** routines as PJOY values — `PTEUP` and `PTEDN` are **branch
   targets** (`:1290`, `:1307`), never stored to PJOY.
3. My second said **four** `STD PJOY,U` sites in the ptero's code. There are **six** (`:1176`,
   `:1191`, `:1296`, `:1304`, `:1466`, `:1558`).

Each correction was more precise than the last and each was wrong. That is the jt5-5 rule arriving
in person: *when a claim keeps failing, stop correcting its values and ask what it should stop
asserting.* The claim now states only the mechanism — a PJOY store changes which routine `AIROVR`
calls next wake and does not touch the process PC — which is checkable by one grep and cannot rot.

**Structural note for the epic:** three of five defects were enumerations or extents, and
`tests/audit/citations.test.ts` cannot see any of them — it re-opens the quoted line and never
reads the claim body. Filed as a non-blocking Delivery Finding.

### What I verified rather than accepted

- **The answer itself, re-derived independently.** The chain holds: creation branches into
  `PTEFLY`'s body (`:1487`), the loop closes unconditionally (`:1510`), every flap-label mention
  lies in `:6135-6226`, the only outside doors are `STFLY` and `STFALL` (both ground-state
  transitions), `SRCADP` clamps the bird above the floor (`:1526-1531`), and `AIROVR` hands back a
  flap bit (`:6480`) that `PTEFLY` never tests. I also checked the register survives to be
  "discarded" — it is clobbered at `:1495` (`LDB PFRAME,U`), so the claim understates rather than
  overstates.
- **All six JT510 verbatims** byte-match their vendored lines; **all 47 label/line pairs** in the
  three comment blocks resolve. Four apparent mismatches were regex artifacts; the one substantive
  case (`AIROVR … :6480`) checks out — `:6480` is `AIROVR`'s tail (label `:6456`, `RTS` `:6481`).
- **No conflict with the neighbouring claim.** `JT53-008` also cites `:6135`; it and `JT510-004`
  agree, and jt5-3's phrasing avoids the extent error jt5-10's had.
- **Zero line numbers shifted**, by hunk arithmetic across all three files — which matters because
  eight `ptero.ts:N` citations live in archived sessions that cannot be corrected.

### AC verdict

AC-1, AC-2, AC-3, AC-5 met. **AC-4 is met on the recording half and OPEN on the filing half** —
the follow-up story does not exist yet. That is TEA's blocking Delivery Finding and SM's to close
at finish; it is deliberately not a blocker on this phase because no code can satisfy it. **SM must
not archive this story until the follow-up exists AND its description carries the routing** — per
jt5-5, "owned by X" is not a disposition until X's text says so.
## Impact Summary

**Blocking items: 0.** One blocking Delivery Finding existed and was CLOSED at finish.

### Every finding's disposition

| # | From | Type | Finding | Disposition |
|---|---|---|---|---|
| 1 | TEA | Gap (**blocking**) | AC-4 needs a follow-up story that EXISTS and whose description carries the ptero-vs-ptero routing — TEA cannot file stories | **CLOSED** — `jt5-16` filed (3pt, p3, `repos: arcade`), description 3058 chars carrying the full routing (`OSTHT2` :5019-5020, the `PID`/`PTEID` tests, `OSTH12`→`OSTH11`, `PTEBRD`), the port's gap, what is already done, the two guards it must update, and the demo.ts blast-radius warning. Verified by parsing, not by the add's output |
| 2 | TEA | Improvement | jt5-2 needs no ptero wing sample and should be told rather than re-deriving | **ROUTED** — recorded in jt5-16's description and in `ptero.ts`'s record; jt5-2 is an open story that will read both. Not separately filed: the finding's payoff is "do nothing", and the record is where jt5-2 looks |
| 3 | TEA | Conflict | jt5-10's own description offers two refuted signals as evidence (zeroed RUN entries; field 6) | **RECORDED, NOT REWRITTEN** — both refutations ship in `ptero.ts`, in the test file's header, and in claim JT510-006. The epic YAML's description still asserts the refuted reading; it is the historical record of why the story was filed, and the archived session is where a later reader learns which came first |
| 4 | TEA | Improvement | The ptero animates its wings (`PTESEQ`) — a reader seeing four wing frames will re-open this | **CLOSED** — disarmed in writing in `ptero.ts` and pinned by a test that requires `PTESEQ` to be named |
| 5 | Reviewer | Improvement | Whole-file token assertions about the ptero are near-vacuous in `events.ts` | **CLOSED in this story** — the assertion is now anchored per declaration line. Noted for future stories touching `events.ts` |
| 6 | Reviewer | Improvement | Three of five defects were failed enumerations/extents, and `tests/audit/citations.test.ts` structurally cannot see them (it re-opens the quoted line, never the claim body) | **NOT FILED — deliberately, and here is why.** This is the same structural complaint `jt5-6` already owns: jt5-6's description was extended at jt5-5's finish with the multi-line-table rule and the instruction to fix the gate's blindness to claim BODIES. A second story would duplicate it. jt5-6's scope already covers the body-side check this finding asks for |

### What shipped

No behaviour changed. The diff adds one comment to a filter line and is otherwise a recorded ROM
finding: a 70-line section at the foot of `ptero.ts`, a 40-line gap record at the foot of `demo.ts`,
two amended cue-kind comments in `events.ts`, six verbatim-gated claims (`JT510-001..006`), and a
30-test suite. Every edit was an EOF append or an equal-line-count in-place edit, so **not one
existing line number moved** — which matters because eight `ptero.ts:N` citations live in archived
sessions that cannot be corrected.

**The answer, for anyone grepping later: the pterodactyl never reaches FLAPLP/FLIPLP. It sounds no
wing cue, and jt5-2 needs no ptero wing sample.**
