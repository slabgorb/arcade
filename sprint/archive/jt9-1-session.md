# Session: jt9-1

## Story Details

- **Story:** jt9-1 — PJOY,U is an ENTRY ADDRESS: a glide wake skips LINET's promotion check and its lava-troll looker
- **Jira:** jt9-1
- **Epic:** jt9 — Joust: the remaining ROM-fidelity and hygiene work
- **Points:** 5 · **Priority:** p3
- **Repos:** arcade
- **Workflow:** tdd
- **Branch:** none
- **PR:** none
- **Branch Strategy:** trunk-based — work lands on `main`. `feat/jt9-1-glide-wake-prologue` is a
  zero-commit visibility beacon for sibling checkouts, never a merge target.
- **Context:** `sprint/context/context-story-jt9-1.md`
- **Started:** 2026-08-02

## Workflow Tracking

- **Workflow:** tdd
- **Phase:** finish
- **Phase Owner:** sm

---

## SM Assessment (setup)

### Board probes — clear

- `git fetch origin`, then a remote-branch grep for `jt9`: **no branch existed**. The only jt-family
  remote branch is `origin/feat/jt5-8-dumb-brain-wingbeat`, the completed predecessor's beacon.
  This story's beacon was pushed from `main` at setup without checking out, so the local checkout
  never left `main`.
- `origin/main` parsed for this story's row: `status: backlog`, unclaimed. No sibling holds it.
- Working tree clean at setup, and clean again after the measurement below.
- `git diff --name-only e1c1c62 HEAD` — the three commits since jt5-8 landed touch **sprint YAML
  only**. The code under test is byte-identical to what jt5-8's Reviewer measured, which is what
  makes that Reviewer's mutation results still citable.
- **jt9-8** (filed as jt5-9), which the description forbids landing alongside this story: still
  `backlog`. Verified, not assumed.

### The description was measured, and it was TRUE — but its fixture was under-specified in a way that would have cost TEA a day

Every ROM citation was re-opened against `reference/williams-source/joust/JOUSTRV4.SRC`, which is
present in this checkout. All exact, instruction for instruction: `:3722-3724` (the promotion
check), `:3725-3732` (the lava-troll looker, all eight instructions in the stated order),
`:3733-3757` (the lane decision), `:3746-3747` (`LNTUP` parking `#LNTOFP`), `:3759` (`LNTOFP`).
The claim that `JSR [PJOY,U]` occurs at `:5830`, `:5951` and `:6456` is not only correct but
**exhaustive** — `grep -n "\[PJOY"` returns exactly those three lines, which is what licenses
"PJOY,U is an entry address" as a structural claim rather than an example. `frame.ts:345` promotes
with no `pjoy` in the condition, as described.

**The repro was RUN, not read** — the standing rule from sw8-23. A temporary vitest file under
`plugins/joust/tests/`, four harnesses × three seeds × 3000 frames, recording every `pchase 0 → 1`
transition together with the `pjoy` the process carried *entering* that wake. Deleted afterwards;
`git status --short` empty, verified.

| harness | promotions | glide-carrying | glide-frames (non-vacuity control) |
|---|---|---|---|
| `createGame` + **both players IDLE** | **11** | **1** — 0x2468 **f=2688 proc 514** → `boundr`, entering `{kind:'glide'}` | 317 / 366 / 220 |
| `createGame` + the `scripted` inputs | 14 | **0** | 441 / 254 / 466 |
| `createWaveDemo` + `scripted` | 6 | 0 | 320 / 132 / 202 |
| `createWaveDemo` + idle | 10 | 0 | 320 / 292 / 220 |

The filed repro — seed, frame, process id, brain, carried state, *and* the "1 of 11" — is exactly
right on row one. It is wrong on every other row, and the filing named no harness. `scripted` /
`inputsAt` is the shared jt5-1/jt5-3 script, the vocabulary of every audio test in this plugin and
the coordinate system all four re-baselined files live in; it is the harness anyone would reach
for first, and on it proc 514 promotes at frame **1792** carrying nothing. **A TEA who took the
obvious path would have measured zero and concluded the finding was stale.** Written into the
description and into AC2, which now names the harness.

The control is the other half and is why the numbers above are trustworthy: glide is carried on
132–466 enemy-frames in *every* harness, so a zero is an observed zero. Handed forward because the
effect is 1-in-11 — a post-fix "count is ZERO" assertion is a hair from vacuous without it.

### Two unrouted findings the setup found, both ruled IN by the user

jt5-8's Reviewer filed seven findings. The story carried three forward (R-3, R-6, R-7). Two more
were live and owned by nobody; both were put to the user with the measurement attached and both
were folded in.

- **R-2 (MEDIUM).** The Reviewer's own disposition line reads *"file with R-1"* — and it was filed
  nowhere in jt9. `promote()` still clears `pjoy` at `enemy.ts:439`. The useful part is what the
  sweep showed: **every** promotion across all four harnesses entered carrying `none` or `glide`,
  never `'interval'` and never `'wing'`. A dumb `linet` bird's `pjoy` is only ever absent or a
  glide. So this story does not need to build the fence R-2 says cannot fail — gating promotion on
  the glide makes `pjoy: undefined` unreachable **by construction**. Filed as a *disposal* (AC6):
  delete it, or comment it as unreachable and say why. Fencing a branch that cannot be taken is
  the mistake R-2 already caught once.
- **R-4 (LOW, and live).** `audio-thud.test.ts:900-901` still claims four named seeds "are the only
  hits"; R-4 measured 36 of 400 seeds in `[0x2200,0x2390)` producing a `player-thud`, 20 at frame
  973 — ~9%, not four. This is the one story that re-opens that pin, so **its own re-baseliner is
  the reader being misled** while hunting a replacement seed. Checked the obvious alternative owner
  by mechanism rather than theme: jt9-2 converts comment line-refs to symbol-refs and would never
  touch a false census claim. Folded in as AC7.
- **R-5 needs no work and that was measured, not assumed.** Its only wrong text is in the archived
  jt5-8 Dev Assessment — dead history. The live pin at `dumb-wingbeat.test.ts:491-493` already
  carries the correct `0xface: playerUp: 153`.

R-3, R-6 and R-7 were each re-opened at their cited lines and are all still live and correctly
described — `:126` asserts only inside a `for` over `insnsIn(...)`, `:155` compares a filter to
`[]`, `enemy-contract.ts:250-253` is still a three-variant union, and `audio-flap.test.ts:707`
still reaches `entity: e!` through two optional chains.

### Handed to TEA as claims to verify, not as facts

- The 1-in-11 rarity is measured **on today's tree**. It is a property of spawn timing and the
  intelligence budget, not a law; if TEA's staging differs at all, re-measure rather than inherit.
- Whether the lava-troll looker is reachable in end-to-end play *at all* is **not** measured here.
  The uf1-9 precedent is live: it found the up-seek path entered on zero frames across three seeds
  and 6000 frames. If `PPREV`-carries-`LAVID` never happens in the seeded replays, AC3's pin is a
  unit-level one and the story should say so rather than manufacture a demo fixture quietly.
- `PLAVT,U`'s initial value and where `LNTLAV` is defined were not chased. TEA derives them from
  the source; they are the one part of block (2) the ROM excerpt above does not settle.

### Baseline, with a timestamp on it

`npx vitest run --project joust` and the orchestrator suite were **not** re-run at setup — the tree
was byte-identical to jt5-8's landing commit for all code paths, and that story recorded 129 files /
2991 tests green, lint 0, orchestrator 382/382.

**`main` IS RED RIGHT NOW, none of it is yours, and it was attributed by bisection rather than by
assertion.** The setup commit hit a push rejection; the rebase brought in a sibling checkout's RED
phase landed straight on `main` — `088bc3d test: add failing tests for sc1-1 — shell convergence
host helpers`, with `e89083c` its claim commit.

Measured at both commits, so the split is evidence and not a guess:

| | joust vitest | orchestrator |
|---|---|---|
| at `088bc3d` (sibling's tip, before my commit) | — | 382 pass / **8 fail** |
| at `f24606d` (this setup commit) | **102 files, 2463/2463 PASS** | 382 pass / 9 fail |

- **The 8 are sc1-1's**, present before this story existed: the six `AC-1`/`AC-3` shell-convergence
  cases in `tests/shell-convergence.test.mjs`, `tsc --noEmit exits 0 with the shared tests in the
  program` (its new `src/shared/tests/host-helpers.test.ts` is not yet in the program cleanly), and
  `context scope follows the archive rule — completed work is left as a record`. **Do not debug
  these and do not "fix" them** — you would be finishing someone else's RED.
- **The 9th is environmental, not a regression.** `tests/canonical-serve.test.mjs` fails only inside
  the full run; re-run alone it is **15 pass / 0 fail**. Cause identified, not assumed: `lsof` shows
  PID 11580 holding `tcp:5270` with cwd **`/Users/slabgorb/Projects/a-2`** — the sibling checkout's
  dev server owns the canonical port. If you need to serve, take a spare port
  (`npx vite --port 5290 --strictPort`) rather than killing theirs.
- **Zero failures are attributable to this story.** `--project joust` is all-green at the setup
  commit, which is the baseline you inherit.

### Setup housekeeping

- The story's description and acceptance criteria were rewritten in the epic YAML, then re-read
  back through a YAML parse (not an eyeball) to confirm 7 criteria, `points: 5`, `status: backlog`,
  `workflow: tdd`, `repos: arcade`, `type: bug`, and that six probe strings survived intact.
- Points left at 5. Both fold-ins are a deletion-or-comment and a comment reword, in files the
  story already opens.
- The context file and this session file were hand-written; the setup subagent was not spawned,
  per this session's standing instruction against the agent tool. Stated as what happened on this
  run, not as project policy.
- Labelled-token count re-run after this assessment was written, not merely after the file was
  created: the phase pointer, the repos field and the branch field each appear exactly once.

**Handoff:** To TEA (Mr. Praline) for the RED phase.
---

## Design Deviations

### TEA (test design)

- **AC3's reachability pin forces the wave instead of using natural play**
  - Spec source: context-story-jt9-1.md, AC-3
  - Spec text: "a dumb bird whose `PPREV` process carries `LAVID` enters the flapping wake regardless of its lane decision"
  - Implementation: the troll-adjacency tests advance the demo with a strip-to-players `forceAdvance` until a troll exists, rather than sweeping seeded play
  - Rationale: measured — ZERO troll-present frames across 3 seeds x 6000 frames x both harnesses, because `trollSpawnable` needs `bridgeBurned && wave >= 4` and seeded play reaches only wave 1-3. A natural-play pin would be permanently vacuous. The forcing is disclosed in a CONTROL test that states the measurement.
  - Severity: minor
  - Forward impact: none — `forceAdvance` is demo-troll.test.ts's own idiom, re-used rather than re-derived

- **AC6 is pinned as a DOMAIN claim and deliberately has no fence test**
  - Spec source: context-story-jt9-1.md, AC-6
  - Spec text: "No test is written to fence a branch that cannot be taken."
  - Implementation: one test asserts the domain fact instead (a dumb `linet` bird reaches `promote()` carrying nothing, so `pjoy: undefined` has nothing to clear)
  - Rationale: the AC forbids the fence; without something pinned, deleting the clear would be unguarded in the other direction. The domain claim is what makes the deletion safe.
  - Severity: minor
  - Forward impact: none

- **AC4 (the re-baseline) has no new TEA tests**
  - Spec source: context-story-jt9-1.md, AC-4
  - Spec text: "every moved pin re-found by sweeping for its own precondition"
  - Implementation: no test written; the bound is already asserted by the existing `rng` fingerprints and PLAYER-row pins, which must stay bit-identical
  - Rationale: AC4 governs HOW Dev re-baselines, not a behaviour. A test cannot distinguish a pin re-found by sweeping from one nudged to the new output; the guard is the existing invariants plus review.
  - Severity: minor
  - Forward impact: Dev owns AC4 end to end; the moved-pin table belongs in the Dev Assessment

- **`plavt` is read through a structural helper, not through `EnemyState`**
  - Spec source: `.pennyfarthing/gates/lang-review/typescript.md`, rule #1 (type-safety escapes)
  - Spec text: "`as unknown as T` — double-cast bypass, almost always wrong"
  - Implementation: a single narrow `e as EnemyState & { plavt?: number }` accessor
  - Rationale: AC3 ADDS the field, so the RED must reference it before it exists. CI runs `npm run lint` BEFORE the suite, so leaving `tsc` red would hide the RED rather than express it. One widening cast in one helper beats a cast per call site.
  - Severity: minor
  - Forward impact: Dev deletes the helper once `plavt` lands on `EnemyState`

### Dev (implementation)

- **TEA's troll-adjacency assertion was narrowed**
  - Spec source: `.session/jt9-1-session.md`, TEA's `RED — and the enemy behind it sees it`
  - Spec text: "the victim carries a live looker countdown"
  - Implementation: asserts every `linet` bird carries a live, wave-scaled countdown, rather than requiring the troll's immediate neighbour to
  - Rationale: at the troll wave that neighbour is frequently an already-promoted bird, and the smart brains' lookers are out of scope by AC3. The original form could only pass by porting three more brains. The narrowed form still fails on a hard-coded or absent channel, and additionally pins the DYTBL value.
  - Severity: minor
  - Forward impact: the stronger assertion becomes correct once the three lookers land — worth restoring then

- **`PPREV` does not carry across the frame boundary** (logged at review, per finding R-5)
  - Spec source: `reference/williams-source/joust/RAMDEF.SRC:240`
  - Spec text: "PPREV  RMB  2  ADDR OF PREVIOUSLY EXECUTED PROCESS BLOCK"
  - Implementation: `lastRanKind` is a `let` local to `stepFrame`, re-initialised on every call, so the first process of a frame sees no predecessor
  - Rationale: the ROM's `PPREV` is persistent RAM and really does still point at the last process of the previous frame. Modelling the carry-over would make one frame's process order observable in the next, which is a wider determinism surface than this story's ACs cover. Currently unobservable: `insertTroll` guarantees an enemy follows the troll, so a troll is never a frame's last process while any enemy exists.
  - Severity: minor
  - Forward impact: the three unported smart-brain lookers would widen the set of processes that read `PPREV`; re-assess the carry-over then

---

## Delivery Findings

### TEA (test design)

- **Conflict** (non-blocking): `ROW_DISPOSITION.LAVLAV` is recorded as `dead-in-rom` on the reasoning that "its label appears exactly ONCE in the whole of JOUSTRV4.SRC" — true of the LABEL and false of the ROW, which four brains read at `:3727`, `:3789`, `:3973`, `:4232`. DYTBL row 3 and RAMDEF's `LNTLAV` are one slot under two spellings; the initialiser at `:939-950` walks both blocks positionally, three RAM bytes per row, and 27 of the 28 names agree. Affects `plugins/joust/src/core/difficulty.ts` (the disposition and its prose), `plugins/joust/tests/difficulty-wiring.test.ts:810` and `plugins/joust/tests/seek-wiring.test.ts:544` (both guard the false claim). Now covered by AC3 and RED. *Found by TEA during test design.*
- **Gap** (non-blocking): `difficulty-wiring.test.ts`'s remainder arithmetic is stated as "28 rows − 23 wired − 1 dead-in-ROM = 4". Wiring LAVLAV makes that 24 wired / 0 dead / 4 pending — the total is unchanged but the sentence and its dead-row term are not. Affects `plugins/joust/tests/difficulty-wiring.test.ts` (the comment above the pending assertion). *Found by TEA during test design.*
- **Gap** (non-blocking): the lava-troll looker is not LINET's alone — the SAME eight instructions run in `BOUNDR` (:3787), `B2UNDR` (:3971) and `SHADOW` (:4230), each with its own branch target (`BODN1A`/`B2DN1A`/`SHUPST`), and in all three it is the brain's FIRST instruction rather than sitting under a promotion check. The port models none of the four. This story ports LINET's only, which is correct for its thesis (only LINET's sits in a skipped prologue) but leaves three real gaps. Affects `plugins/joust/src/core/enemy.ts`. Wants its own story. *Found by TEA during test design.*
- **Question** (non-blocking): `PJOY` has a THIRD meaning this story's thesis does not cover. At `:6781` the troll's own workspace gets `STU PJOY,Y  FINGER PRINT THIS PROCESS FOR THE LAVA TROLL` — the victim's workspace ADDRESS stored as data, neither an entry address nor a wing state. Worth knowing before another story reasons about `PJOY` uniformly. Affects `plugins/joust/src/core/troll.ts` if the grip is ever wired (jt9-11). *Found by TEA during test design.*
- **Improvement** (non-blocking): the story is 5 points and the user's setup ruling widened AC3 to include the troll's insertion position and the LNTLAV DYTBL wiring, on top of the ~20-pin re-baseline. 8 is a truer number. Affects `sprint/epic-jt9.yaml`. *Found by TEA during test design.*
- **Gap** (non-blocking): adding two suite files reddened `audio-seam-scope.test.ts`'s derived file-count guard (102 → 104). Corrected in `plugins/joust/README.md:48` as part of this phase; noted because the same guard fires for any story that adds or removes a suite file, and the `~2460 tests` figure beside it is indicative and was also refreshed. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the three smart-brain lava-troll lookers (`BOUNDR` :3787, `B2UNDR` :3971, `SHADOW` :4230) are what make LINET's looker observable — measured, the troll's victim runs `linet` for 1 frame in 600 before promoting, and `PLAVT,U` survives promotion by design (`LNTSMT` :3764-3775 writes PJOY only). Until they are ported, jt9-1's looker is correct, unit-tested, wired to real adjacency, and cannot change play. Affects `plugins/joust/src/core/enemy.ts`. Raises the priority of TEA's filed follow-up. *Found by Dev during implementation.*
- **Conflict** (non-blocking): the story's DETERMINISM WARNING — "this WILL move the jt2 seeded-replay pins again — the same 20-assertion, 4-file blast radius" — is false, measured. Zero pins moved; exactly one promotion shifted by one wake, on one seed, at frame 2690, ahead of every anchor on that seed. The warning was reasoned by analogy to jt5-8, which perturbed every wake rather than one. Affects `sprint/epic-jt9.yaml` (jt9-1's description) and any sibling story inheriting the same warning by analogy. *Found by Dev during implementation.*
- **Gap** (non-blocking): `tests/sprint-repo-routing.test.mjs`'s live-epic exemplar was `jt8`, which the 2026-08-02 jt9 cut took to 6/6 done — so the orchestrator suite was red on an epic that had merely finished, for anyone on `main`. Re-pointed at jt9 and re-written to assert the PROPERTY (an epic with open stories is in scope; a completed one is not) so the next cut re-points it for free. Fixed here because it blocked CI fleet-wide and the jt9 context is this story's own. Affects `tests/sprint-repo-routing.test.mjs`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `EnemyState.plavt` is now carried by every `linet` enemy in serialised sim state. No digest or fingerprint reads it today (verified — the full fleet is green), but any future whole-entity snapshot will. Affects `plugins/joust/src/core/enemy.ts`. *Found by Dev during implementation.*

---

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/joust/tests/glide-prologue-source.test.ts` — NEW. The ORACLE/provenance companion: 15 tests re-deriving the prologue's laws from the vendored 1982 source. 14 green on arrival by design (the jt5-10 ORACLE contract), 1 RED.
- `plugins/joust/tests/glide-prologue.test.ts` — NEW. The behaviour: 15 tests, 8 RED, 7 controls green.
- `plugins/joust/tests/dumb-wingbeat-source.test.ts` — R-3's two non-vacuity floors.
- `plugins/joust/tests/helpers/enemy-contract.ts` — R-6's `glide` variant, plus `plavt`.
- `plugins/joust/tests/audio-flap.test.ts` — R-7's non-null assertion replaced.
- `plugins/joust/tests/audio-thud.test.ts` — R-4's false rarity narrative.
- `plugins/joust/README.md` — the derived suite-file count.

**Tests Written:** 30 across 7 ACs (9 failing, 21 green-on-arrival oracles and controls)
**Status:** RED — `npx vitest run --project joust` → **9 failed | 2484 passed (2493)**, only the two new files red. `npm run lint` clean apart from the sibling sc1-1's `src/shared/tests/host-helpers.test.ts`.

### What the phase found that the story did not have

**1. LNTLAV is DYTBL row 3, and the port calls that row dead.** AC3 says the countdown "reloads from LNTLAV", so the row had to be identified. It is row 3 — proven positionally, not by name: the initialiser at `:939-950` walks DYTBL and DYNADJ in lockstep (`LEAX DYWLEN,X` / `LEAY 3,Y`), every one of the 28 RAM slots is exactly 3 bytes, and 27 of 28 names match. The single mismatch is slot 3, `LNTLAV` in RAMDEF against `LAVLAV` in the DYTBL comment. `difficulty.ts` records it `dead-in-rom` because "its label appears exactly ONCE in the whole of JOUSTRV4.SRC" — true of the label, false of the row — and two shipped tests guard the false claim. The user ruled the row be wired properly.

**2. AC3's condition is unreachable in play, and not marginally.** ZERO troll-present frames across 3 seeds x 6000 frames x both harnesses. `trollSpawnable` needs `bridgeBurned && wave >= 4`; seeded play reaches wave 1-3. And the ROM's `LDX PPREV` only ever fires because the troll is CREATED immediately before its victim (`LDU PPREV  AFTER PREVIOUS PROCESS (BEFORE THIS ONE)`, :6778) — our port appends it at the list end, stranding it behind every enemy. The user ruled that the insertion position be corrected too, so the looker is live rather than a pure function whose input is false forever.

**3. `PPREV` is a global, not a per-process link.** `RMB 2  ADDR OF PREVIOUSLY EXECUTED PROCESS BLOCK` (RAMDEF.SRC:240), and every one of its uses is the bare symbol — a `PPREV,U` anywhere would make it a workspace field and the looker a different question. The story's "immediately behind it in the process list" lands on the right mechanism by a loose route; the test asserts the mechanism.

### The mutation battery — two results worth keeping

Each mutant applied to a backed-up copy and restored by copy, md5 verified identical before and after.

| mutant | result |
|---|---|
| `insnsIn` returns `[]` (the empty parse R-3 names) | **kills 8**, including both formerly-floorless claims — the floors bite |
| the promotion sweep is blinded to glides (`pjoy: 'none'` always) | **the story's central RED goes GREEN**; only the CONTROL fails |

The second is the phase's most useful output. `AC2 — on the IDLE-input replay, zero promotions carry a glide` **passes** under a sweep that cannot see a glide at all. Without the positive control beside it, breaking the probe would look exactly like fixing the bug.

### The fixture correction, independently reproduced

SM's setup found the filed repro reproduces only on the idle-input replay. The RED reproduces that measurement from scratch and pins both halves: `AC2 — on the IDLE-input replay` fails with exactly `[ 'seed 0x2468 proc 514' ]`, and a sibling test records that the `scripted` harness yields zero **before and after** the fix, so a future re-baseliner cannot mistake that zero for evidence.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 source assertions match a TOKEN not the CLAIM | `refsTo` anchors to the code field with the comment stripped; `CONTROL — the reference reader can see a symbol that IS referenced many times` | green (control) |
| #15 universally-quantified loops that can skip every iteration | R-3's two floors; every span assertion pins its length first | green, mutation-proven |
| #15 every guard mutation-tested | the battery above | done |
| #18 the apparatus cannot distinguish a broken implementation | `CONTROL — the sweep can SEE a glide`; `CONTROL — the sweep finds promotions at all`; `the fixture is honest: this bird does NOT want to flap` | green (controls) |
| #17 comments asserting a mechanism nobody re-ran | R-4's rarity narrative re-measured and dropped; the `dead-in-rom` prose refuted by derivation | RED + fixed |
| #1 non-null assertion on a value that CAN be null | R-7 — `entity: e!` replaced by a defined-check | green |
| #1 type-safety escapes | one narrow accessor for `plavt`, disclosed as a deviation | green |
| #3 exhaustiveness / union completeness | R-6 — the contract type's fourth `pjoy` variant | green |
| #4 null/undefined handling | `plavtOf` returns `number \| undefined`; the countdown tests assert the value, not truthiness | RED |
| #14 derived EDGES computed inside one branch | AC1's `promotion is DEFERRED, not cancelled` — a suppression that never re-offers promotion passes the first test and fails this one | RED |

**Rules checked:** 8 of the 12 applicable lang-review rules have direct test coverage; the remainder (#6 React, #9 build config, #12 bundle, #16 a11y) do not apply to a pure-core simulation change.
**Self-check:** 4 vacuous or wrong-reason tests found and fixed during the phase — three hand-rolled `EntityState` fixtures missing `velXFrac`/`timeUp` (failing on a `TypeError`, not the defect), and one test labelled RED that was green on arrival.

**Handoff:** To Dev (Bicycle Repair Man) for implementation.
---

## Dev Assessment

**Status:** GREEN — `npx vitest run --project joust` → **2496/2496**; full fleet `npx vitest run` → **748 files / 11459 passed**; `npm run lint` → clean; `npm run test:orchestrator` → **390 pass / 0 fail**.

### What landed

| AC | Where | What |
|---|---|---|
| 1 | `frame.ts` | promotion gated on a pending glide — `enemy.pchase === 0 && !gliding && shouldPromote(next)` |
| 2 | (pin only) | the idle-input sweep is green; the glide-carrying promotion is gone |
| 3 | `enemy.ts` | `plavt` on `EnemyState`; `lavaTrollLooker()`; `dumbWingbeat` restructured so the glide wake returns BEFORE the looker |
| 3 | `frame.ts` | `lastRanKind` — `PPREV` computed from the scheduler's own wake order, across both passes, skipping napped processes |
| 3 | `difficulty.ts` | `LAVLAV` re-dispositioned `wired`, consumer named |
| 3 | `demo.ts` | `insertTroll()` — placed before its victim, not appended |
| 4 | — | nothing to re-baseline; see below |
| 5 | (TEA) | R-3/R-6/R-7 closed in the RED phase |
| 6 | `enemy.ts` | `promote()` no longer clears `pjoy`; jt5-8's AC3 fence re-staged |
| 7 | (TEA) | R-4 closed in the RED phase |

### AC4 — the predicted re-baseline did NOT fire, and that is a correction to the story

The story budgeted for "the same 20-assertion, 4-file blast radius jt5-8 just re-baselined". **Zero
pins moved.** Not one seeded-replay fingerprint, frame anchor or entity digest changed.

Verified rather than assumed — I measured the actual behavioural delta:

```
0xbeef: 4 promotions  f1/p256  f1324/p512  f1792/p513  f2688/p514   (unchanged)
0x2468: 5 promotions  f1/p256  f897/p257   f1536/p512  f1792/p513  f2690/p514
0xface: 2 promotions  f1/p256  f897/p258                            (unchanged)
```

**Exactly one promotion moved: 0x2468 process 514, frame 2688 → 2690** — deferred by one wake
(2 frames at `EMYTIM_SLOW`), which is precisely the single glide-carrying promotion SM and TEA both
measured. Every promotion now enters carrying `none`.

**Why the analogy to jt5-8 was wrong.** jt5-8 changed the *wingbeat*, which alters flap timing on
every dumb bird on every wake — a continuous perturbation. jt9-1 changes only *which wake a
promotion lands on*, and only when a glide is pending at that exact instant: once in 3000 frames
across three seeds. The `audio-*` pins on 0x2468 sit at frames 188, 755 and 900, all far ahead of
2690, so nothing downstream of them observes it. The looker adds no perturbation at all in seeded
play, because trolls need wave 4 and seeded play reaches wave 1-3.

### The reachability gap — reported straight, because it is not closed

The user's ruling was "model it AND make it reachable". The insertion is now ROM-faithful and the
channel is fed from real adjacency — both are tested. **The forcing branch still does not fire in
play, and I measured why rather than inferring it.**

- At the troll wave the process immediately after the troll is a **`linet` bird on all six seeds
  probed** — so the placement is right.
- But that bird stays `linet` for **1 frame out of 600**. It promotes on its very first wake (wave 4
  has budget room), and `frame.ts` promotes BEFORE `stepEnemyDetailed`, so on the one wake its
  looker would first come due, the brain is already `boundr`.
- Differential proof: stepping the same demo with the troll in its ROM position versus at the list
  end produces **byte-identical enemy state for 300 frames on three seeds**.

**The blocker is precisely the three unported lookers.** The same eight instructions run in `BOUNDR`
(:3787), `B2UNDR` (:3971) and `SHADOW` (:4230) — in each of them as the brain's FIRST instruction —
and `PLAVT,U` deliberately survives promotion (`LNTSMT` at :3764-3775 writes NSMART, PCHASE and
`STX PJOY,U`, and nothing else), which is exactly how the machine keeps the countdown running across
the promotion this port loses it at. Porting LINET's alone is correct for this story's thesis and
insufficient for the behaviour to be observable. That raises the priority of TEA's filed follow-up
from "three more gaps" to "the thing that makes jt9-1's looker matter".

I did not widen scope to port them: they branch into three different brain STATES
(`BODN1A`/`B2DN1A`/`SHUPST`), not into a shared flap, and they would move determinism. That is a
story, not a drive-by.

### jt5-8's AC3 fence was re-staged, not re-baselined

Its fixture — a bird promoted mid-glide — is now unreachable, so the group would have had to be
deleted or quietly re-baselined to the new output. Neither: the law ("no leftover obligation
survives promotion") is now guaranteed structurally, so the group asserts *that*, plus a **control**
proving the identical bird with the obligation removed still promotes. Without the control the fence
would pass for a bird that could never promote under any circumstances.

One real finding came out of re-staging it: the reference fixture had to gain `plavt`, because
promotion CARRIES it. That is the ROM (`LNTSMT` touches PJOY only), and asserting otherwise would
have been a new false claim in the place I was fixing one.

### Deliberately not done

- **The `dead-in-rom` category is now empty but kept.** It is a real distinction and the guard
  asserts the set is empty, so a future story re-inventing a dead row without checking how its
  consumer addresses the table will fail rather than pass quietly.
- **`insertTroll` places the troll before the FIRST enemy**, not before a grabbed victim. We do not
  model grabbing (jt9-11), so any victim choice is arbitrary; this is the closest honest reading of
  "AFTER PREVIOUS PROCESS (BEFORE THIS ONE)" available without inventing a binding.

---

**Handoff:** To Reviewer (The Argument Professional).
---

## Subagent Results

Eight of the nine specialists are disabled in this repo's settings (`pf settings get
workflow.reviewer_subagents` — only `preflight` is `true`; `rule_checker` was `true` at jt5-8 and is
now `false`). Their domains were assessed by the Reviewer directly rather than claimed as covered,
and the primary instrument was a **mutation battery**, since re-reading code one has just written
finds nothing.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — every number re-run independently, see below |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer; the glide/looker/promotion boundaries are mutants M1, M3, M4 |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer: no `try`/`catch`, no fallback, no swallowed path in the diff; `lavaTrollLooker` and `insertTroll` are total over their inputs |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer via mutation, which produced R-1, R-2 and R-3 (three SURVIVING mutants) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — all 12 new ROM citations re-opened against the vendored source; produced R-5 |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — `PjoyState` unchanged at four variants, `plavt` optional on the `homing`/`seek` precedent, no new `switch`; produced R-4 |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer: no I/O, no network, no auth, no user-supplied string reaches the diff; a pure offline simulation |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — assessed by Reviewer: `lavaTrollLooker` is one function with one early return; no redundancy found |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Disabled via settings (changed since jt5-8) — the rule enumeration below was done by hand |

**All received:** Yes (1 enabled specialist returned, 8 pre-filled as disabled)
**Total findings:** 5 confirmed, 0 dismissed, 0 deferred

**Preflight was not taken on trust.** Re-run independently: `npx vitest run --project joust` →
104 files / 2496 tests; full fleet `npx vitest run` → 748 files / 11459 passed; `npm run lint` → 0;
`npm run test:orchestrator` → 390/0; `git status --short` → empty.

---

## Reviewer Assessment

**Verdict:** REJECTED

### The mutation battery — three mutants SURVIVED

Every mutant applied to a backed-up copy and restored by copy, md5 verified identical before and
after. Full joust suite (2496 tests) run against each.

| # | mutant | result |
|---|---|---|
| M1 | drop the `!gliding` promotion gate | **5 fail** — load-bearing |
| M2 | revert `insertTroll` to a plain append | **1 fail** — guarded, barely |
| M3 | the looker ignores `lavaBehind` and always forces | **30 fail** — strongly guarded |
| M4 | `plavt` ticks on a GLIDE wake | **SURVIVES — 2496 pass** |
| M5 | reload from a hardcoded `16` instead of the DYTBL row | **2 fail** — guarded |
| M6 | `insertTroll` places the troll AFTER its victim | **SURVIVES — 2496 pass** |
| M7 | `lavaBehind` hard-wired to `false` (the channel severed) | **SURVIVES — 2496 pass** |
| M8 | the looker never reloads (`plavt` sticks at 0) | **2 fail** — guarded |

Three survivors, all on AC3, and together they mean **the production wiring this story exists to
build has no guard at all.** That is the same defect class this story was filed to fix — twice over,
in R-3's missing floors and R-4's false prose. Shipping it here would be the joke telling itself.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[TEST]` | **R-3** — M7: `lavaBehind` can be hard-wired to `false` and **all 2496 tests pass**. AC3's deliverable is that the looker is fed from real scheduler adjacency; every looker test injects `lavaBehind` directly into `stepEnemyDetailed`, so `frame.ts`'s entire `lastRanKind` computation — the `PPREV` model, the pass-boundary behaviour, the napped-process skip — is unexercised. The one test that touches production adjacency asserts only that `plavt` is a number, which M7 leaves true | `plugins/joust/src/core/frame.ts:430-449`, `plugins/joust/tests/glide-prologue.test.ts` | A test that stages a troll immediately before a LINET bird through the real scheduler and asserts the bird's decision CHANGES — the differential Dev ran by hand and did not keep |
| [MEDIUM] `[TEST]` | **R-1** — M4: making `plavt` tick on a GLIDE wake passes everything. "Every instruction ABOVE :3759 is skipped" is this story's central claim and the looker half of it is unpinned. A refactor that moves the tick into the glide path halves the looker's period silently | `plugins/joust/src/core/enemy.ts:1264-1271` | Assert a glide wake leaves `plavt` UNCHANGED — one test, and it is the only observable form the claim has |
| [MEDIUM] `[TEST]` | **R-2** — M6: placing the troll AFTER its victim instead of before passes everything. `expect(procs[at + 1]?.kind).toBe('enemy')` is true for both placements whenever two or more enemies exist — and six do at the troll wave. The ROM claim the insertion rests on is `:6778` "AFTER PREVIOUS PROCESS (**BEFORE THIS ONE**)", and that word is exactly what the test cannot see | `plugins/joust/tests/glide-prologue.test.ts` (the insertion test) | Capture the victim's id BEFORE the spawn and assert the troll precedes THAT id, not merely some enemy |
| [MEDIUM] `[RULE]` | **R-4** — AC6 traded a mechanical guarantee for an unenforced invariant. Demonstrated, not argued: `promote({pchase: 0, brain: 'boundr', pjoy: {kind: 'interval', timer: 9}})` now returns the enemy still carrying `{kind:'interval',timer:9}`, where jt5-8 returned `undefined`. Unreachable today — both spawn sites pair `pchase: 0` with `brain: 'linet'` (`demo.ts:425`, `:654`) and nothing demotes — but nothing enforces it either, and `promote()` already throws on the adjacent invariant two lines above | `plugins/joust/src/core/enemy.ts:438-452` | Extend the existing throw: if `pjoy` is present and is not a glide, that is the same class of impossible state the `pchase !== 0` guard already refuses |
| [LOW] `[DOC]` | **R-5** — undocumented deviation. `lastRanKind` is re-initialised on every `stepFrame`, so the first process of a frame sees no predecessor. The ROM's `PPREV` is a persistent RAM global that carries across the frame boundary. The code comment acknowledges this ("the `LDX PPREV` the ROM leaves pointing at whatever ran last") and then does something else, calling it "the conservative reading" — a real fidelity divergence, in a fidelity story, not logged in `## Design Deviations`. Currently unobservable: `insertTroll` guarantees an enemy follows the troll, so a troll is never the frame's last process while any enemy exists | `plugins/joust/src/core/frame.ts:443` | Log it as a deviation, or model the carry-over. Do not leave it as a comment only |

One HIGH → **REJECT**. R-1, R-2 and R-3 are one afternoon's work between them and belong in this
story, not a follow-up: filing "we did not guard the thing" as a future ticket is precisely the
pattern jt9-1 was filed to correct.

### Rule Compliance

Checked exhaustively against `.pennyfarthing/gates/lang-review/typescript.md`, `CLAUDE.md`, and the
plugin's conventions — every instance, not one exemplar per rule.

- **Core/shell boundary (CLAUDE.md's "single most important rule") — COMPLIANT.** All four changed
  production files are `src/core/`. The diff adds no `Date.now`, `Math.random`, `performance.now`,
  DOM access or `../shell/` import. `purity.test.ts` + `purity-scanner.test.ts` → **75/75 pass**.
  Evidence: `lavaTrollLooker` (`enemy.ts:1300-1318`) reads only its four parameters and returns
  fresh objects; `insertTroll` (`demo.ts`) is two array slices.
- **Determinism — COMPLIANT.** `plavt` rides `EnemyState`, part of serialised process state, not a
  module-level variable. `lastRanKind` is a `let` **local to `stepFrame`**, re-initialised per call —
  I checked specifically that it does not persist across frames, because a scheduler-scoped mutable
  would make replays order-dependent. No `Map`/`Set` keyed on object identity is introduced. The
  evidence is the suite: all three `rng` fingerprints and every seeded-replay pin pass unchanged.
- **ROM-citation accuracy — COMPLIANT.** All twelve new citations re-opened by hand against
  `reference/williams-source/joust/JOUSTRV4.SRC` and `RAMDEF.SRC`: `:3345`, `:3722-3724`,
  `:3725-3732`, `:3746-3747`, `:3759-3762`, `:3764-3775`, `:3787`, `:3971`, `:4230`, `:6775`,
  `:6778`, `:939-950`, `:7306`, `RAMDEF:240`, `RAMDEF:391`. Every one says what its comment claims.
  The `:6778` comment text ("AFTER PREVIOUS PROCESS (BEFORE THIS ONE)") is quoted verbatim.
- **Rule #14, derived EDGES computed inside one branch — COMPLIANT.** `lastRanKind` is assigned at
  the single point after `runBehaviour` inside `pass`, which every non-napped process flows through,
  and the napped early-return correctly does NOT update it (a napped process does not execute, so it
  is not `PPREV`). Both passes share the one variable, so the primary→secondary boundary is handled
  by construction rather than by a special case.
- **Rule #15, source assertions and mutation-testing — TWO VIOLATIONS (R-1, R-2) plus R-3.** The rule
  says plainly: "Every guard must be mutation-tested: delete the mechanism and require red." Three
  mechanisms are not.
- **Rule #17, comments asserting a mechanism nobody re-ran — ONE VIOLATION (R-5).** The `lastRanKind`
  comment states the ROM's behaviour and then describes a departure from it as a reading of it.
- **Exhaustive union handling — COMPLIANT.** `PjoyState` is unchanged at four variants; jt9-1 adds no
  variant and no `switch`. `plavt` is `number | undefined` and every read narrows through `?? 0`
  (`enemy.ts:1307`) or an explicit `typeof` check in tests. `tsc --noEmit` clean.
- **Type-safety escapes — COMPLIANT in production.** No `as any`, `@ts-ignore`, `as unknown as` or
  non-null assertion in the four production files. The one widening cast is in a test helper
  (`plavtOf`), disclosed as a deviation by TEA and correctly scoped to disappear — except it has
  NOT disappeared: `plavt` now exists on `EnemyState`, so `plavtOf`'s cast is dead weight. Minor;
  folded into R-1's fix rather than filed separately.
- **No dead code / unwired feature — SEE R-3.** `lavaTrollLooker` is reached from
  `stepEnemyDetailed` unconditionally for `linet` birds, and `plavt` is written in real play
  (measured: every LINET bird carries a live countdown at wave 4). But its `lavaBehind` arm is
  never taken in production, which Dev disclosed accurately and in detail. That disclosure is why
  this is R-3 (a missing guard) rather than a dishonesty finding.

### Devil's Advocate

Argue this is broken. Start with the thing that looks strongest: Dev measured that the change moves
exactly one promotion, on one seed, by one wake, and concluded the story's determinism warning was
false. Suppose instead the change is nearly inert because it barely runs. The gate fires once in
3000 frames per three seeds; the looker's forcing arm fires never. A reviewer who accepted "green
suite plus one moved frame" as proof of life would be accepting a mechanism that touches production
almost nowhere — and M7 proves the point cruelly, because severing the channel entirely changes no
test outcome at all. If `lavaBehind` had been mis-wired from the very first commit — reading the
wrong pass, or the process *after* rather than *before* — every test in this story would still be
green and Dev's own differential (which he ran and then did not keep) is the only thing that would
ever have caught it. That is not a hypothetical: M6 shows the placement can be inverted with zero
signal, and inverting the placement is the single most likely mistake when porting "BEFORE THIS ONE"
from a linked-list machine to an array.

Next, the confused user — here, the next story's author. They read `enemy.ts` and see a looker with
a wave-scaled DYTBL period and a clean early return. Nothing tells them the countdown must not tick
on a glide wake; the only statement of it is prose, and M4 proves prose is all it is. They refactor
the glide branch to share the tick "for symmetry", halve the looker's period, and every test stays
green. Meanwhile the `dead-in-rom` category is now empty but retained, which reads as vestigial to
anyone who did not follow this story — and the guard asserting it is empty could equally be read as
an invitation to delete the category.

Finally, the stressed input. `waveValue` throws a `RangeError` on `wave < 1`, and the looker calls
it on every expiry. `stepEnemyDetailed` defaults `wave` to 1 and `frame.ts` defaults to 1, so
production cannot reach it — but a test or a future caller passing `wave: 0` now gets a throw from
inside a brain step where previously the same call was never made. Not a finding today; worth knowing
it is one `?? 1` away from being one.

The devil's advocate found nothing new that the battery had not, which is the one reassuring result
in this section: the failures are all missing guards, not wrong behaviour.

### Observations

- `[VERIFIED]` The promotion gate is load-bearing and correctly deferred rather than cancelled —
  evidence: `frame.ts:354` reads `enemy.pjoy?.kind === 'glide'` computed at `:353`; M1 kills 5 tests;
  and the measured delta shows 0x2468/p514 moving 2688 → 2690, i.e. one wake at `EMYTIM_SLOW`, not
  suppressed. Complies with rule #14 (the edge is taken at the single dispatch point).
- `[VERIFIED]` The DYTBL correction is independently sound — evidence: I re-derived the alignment
  without the port's decoder (28 slots, all 3 bytes, 27/28 names equal, sole mismatch at slot 3) and
  re-opened all four `LDA LNTLAV` sites. `ROW_DISPOSITION.LAVLAV` at `difficulty.ts:313` now names
  its consumer, and the emptied `dead-in-rom` category is asserted rather than merely vacated.
- `[VERIFIED]` jt5-8's AC3 fence was re-staged, not deleted or silently re-baselined — evidence:
  `dumb-wingbeat.test.ts` now carries four tests where one stood, including a control proving the
  same bird without the obligation still promotes. The `plavt`-in-the-reference detail is correct
  against `LNTSMT` (:3764-3775 writes NSMART, PCHASE and `STX PJOY,U`, nothing else).
- `[MEDIUM]` `[TEST]` R-1, R-2 — see the table.
- `[HIGH]` `[TEST]` R-3 — see the table.
- `[MEDIUM]` `[RULE]` R-4 — see the table.
- `[LOW]` `[DOC]` R-5 — see the table.
- `[VERIFIED]` No security surface — evidence: the diff is four pure-core simulation files plus
  tests; no I/O, no network, no auth, no deserialisation, no user-supplied string. Tenant isolation
  is not applicable to this repo (a single-origin static arcade with no backend).
- `[LOW]` `[SIMPLE]` `plavtOf` in `glide-prologue.test.ts` is now redundant — TEA added the cast so
  the RED could reference a field that did not exist; `plavt` exists now. Fold into R-1's fix.

### Deviation Audit

- **AC3's reachability pin forces the wave (TEA)** → ✓ ACCEPTED by Reviewer: the zero-troll
  measurement is reproduced and the forcing is disclosed in a control that states it.
- **AC6 pinned as a DOMAIN claim with no fence test (TEA)** → ✗ FLAGGED by Reviewer: the reasoning
  was right when written, but the domain claim it rests on is unenforced — see R-4. The AC's "no
  test" instruction is satisfied; what is missing is the invariant guard, not a test.
- **AC4 has no new TEA tests (TEA)** → ✓ ACCEPTED by Reviewer: correct, and vindicated — the
  re-baseline did not fire, and Dev measured the delta rather than asserting it.
- **`plavt` read through a structural helper (TEA)** → ✓ ACCEPTED with a note: the forward-impact
  line said Dev deletes it once `plavt` lands. It landed; the helper did not go. See the `[SIMPLE]`
  observation.
- **TEA's troll-adjacency assertion narrowed (Dev)** → ✓ ACCEPTED by Reviewer as to scope — requiring
  the immediate neighbour to be dumb would indeed have needed three unported brains. But the
  narrowed form is what M6 walks through untouched, so accepting the narrowing does not accept the
  test that replaced it; see R-2.

### Reviewer (audit) — undocumented deviation

- **`PPREV` does not carry across the frame boundary:** Spec (the ROM) has `PPREV` as a persistent
  RAM global — `RMB 2  ADDR OF PREVIOUSLY EXECUTED PROCESS BLOCK` (RAMDEF.SRC:240) — so the first
  process of a frame sees the last process of the previous one. The code re-initialises
  `lastRanKind` per `stepFrame`. Disclosed in a code comment, not logged by Dev. Severity: LOW
  (unobservable while `insertTroll` guarantees an enemy follows the troll).

**Handoff:** Back to Dev (Bicycle Repair Man) — REJECTED, four findings to close (R-1, R-2, R-3, R-4)
and one to log (R-5).

---

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

### Every finding closed, and each fix re-verified by the mutant that found it

The round-1 verdict rested on three mutants surviving all 2496 tests. The test of a fix for a
missing guard is not that the suite is green — it was already green — but that the mutant now dies.
All four were re-run, each against a backed-up copy, restored by copy, md5 verified.

| # | mutant | round 1 | round 2 |
|---|---|---|---|
| M4 | `plavt` ticks on a GLIDE wake | **survived** (2496 pass) | **1 fail** — killed |
| M6 | troll placed AFTER its victim | **survived** (2496 pass) | **1 fail** — killed |
| M7 | `lavaBehind` hard-wired to `false` | **survived** (2496 pass) | **1 fail** — killed |
| M9 | `promote()` accepts a stale non-glide `pjoy` | n/a (guard did not exist) | **1 fail** — killed |

M9 is worth calling out: the R-4 fix was added WITHOUT a test first, and the battery caught that
immediately — a new guard is itself an unguarded mechanism until something mutates it. That is the
round-1 lesson applied to round 1's own remedy.

### What the fixes actually changed, judged rather than accepted

- **R-3 (HIGH) — properly closed.** The new test drives the real `stepGame` twice over the same
  dumb bird, once with a troll preceding it and once with that troll behind it, and asserts only the
  first parks a glide. It exercises `frame.ts`'s `lastRanKind` end to end — the pass ordering, the
  napped skip, the assignment point — rather than injecting the answer. The fixture is honest: it
  asserts `linet(enemy).flap === false` up front, so the forced flap cannot be the lane decision
  agreeing by luck. `[VERIFIED]` — evidence: `glide-prologue.test.ts`, the `run([troll, bird])` vs
  `run([bird, troll])` pair; M7 now fails.
- **R-1 — closed with a control.** Asserts a glide wake leaves `plavt` at 5, then that the following
  LINET wake takes it to 4. The control matters: without it the assertion passes for a countdown
  that never moves at all, which is a different bug wearing the same green.
- **R-2 — closed positionally, and the converse asserted too.** `firstEnemy === t + 1` distinguishes
  before from after; the added `procs.slice(0, t).filter(kind === 'enemy')` being empty closes the
  symmetric loophole. Correctly no longer relies on a repeatable `kind`.
- **R-4 — closed the right way.** The invariant is refused where the neighbouring impossible state
  is already refused (`enemy.ts`, beside the PCHASE throw), not by re-adding the clear AC6 removed.
  Re-adding it would have restored jt5-8's exact defect: a branch no input can take, passing
  forever. The test carries a CONTROL proving the same enemy without the state promotes cleanly, so
  the throw is attributable to the `pjoy` and not to the fixture.
- **R-5 — logged.** Now a six-field deviation entry naming the ROM spec, the departure, why it is
  currently unobservable, and what would change that (the three unported lookers).

### Residual, accepted

- The `dead-in-rom` category is empty but retained, with a guard asserting it is empty. Accepted:
  the distinction is real and the guard is what catches a future story re-inventing a dead row from
  a label census — the exact mistake this story corrected.
- The looker's `lavaBehind` arm still cannot fire in natural play, for the reason Dev measured and
  disclosed (the troll's victim promotes on its first wake; the three smart-brain lookers are
  unported). That is a filed follow-up, not a defect in this diff, and it is now GUARDED — M7 proves
  the channel is live even though play does not currently reach it.
- `waveValue` throws a `RangeError` on `wave < 1` and the looker calls it on every expiry.
  Unreachable (both callers default to 1). Noted, not filed.

### Gates

`npx vitest run --project joust` → **104 files / 2499 passed**. Full fleet → **748 files / 11462
passed**. `npm run lint` → clean. `npm run test:orchestrator` → **390 pass / 0 fail**.
`git status --short` → empty.

**Handoff:** To SM (The Announcer) for the finish ceremony.