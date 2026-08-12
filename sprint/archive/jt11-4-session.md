---
story_id: "jt11-4"
jira_key: "jt11-4"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-4: Enemies materialize one-by-one on the pads: replace the one-frame batch insert with pending-arrival schedule + wire the transporter ServiceQueue

## Story Details
- **ID:** jt11-4
- **Jira Key:** jt11-4 (no Jira server — arcade tracks locally in sprint YAML; the key is the story id)
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 5
- **Priority:** p1
- **Repos:** arcade
- **Repo path:** plugins/joust/src/core
- **Branch:** none
  (was `feat/jt11-4-serve-queue-enemy-arrival-cadence`; merged and auto-deleted at PR #290, so the
  work is verified via `develop` instead — the literal `none` is finish's escape hatch)
- **Branch Strategy:** gitflow (base `develop`)
- **PR:** https://github.com/slabgorb/arcade/pull/290

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T17:51:58Z
**Round-Trip Count:** 1

> **Phase corrected by hand from `finish` back to `green` (rework).** The Reviewer verdict is **REJECTED**
> (two HIGH findings), and the approval gate's own `recovery_config` specifies
> `reviewer-verdict: {action: rework, target_phase: green}`. But `pf handoff complete-phase` advanced
> `review → finish` regardless of the verdict, and `pf workflow fix-phase jt11-4 green` refuses with
> "Target phase 'green' is not ahead of current phase 'finish'" — both are forward-only. Left uncorrected,
> SM would have picked this up as ready to finish and shipped a story with a known gameplay regression.
> **This is a pf defect worth filing:** a REJECTED verdict must not advance to `finish`, and the recovery
> route the gate itself declares must be executable.

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T11:50:42Z | 2026-08-12T11:55:11Z | 4m 29s |
| red | 2026-08-12T11:55:11Z | 2026-08-12T12:06:47Z | 11m 36s |
| green | 2026-08-12T12:06:47Z | 2026-08-12T13:24:28Z | 1h 17m |
| review | 2026-08-12T13:24:28Z | 2026-08-12T14:22:16Z | 57m 48s |
| ~~finish~~ (entered in error — REJECTED verdict, see note below) | 2026-08-12T14:22:16Z | 2026-08-12T14:22:16Z | 0s |
| green | 2026-08-12T14:22:16Z | 2026-08-12T15:01:16Z | 39m |
| review | 2026-08-12T15:01:16Z | 2026-08-12T16:59:35Z | 1h 58m |
| green | 2026-08-12T16:59:35Z | 2026-08-12T17:15:21Z | 15m 46s |
| review | 2026-08-12T17:15:21Z | 2026-08-12T17:51:58Z | 36m 37s |
| finish | 2026-08-12T17:51:58Z | - | - |

## Problem Summary

Wave entry currently inserts all enemies in a single frame (one-frame batch) via `spawnWaveEnemies` (sim.ts:1209-1219), wave-1 construction (sim.ts:1238-1242), and wave advance (sim.ts:2261-2271). The ROM's authentic `ServiceQueue` (NPSERV/LESERV JOUSTRV4.SRC:5615-5676) implements a take-a-number serving law (`newServiceQueue`/`takeEnemyNumber`/`enemyTurn`/`serveEnemy`/`nextServed` in transporter.ts:155-202) with per-enemy deferral via `spawnProceeds` empty-third logic (transporter.ts:149, JOUSTRV4.SRC:5641-5654) and a proven ptero-stagger template (sim.ts:2303-2334, PTERWV JOUSTRV4.SRC:2618-2624). Today all three are implemented and tested but **completely unwired** from wave insertion — sim.ts imports only `enterViaPads`/`beginMaterialise`/`stepMaterialise`/`PADS` (sim.ts:91-101).

## Acceptance Criteria

1. **Replace batch insertion with per-enemy arrival schedule:** The one-frame batch insert (spawnWaveEnemies loop sim.ts:1209-1219) is replaced with a per-enemy cue schedule using the ROM's `ServiceQueue` take-a-number serving laws (newServiceQueue/takeEnemyNumber/enemyTurn/serveEnemy/nextServed, transporter.ts:155-202, NPSERV/LESERV JOUSTRV4.SRC:5615-5676).

2. **Wire spawnProceeds empty-third deferral:** `spawnProceeds(occ, tier)` (transporter.ts:149, JOUSTRV4.SRC:5641-5654) returns `occ[tier] === 0` — the **empty-third-of-the-SCREEN** rule over the arena's top/middle/bottom thirds. An arrival bound for an occupied third is held and retried later; one bound for an empty third proceeds. It is a spatial gate, **not** a time window. Release also requires `enemyTurn(q, ticket)` (ticket order, and players served ahead of enemies, JOUSTRV4.SRC:5672-5675), with `serveEnemy(q)` advancing the counter. Implemented and tested in transporter.ts; zero production callers today.

3. **Use ptero-stagger template:** The arrival-schedule implementation mirrors the proven `pendingPteros` countdown pattern (sim.ts:2303-2334, PTERWV JOUSTRV4.SRC:2618-2624) — a list of pending arrivals keyed by countdown tick, deferring each enemy's insertion to its own `beginMaterialise` window (`MATERIALISE_WINDOW`, sim.ts:406; birth frame sim.ts:598-599).

4. **Enemy factory and materialise effect unchanged:** no modifications to `enemyProcess`, the `materialise` effect, or the core sim contract — **only insertion timing moves** (immediate batch → deferred stagger), the story's own wording. `spawnWaveEnemies` (sim.ts:1209-1219) necessarily changes from *inserting* to *enqueueing*; what must not change is the enemy specs it builds.

5. **Wave advance mutation preserved:** Wave advance via `processes=[...processes,...arrivals]` (sim.ts:2261-2271) is preserved — `arrivals` queue now contains the deferred ServiceQueue, fed the same enemy specs but release-framed per-schedule instead of per-loop.

6. **Tests green, core-boundary intact:** All arrival cadence code is pure core (sim.ts, transporter.ts) with no shell dependencies (clock, DOM). Purity guard scans for violations. Pre-existing tests stay green (verify fixture determinism against seeded replays).

7. **ROM fidelity:** Each enemy's `beginMaterialise` window (MATERIALISE_WINDOW sim.ts:406) is its own release frame, implementing the authentic ROM pattern where enemies materialize with staggered presence on the pads — JOUSTRV4.SRC:2618-2624 (PTERWV) and JOUSTRV4.SRC:5615-5676 (NPSERV/LESERV).

## Delivery Findings

**SM setup correction (2026-08-12) — read before writing the RED tests.** The first draft of this session and of
`sprint/context/context-story-jt11-4.md` described `spawnProceeds` as an "empty-third-of-a-second deferral". That is
false. `transporter.ts:149` reads `occ[tier] === 0` over `AreaOccupancy {top, middle, bottom}` — the empty **third of
the screen**, a spatial gate with no duration in it. Both files are corrected; the full serving law, the real function
signatures (`serveEnemy(q)` takes no ticket; `nextServed(q)` returns `'player'|'enemy'|'idle'`, not a position) and the
players-ahead-of-enemies clause in `enemyTurn` are written out in the context file. Verify signatures against
`plugins/joust/src/core/transporter.ts` rather than against any prose, including this.

No upstream findings from prior stories.

### TEA (test design)

- **Conflict** (blocking): AC-3 attributes the empty-third rule to the enemy arrival path, but JOUSTRV4.SRC:5641-5654
  is inside CREPLY, the PLAYER create path; the enemy path (CREEM/CRELP, :5663-5709) has no AREA test at all.
  Affects `sprint/context/context-story-jt11-4.md` (AC-3 and the AC-9 mention of `spawnProceeds` must be struck or
  re-scoped to the player path) and `sprint/epic-jt11.yaml` (the jt11-4 title and the epic description's defect (5)
  repeat the same misattribution). *Found by TEA during test design.*
- **Gap** (non-blocking): the ROM's real enemy-side deferral is transporter occupancy — `GOTTR INC [TCURUSE,X]`
  marks a pad in use (:5710), the GOTR1..GOTR4 fall-through hunts a free one, and `BNE CRELP` (:5709) sends the
  enemy back to nap another frame when all four are busy. This port models no pad-in-use state, so nothing can
  currently defer an enemy whose pad is taken. Affects `plugins/joust/src/core/transporter.ts` (needs a
  `TCURUSE`-equivalent free/in-use predicate) and the wave-entry path that would consult it. Out of scope for
  jt11-4 as scoped; worth its own story. *Found by TEA during test design.*
- **Improvement** (non-blocking): `spawnProceeds` is correctly transcribed and unit-tested but will still have zero
  production callers after this story, since it belongs to the player create path and jt11-1 wired player mounts
  without a transporter queue. Affects `plugins/joust/src/core/transporter.ts` (the dead-code condition that
  motivated this epic persists for the player half of the serving law: `takePlayerNumber`, `playerTurn`,
  `servePlayer`, `nextServed`, `spawnProceeds`). *Found by TEA during test design.*
- **Conflict** (non-blocking): the story context's "Key Invariants" block still says the `spawnWaveEnemies` loop
  structure remains unchanged, which contradicts the corrected AC-5 ("`spawnWaveEnemies` necessarily changes from
  *inserting* to *enqueueing*"). Affects `sprint/context/context-story-jt11-4.md` (the Key Invariants bullet).
  Higher-authority AC-5 governs; the stale bullet should be struck so the Reviewer does not read it as a
  constraint. *Found by TEA during test design.*

### Dev (implementation)

- **Conflict** (blocking — RESOLVED in-story, commit `44bda2c7`): AC-3 is not implemented, and the specs that
  demanded it have been corrected rather than left to mislead a future story. AC-3 is struck with its reason,
  AC-3b records the real cadence law (WCREATE `PCNAP 61`), AC-9 no longer lists `spawnProceeds` among the callers
  to wire, the Technical Approach and Key Invariants blocks are reconciled, and the epic's jt11-4 title and
  defect (5) are corrected. Original finding follows. TEA's
  finding was verified independently against the source before writing any code: `WCREATE`'s AREA tests
  (`LDA AREA3 / BNE 50$` …, :5644-5658) sit above `CREEM` and are reached only through `CMPA #PLYID / BEQ CREPLY`
  (:5670-5671) — the **player** create path. The enemy path (`CREEM` :5663-5666, `CRELP` :5667-5677) tests
  `NPSERV`/`LPSERV` (players first) and `LESERV` (its turn) and nothing else. `spawnProceeds` was therefore NOT
  wired into enemy arrivals. AC-3 and the epic's defect (5) still carry the misattribution and should be struck or
  re-scoped to the player path before this story is called done. *Confirmed by Dev during implementation.*
- **Gap** (non-blocking, TEA's pad-occupancy Gap confirmed and unchanged): still not modelled.
  `GOTTR INC [TCURUSE,X]` (:5710) marks a pad in use, the arrival holds it 30 frames (`LDA #30 / STA PFRAME`,
  :5726-5727), and `BNE CRELP` (:5709) re-naps an enemy when all four pads are busy. This port has no pad-in-use
  state, so `serveEnemies`' one-service-per-frame rule stands in for it — documented in the function's doc comment.
  Worth its own story. *Confirmed by Dev during implementation.*
- **Improvement** (non-blocking — DONE in-story, commit `3ce7142a`): `src/core/sim.ts` was the **production**
  simulation, not a demo — `game.ts` builds real games with it and `stepGame` delegates every frame to it (the
  one-sim seam). Renamed to `src/core/sim.ts`, which also makes joust agree with the five other games that
  already spell it that way, with the `Demo*` symbols moving too (`SimState`, `SimProcess`, `SimCore`, `SimEvent`,
  `createWaveSim`, `stepSim`, `loadSim`, `sim-contract.ts`). `'demo'` was kept where it genuinely means a demo:
  the attract-mode page in `attract-scheduler.ts`/`main.ts`. 134 files; tsc, all four suites and the joust build
  verified after. **Note for jt11-5:** it is specced against `sim.ts` paths — the live epic and context files
  were updated to `sim.ts`, but re-read them before starting it. *Found and fixed by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): the lava troll never rises on an egg wave — the gate requires a live `kind:'enemy'` and an
  egg wave enters only eggs (baiters are `kind:'ptero'`). Measured on wave 5: no troll in 400 frames, where
  `develop` raised one on the advance frame. Waves 5/10/15/20 are all egg waves past `TROLL_WAVE=4`.
  Affects `plugins/joust/src/core/sim.ts` (the troll gate) and the troll suites, which only reach waves 1–4 and
  therefore cannot see it. *Found by Reviewer during code review.*
- **Gap** (blocking): the demo.ts→sim.ts rename blinded two jt9-28 audit guards, because `audioFiles()` selects
  core files with a REGEX (`/core[/\\](events|demo)\.ts$/`) that a string-based rename sweep cannot reach. The
  scan silently dropped the game's largest cue-emitting file and stayed green — its non-vacuity assertion passes
  on other files' claims. Affects `plugins/joust/tests/audio-channel-role.test.ts`.
  **General lesson worth carrying past this story:** a rename must sweep regexes and dynamic-import specifier
  strings, not just identifiers and import paths — and a selector guard should assert that it still matches a
  known-required file. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): two source-text guards assert something weaker than their titles claim — the
  AC-9 wiring guard proves a MENTION not a CALL (the import block satisfies `.includes`), and the arrival-cadence
  suite pins ordering but not magnitude, so the ~1-frame implementation this story already rejected once would
  pass. Affects `plugins/joust/tests/demo-jt11-4.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): only 4 of 9 reviewer subagents are enabled in
  `workflow.reviewer_subagents` — edge_hunter, silent_failure_hunter, test_analyzer, type_design and simplifier
  are off. Three of this review's eight findings came from those disabled domains, worked by hand. Affects
  `.pennyfarthing` settings; recommend re-enabling at least edge_hunter and test_analyzer for the rest of epic
  jt11, whose stories are all simulation-behaviour changes. *Found by Reviewer during code review.*
- **Question** (non-blocking): should `pendingEnemies`/`serviceQueue` remain optional on `SimState`? A hand-built
  fixture that sets `pendingEnemies` but omits `serviceQueue` re-seeds `leserv` to 0 every frame, so only ticket 0
  is ever served and the wave never clears. Not reachable from production, but a latent fixture trap created by the
  optional-field design. Affects `plugins/joust/src/core/sim.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking, PROCESS): a REJECTED Reviewer verdict still advanced the workflow `review → finish`.
  `pf handoff complete-phase` does not read the verdict, and the approval gate's own
  `recovery_config: {reviewer-verdict: {action: rework, target_phase: green}}` is not executable —
  `pf workflow fix-phase jt11-4 green` refuses with "Target phase 'green' is not ahead of current phase
  'finish'". Both paths are forward-only, so the phase had to be corrected by hand; left alone, SM would have
  picked this story up as ready to finish and shipped a known gameplay regression. Affects the pf framework
  (`pf handoff complete-phase` must honour a REJECTED verdict, and `fix-phase` must be able to move BACKWARD
  along the route the gate itself declares). *Found by Dev during implementation.*

### Reviewer (code review, round 2)

- **Gap** (non-blocking): a ROM citation living in a CODE COMMENT is verified by nothing. The joust
  citation gate (`plugins/joust/tests/audit/citations.test.ts`, 1083 claims) byte-opens only
  `docs/rom-study/claims/*.json`, and `comment-line-refs.test.ts` explicitly rules ROM citations OUT
  of its scope on the stated grounds that "the citation gates pin them" — which, for comments, they do
  not. That gap is how `JOUSTRV4.SRC:2189` reached three test sites and the dev sidecar while both
  gates stayed green. Affects `plugins/joust/tests/audit/citations.test.ts` (extend the corpus to
  `JOUSTRV4.SRC:<line>` refs found in `src/**` and `tests/**` comments, at least checking the line
  exists and is non-blank). *Found by Reviewer during code review.*
- **Gap** (non-blocking, PROCESS): a commit landed on this branch AFTER the Dev Assessment closed
  (`70b640a3`, the rebase reconciliation) carrying 390 lines across four files, including a rewrite of
  a sibling story's suite and a hand-composed conflict resolution — and it shipped a red gate. Nothing
  in the workflow re-opens review when post-assessment commits appear, and the commit's own
  "Full verification" line listed three suites while omitting the one that guards the file it spent
  most of its diff rewriting. Affects the pf review gate (a phase-complete check could compare the
  branch tip against the SHA the assessment was written at). *Found by Reviewer during code review.*
- **Question** (non-blocking, PARTIAL CORRECTION to the round-1 PROCESS finding): the rework route IS
  executable. `pf handoff complete-phase jt11-4 tdd review green rework` moved the phase `review → green`
  cleanly this round, matching the gate's declared `recovery_config`. What remains true is the first half
  of the round-1 finding: `pf handoff resolve-gate` still reports `next_phase: finish, next_agent: sm`
  even with a REJECTED verdict recorded, so an agent following the gate's own `next_*` fields rather than
  the REJECTED branch of the exit sequence will advance a rejected story toward finish. The defect is in
  what the gate ADVISES, not in what the rework command can do. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, repeat of a round-1 finding, now evidenced twice): five of nine
  reviewer subagents remain disabled, and **two of this round's five findings came from those
  disabled domains** — including R2-F2, a control test blind to a 6× regression, which surfaced only
  from hand-mutating the gate it guards. Round 1 recommended re-enabling `edge_hunter` and
  `test_analyzer` for the rest of epic jt11; that recommendation is now supported by findings from
  two consecutive rounds. Affects `.pennyfarthing` settings (`workflow.reviewer_subagents`).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/sprint-repo-routing.test.mjs:271` reports a de-indented epic
  shard as "epic shard declares no stories". The shard declares twelve; the indentation changed. The
  message sends the reader hunting for missing data instead of at the two spaces that actually moved,
  and this file has now been flattened twice by pf tooling. Affects
  `tests/sprint-repo-routing.test.mjs` (say "no story block matched `^ {2}- id:` — indentation may
  have been re-serialised"). *Found by Reviewer during code review.*


### Dev (implementation, round 3)

- **Improvement** (non-blocking): the `demo-*.test.ts` FILE-naming convention still carries the term this
  story retires — 49 of joust's 177 test files. The symbols, the module and (now) the in-file helpers are
  all `sim*`, so the filenames are the last holdout, and they are what a reader greps first. Deliberately
  NOT swept here: renaming 49 files would bury a five-finding rework in a 49-file diff, and several of
  those names are cited by story id in sprint context. Affects `plugins/joust/tests/demo-*.test.ts`
  (a dedicated sweep story, with the context-doc references updated in the same commit).
  *Found by Dev during implementation.*
- **Question** (non-blocking): `serveEnemies`' retry arm is now tested but is still unreachable in a real
  game — the seeded naps are `61 * (i + 1)`, so exactly one bird is ever awake on a frame and the
  one-service-per-frame rule never actually binds. It becomes reachable the moment pad occupancy lands
  (jt11-9), because a bird bounced off a busy pad is precisely a loser that must retry. Worth confirming
  when jt11-9 is scoped that the arm's `nap: 0` semantics are what TCURUSE wants, rather than assuming
  this story settled it. Affects `plugins/joust/src/core/sim.ts` (`serveEnemies`).
  *Found by Dev during implementation.*


### Reviewer (code review, round 3)

- **Gap** (non-blocking): a ROM citation in a CODE COMMENT is still verified by nothing, and a second
  instance of the exact R2-F3 shape is sitting in the file this story renamed. `sim.ts:700` cites
  `JOUSTRV4.SRC:2618` for `SECCR PTERST`; byte-read, `:2618` is `PTERWV PCNAP 65` and the `SECCR
  PTERST,PTEID` instruction is at `:2621` — the nap line cited for the instruction below it, which is
  precisely how `:2189`/`:2191` went wrong. Pre-existing (jt9-59); this story only rewrote the symbol
  on that line. Affects `plugins/joust/src/core/sim.ts:700` and, structurally,
  `plugins/joust/tests/audit/citations.test.ts` (the round-2 Gap: extend the corpus to
  `JOUSTRV4.SRC:<line>` refs in `src/**` and `tests/**` comments). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `comment-line-refs.test.ts` scopes itself to joust TEST comments, so the same
  rot in `src/**` is unguarded — and the `demo.ts`→`sim.ts` sweep converted a DANGLING ref into a
  plausible one. `enemy.ts:534` cites `sim.ts:425` and `:654` for the `pchase: 0` / `brain: 'linet'`
  spawn sites; `:425` is the `serviceQueue` field and `:654` is the enemy-types doc block. It was
  already wrong as `demo.ts:425` on `origin/develop` (verified), but a filename that no longer exists
  reads as suspect where a live one reads as authoritative — the guard's own header calls that "the
  worse failure". Five such refs exist in joust `src/`; this story rewrote two. Affects
  `plugins/joust/tests/comment-line-refs.test.ts` (widen scope to `src/**`, or strip the line numbers).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `pendingEnemies`/`serviceQueue` remain independently-optional on
  `SimState`, deferred for the third consecutive round and still not reachable from production
  (every write site pairs them; nothing serialises `SimState`). Re-confirmed rather than re-asserted
  this round, and corroborated by `reviewer-security`. Affects `plugins/joust/src/core/sim.ts`.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking, third consecutive round): five of nine reviewer subagents remain
  disabled (`edge_hunter`, `silent_failure_hunter`, `test_analyzer`, `type_design`, `simplifier`).
  **Three of this round's five substantive findings came from those domains, worked by hand** — R3-F1
  and R3-F3 are edge/test-analyzer work, R3-F3 is also simplifier work. Rounds 1 and 2 made the same
  recommendation; this is the third body of evidence for it. Affects `.pennyfarthing` settings
  (`workflow.reviewer_subagents`). *Found by Reviewer during code review.*


## Design Deviations

### TEA (test design)

- **No test asserts the empty-third rule on the ENEMY arrival path (AC-3 is not covered as written)**
  - Spec source: context-story-jt11-4.md, AC-3 (and the story title's "spawnProceeds empty-third deferral")
  - Spec text: "An arrival whose destination third is occupied is **held** and retried on a later frame; one whose
    third is empty proceeds (`spawnProceeds(occ, tier)`, JOUSTRV4.SRC:5641-5654). … Test it by crowding a tier and
    asserting the arrival is deferred while a sibling bound for an empty tier is not."
  - Implementation: the suite covers ticket order, players-first, one-at-a-time service and per-arrival
    materialisation windows, and deliberately writes NO test for enemies deferring on an occupied screen-third.
  - Rationale: JOUSTRV4.SRC:5641-5654 is inside **CREPLY**, the PLAYER create path (entered from
    `CMPA #PLYID / BEQ CREPLY`, :5670-5671). The enemy path — CREEM :5663-5666 then the CRELP loop :5667-5677 —
    never touches AREA1/AREA2/AREA3. It naps `PCNAP 1`, waits behind any unserved player (:5672-5674), waits its
    own ticket (:5675-5676), then picks a transporter that is not in use (VRAND + the STTR1..STTR4 fall-through,
    :5678-5709). Writing the AC as specified would have pinned a law the machine does not have, and a green suite
    would then certify wrong behaviour permanently.
  - Severity: major
  - Forward impact: AC-3 as written cannot be satisfied faithfully. Dev must NOT wire `spawnProceeds` into enemy
    arrivals. The genuine enemy-side deferral is pad occupancy (TCURUSE/STTRn, :5709-5710), which this port does
    not model at all — filed below as a Gap for a follow-up story rather than absorbed into this one.

- **Arrival cadence is pinned as a relation, not as a frame constant**
  - Spec source: context-story-jt11-4.md, AC-2 / AC-4 (ptero-stagger template)
  - Spec text: "A `pendingArrivals` queue (mirroring `pendingPteros`) holds each enemy's deferred insertion, keyed
    by countdown tick."
  - Implementation: tests assert each enemy is served on a strictly later frame than the last, at most one per
    frame, in ticket order, within a 400-frame window — they do not pin a specific inter-arrival gap.
  - Rationale: the ROM's enemy loop is `PCNAP 1` (:5667) — a per-frame re-test, not the pteros' `PCNAP 65`
    (:2618). Borrowing the ptero constant would be wrong, and inventing a different one would make the suite an
    implementation transcript of whatever Dev picks. The observable law is the serialization, so that is what is
    pinned.
  - Severity: minor
  - Forward impact: Dev is free to choose the cadence constant; the Reviewer should check it against `PCNAP 1`
    rather than against this suite.

### Dev (implementation)

- **The cadence constant is WCREATE's `PCNAP 61`, not CRELP's `PCNAP 1`**
  - Spec source: this session's TEA deviation "Arrival cadence is pinned as a relation, not as a frame constant"
  - Spec text: "Dev is free to choose the cadence constant; the Reviewer should check it against `PCNAP 1` rather
    than against this suite."
  - Implementation: `ENEMY_STAGGER_FRAMES = 61`. Enemy *i* is created `61 * (i + 1)` frames into the wave and only
    then takes its transporter number and enters the CRELP service loop (where `PCNAP 1` remains, as
    `ENEMY_SERVE_NAP`, governing per-frame retries).
  - Rationale: TEA read `PCNAP 1` as the whole arrival cadence, but `CRELP`'s nap is only the retry interval for a
    bird already created. What creates the birds is `WCREATE`, which naps **before** each `SECCR CREEM`:
    `10$ PCNAP 61 / SECCR CREEM,EMYID / … / 20$ DEC PDELAY,U / BNE 10$` (JOUSTRV4.SRC:2187-2207) — decimal frames,
    exactly as `PTERWV`'s `PCNAP 65` is. Serving on the ticket queue alone put the complement about **one frame**
    apart (~50 ms): serialized, so TEA's suite went green, but invisible on screen and therefore not a fix for the
    reported defect. Verified in the real production sim (1P, seed 0x1234): buzzards now arrive at frames
    **62, 123, 184**.
  - Severity: minor (it satisfies TEA's relation strictly; only the Reviewer's pointer changes)
  - Forward impact: check `ENEMY_STAGGER_FRAMES` against **WCREATE :2189**, not against `CRELP :5667`. Both naps
    are modelled and both are load-bearing.

- **The lava troll rises on the FIRST bird, not the whole complement**
  - Spec source: jt9-11 / jt3-7 troll-victim behaviour, carried through commit 6c46acff
  - Spec text: (6c46acff's own comment) "It waits for the WHOLE complement, not merely the first bird."
  - Implementation: the gate is now `processes.some((p) => p.kind === 'enemy')`.
  - Rationale: written when arrivals were ~1 frame apart, "wait for the whole complement" cost nothing. At 61
    frames per bird it would park the troll for `61 * count` frames — 244 on a four-buzzard wave — which is a new
    defect, not a fidelity gain. `pickTrollVictim` binds the nearest bird and a knight is a valid victim (LNDB7
    grabs player or enemy), so the thing it must not do is rise into an arena holding **only** knights; one
    buzzard on the pads already makes the choice proximity-based rather than default.
  - Severity: minor
  - Forward impact: troll-rise fixtures step to the rise rather than assuming a frame; their loop guards were
    widened past the new arrival frames (12 → 200).

- **`homing-wiring.test.ts` fixtures seated (test-only, beyond the files TEA touched)**
  - Spec source: AC-6 "pre-existing tests stay green (verify fixture determinism against seeded replays)"
  - Implementation: `reversalsInPlay` seats the wave with `seatWaveInstantly`; `craft` empties the waiting room
    with `withNoPendingEnemies`.
  - Rationale: `reversalsInPlay` measures whether the homing throttle ever fires over 600 frames. The counter needs
    matched wakes to **accumulate**, so a buzzard that lands on frame 183 gets a third fewer of them — seed 0x63
    fell to zero reversals. That is a fact about arrival cadence, not about the throttle, so the fixture restores
    the frame-0 arrangement it was calibrated against (no RNG spent, no clock advanced). `craft` builds a
    deliberate two-process arena; leaving the real complement queued behind it meant `theEnemy`'s `find` could
    pick up a stranger stepping off a pad. Harmless today (all its callers step 4 frames), fixed as a latent trap.
  - Severity: minor
  - Forward impact: no assertion was weakened; both controls that expect **zero** reversals still expect zero and
    still pass with the wave seated.



### Dev (rework, round 2)

- **F-8 fixed by DELETING the constant, not only by inlining `0`**
  - Spec source: Reviewer finding F-8 [LOW][SIMPLE]
  - Spec text: "Either `nap: 0` with the existing comment, or keep the expression and state in the comment that
    the frame just spent IS the nap."
  - Implementation: took the `nap: 0` branch — and then removed `const ENEMY_SERVE_NAP = 1`, whose only remaining
    references were in comments. Its ROM citation (`CRELP PCNAP 1`, JOUSTRV4.SRC:5667) already lives on the
    `PendingEnemy.nap` docblock and is now also stated at the retry site.
  - Rationale: choosing `nap: 0` makes the constant dead. Leaving a dead named constant behind is a worse smell
    than the arithmetic it replaced, and `tsc` does not flag it here. Nothing else in the repo referenced it.
  - Severity: minor
  - Forward impact: the `PCNAP 1` figure now has exactly two homes, both comments, both cited. `PCNAP 61` remains
    a live constant (`ENEMY_STAGGER_FRAMES`) because it is arithmetic, not a nap of one.

- **F-5's sweep extended past the list the Reviewer wrote**
  - Spec source: Reviewer finding F-5 [LOW][RULE]
  - Spec text: lists the dangling sites, then notes "Two pre-existing design docs also now dangle
    (`docs/superpowers/specs/2026-07-22-…:38`, `2026-08-07-…:29`) — **not introduced here**."
  - Implementation: swept those two as well, plus one the finding did not list —
    `plugins/joust/docs/rom-study/claims/game-loop.json:40` (`DemoProcess.baiter`).
  - Rationale: "not introduced here" is a statement about blame, not about truth: both docs point at
    `src/core/demo.ts`, a path that no longer exists, so a reader following them lands nowhere. The rename commit
    `3ce7142a` already edited claim PROSE the same way (`egg-catch.json`: "the catch pass in demo.ts" → "sim.ts"),
    so `game-loop.json` was simply a miss in the same sweep, not a new policy. Only file paths and renamed symbols
    changed; no narrative was rewritten.
  - Severity: minor
  - Forward impact: `sprint/archive/**` was deliberately left alone — those are sealed records of what was said at
    the time, and the Reviewer did not list them. `grep -rn 'DemoSim\|DemoState\|stepDemo' sprint/archive` still
    returns hits, and that is correct.

- **F-2 got TWO guards where the Reviewer suggested one**
  - Spec source: Reviewer finding F-2 [HIGH][RULE]
  - Spec text: "ideally add a guard that the selector matches a known-required file, so the next rename cannot
    blind it silently."
  - Implementation: `AUDIO_SCAN_REQUIRED` (the selector must reach `core/events.ts`, `core/sim.ts`,
    `shell/audio.ts`) plus a second guard that every `SEVENTEEN_OK` allow-list key names a file that is actually
    scanned.
  - Rationale: the allow-list/scan-set mismatch WAS the visible fingerprint of this defect — `sim.ts` kept its
    permission entry for cues nothing was checking. A guard keyed on that catches the next occurrence even if the
    required-file list itself goes stale, which the first guard cannot do for itself.
  - Severity: minor
  - Forward impact: adding a file to `SEVENTEEN_OK` now requires it to be in the scan set. That is the intended
    coupling, but it will redden if someone allow-lists a file before widening the selector.

- **F-1's comment states a MEASURED wave set, not the Reviewer's list**
  - Spec source: Reviewer finding F-1 [HIGH][EDGE]
  - Spec text: "Waves 5/10/15/20 are all egg waves past `TROLL_WAVE=4` — one wave in five loses a gameplay feature
    silently."
  - Implementation: the code comment says every FIFTH wave is an egg wave, citing the measurement
    (5, 10, 15, 20, 25, 30, 35, 40 across waves 1..40, all `status $08`) rather than reproducing the four-case list.
  - Rationale: the Reviewer's list was scoped to the waves just past `TROLL_WAVE`; copied into a source comment it
    would read as exhaustive and be false. Derived from `dispatchWaveType(waveRowAt(w).status, …)`, not from
    arithmetic on the table.
  - Severity: minor
  - Forward impact: none — the fix itself is wave-agnostic (it keys on the waiting room being empty, not on a
    wave number), so the comment is documentation, not a condition.

### Dev (rework, round 3)

- **R2-F4's rename was applied to BOTH helpers, not just the new one**
  - Spec source: Reviewer finding R2-F4 [LOW][SIMPLE]
  - Spec text: "`simSourceSansImports` if the sibling is renamed with it; otherwise leave both and let a
    dedicated sweep handle the `demo-*` test-file convention." The finding also recorded a mitigation:
    "the sibling `demoSourceSansComments` is pre-existing".
  - Implementation: renamed both to `simSourceSansComments` / `simSourceSansImports` (8 sites, file-local).
  - Rationale: the mitigation does not hold on inspection. `demo-jt11-4.test.ts` is entirely new in this
    story (`git diff origin/develop...HEAD` shows 443 added lines, 0 context), so `demoSourceSansComments`
    was added by this story too — it is not pre-existing code the rename sweep inherited, it is this
    story's own use of the term it retires. With that established the Reviewer's first branch applies.
  - Severity: minor
  - Forward impact: none outside this file — both helpers are file-local and no other test references them
    (grepped `plugins/joust/` for `demoSourceSans`: zero hits after the rename). The `demo-*.test.ts`
    FILE-naming convention (49 files) is untouched and still wants its own sweep.

- **R2-F5 is driven through `stepSim`, not by exporting `serveEnemies`**
  - Spec source: Reviewer finding R2-F5 [LOW][TEST]
  - Spec text: "A unit test that hands `serveEnemies` two awake pendings and asserts one is served and the
    other retried with `nap: 0` would cover it in three lines."
  - Implementation: `serveEnemies` is module-private in `sim.ts`. Rather than export it, the test builds a
    contended waiting room by waking two pendings on a real post-advance state and steps the public
    `stepSim` seam twice.
  - Rationale: exporting a production function purely to let a test reach it widens the module's surface
    for test convenience, and the observable the story cares about — how many birds leave the pads on a
    frame — is visible at the public seam anyway. It also lets the test pin the RETRY DELAY (the loser is
    served on the very next frame, not the one after), which a direct call asserting `nap: 0` cannot
    distinguish from `nap: 1` in a port where both spellings once meant the same number.
  - Severity: minor
  - Forward impact: the test costs 3 frames of stepping instead of one function call, and it will need
    updating if pad occupancy (jt11-9) makes more than one service per frame possible — which is the
    correct coupling, since that is exactly the rule it pins.

### Reviewer (audit, round 3)

- **R2-F4's rename was applied to BOTH helpers, not just the new one** → ✓ **ACCEPTED by Reviewer.**
  Dev's correction of my own finding is right and I verified the premise rather than accepting it:
  `git diff origin/develop...HEAD -- plugins/joust/tests/demo-jt11-4.test.ts` is a pure addition (no
  `---` side), so `demoSourceSansComments` was this story's own, not inherited. My round-2 mitigation
  was wrong; the branch Dev took is the one my finding's first clause specified. `grep -rn
  'demoSourceSans' plugins/joust/` returns zero.
- **R2-F5 is driven through `stepSim`, not by exporting `serveEnemies`** → ✓ **ACCEPTED by Reviewer**,
  and the reasoning is better than the finding it answers. Widening a production module's export
  surface for test reach is the wrong trade, and the public-seam test provably pins MORE than my
  suggested unit call would: I mutated the retry arm to `nap: 1` and exactly one test reddened — the
  new contention test, on the "served on the very next frame" assertion. A direct `nap: 0` assertion
  could not have told those apart. Mutation-verified, not accepted on the write-up.

- **UNDOCUMENTED (Reviewer audit):** the round-3 **mutation record** in the Dev Assessment's
  "Findings → fixes" table states that gating the troll on `!arrivalsStillComing` alone "reddens the
  control, and only it (it left everything green before)". Measured on the branch tip: **13 tests
  across 5 files** redden. Since `sim.ts` and the four other affected test files are byte-identical
  between the round-2 tip `70b640a3` and `HEAD` (`git diff --name-only 70b640a3..HEAD` lists only
  `typescript.md`, `gotchas.md`, `demo-jt11-4.test.ts`, `epic-jt11.yaml`), 12 of those 13 must have
  reddened at round 2 as well. Not documented by Dev. Severity: **L** — the fix is correct and stays;
  the RECORD is what is wrong, and it is about to be archived as institutional memory. Filed as R3-F2.


## Sm Assessment

**Setup complete — story routed to TEA for the RED phase.**

Availability verified before setup, not assumed: no `jt11-4` branch exists on `origin`, no session file was present,
working tree clean on `develop`, and `gh pr list` returns empty (merge gate clear). The story carries no `depends_on`;
`jt11-1` is done and the epic's only sequencing constraint — jt11-4 and jt11-5 both edit `sim.ts` in disjoint regions,
never in parallel — is satisfied because jt11-5 is still `backlog`.

**One substantive correction to the setup output.** The Chimaera's first draft glossed `spawnProceeds` as an
"empty-third-of-a-second deferral", turning a spatial law into a temporal one. `transporter.ts:149` is
`spawnProceeds(occ: AreaOccupancy, tier: Tier) => occ[tier] === 0` — the empty third of the **screen**. Left standing,
that gloss would have had TEA writing a countdown test against a law the ROM does not have, and a green suite would have
certified the wrong behaviour. Session and context are both corrected, the real signatures are enumerated, and the
players-ahead-of-enemies clause in `enemyTurn` (JOUSTRV4.SRC:5672-5675) — absent from the first draft — is now an
acceptance criterion of its own (3a). Session bookkeeping also repaired: `jira_key` was empty (precedent from
`jt11-1`: the key is the story id) and the `**Branch:**` / `**Branch Strategy:**` / `**Repos:**` fields the finish flow
greps were missing.

**Shape of the work for TEA.** Two independent gates guard each arrival and the tests should separate them: ticket order
via `enemyTurn`/`serveEnemy`, and destination clearance via `spawnProceeds`. The cadence itself rides the proven
`pendingPteros` countdown template (sim.ts:2303-2334). This is core-only — `plugins/joust/src/core/` purity rules apply,
and the seeded-replay fixtures will move, since arrival timing changes by design.

**Routing:** phased `tdd` workflow → next phase `red` → TEA (Han Solo).

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/joust/tests/demo-jt11-4.test.ts` — the arrival-cadence suite (14 tests, 4 describes)
- `plugins/joust/README.md` — test-file count anchor 172 → 173 (adding a file reddens `audio-seam-scope.test.ts`)

**Tests Written:** 14 tests covering ACs 1, 2, 3a, 4, 5, 6, 8, 9 (AC-3 deliberately uncovered — see Design Deviations)
**Status:** RED — 11 failing, 3 passing durability guards

### RED evidence (`npx vitest run --project joust`)

Full joust suite: **3413 tests, 3402 passed, 11 failed — every failure in `demo-jt11-4.test.ts`, no other file red.**
`npm run lint` (tsc --noEmit, repo-wide): **passes**.

| Failing test | Expected → Received |
|---|---|
| no ground enemy stands in the arena on frame 0 | length 0 → 3 |
| wave 1 seats all three bounders, one at a time | 0 present on frame 0 → 3 |
| the advance frame inserts NO enemy | length 0 → 4 |
| wave 2 serves its four bounders one at a time | 0 seated on the advance frame → 4 |
| served in TICKET order, strictly later frames | frames `0,0,0,0` → each > the last |
| an unserved enemy is absent from the draw list | 12 draw ops at the advance → fewer than the seated max (12) |
| sim.ts calls `newServiceQueue` / `takeEnemyNumber` / `enemyTurn` / `serveEnemy` (4 tests) | false → true |
| the serving law is imported from `./transporter.js` | false → true |

The three passing tests are **durability guards, not RED**: the complement's ids/types are unchanged, every enemy
arrives with a full materialisation window, and the schedule is seed-deterministic. They pass on the batch insert
today and must keep passing after the fix — the middle one is the trap jt9-45 fell into and jt9-59 fixed for
pteros (pre-create everything, then merely delay it), so it only bites once the timing actually moves.

### Test design notes

- **Fix-agnostic observable.** No test calls a scheduler or names a field Dev must invent. Everything drives
  `createWaveSim`/`stepSim` and reads the enemies present in `sim.processes` — the exact set `drawList` blits and
  `collisionPass` admits, the seam demo-jt9-59 established for the ptero stagger.
- **Non-vacuity.** The first draft's wave-2 "one at a time" test passed vacuously — a complement already seated on
  frame 0 never steps, so the per-frame delta was trivially ≤ 1. It now asserts frame 0 is empty and that the four
  arrivals land on four DISTINCT frames, which a batch cannot satisfy.
- **Comment-ref discipline.** The first draft cited our own files by line (`sim.ts:1209`), which reddened
  `comment-line-refs.test.ts` (jt9-30's guard: a line number is never a stable anchor). All such refs were converted
  to symbol names; the ROM cites (`JOUSTRV4.SRC:5667`) are the sanctioned idiom and were kept.
- **Wiring guard strips comments** before scanning sim.ts, so a function name appearing in a comment cannot satisfy
  it, and a second test blocks Dev from satisfying it with a local re-implementation instead of the transcribed one.

### Rule Coverage

No `.claude/rules/` or `SOUL.md` in this repo. The applicable rubric is the project's own mechanical guards, all of
which were run:

| Rule | Test(s) | Status |
|------|---------|--------|
| core/shell boundary — no clock, DOM or ambient entropy in `src/core/` | `purity.test.ts`, `purity-scanner.test.ts` | passing (suite is core-only) |
| no `<file>.ts:<line>` refs in test comments (jt9-30) | `comment-line-refs.test.ts` | passing (after conversion) |
| test-file count anchor stays truthful | `audio-seam-scope.test.ts` | passing (after README bump) |
| ROM citations resolve to real source lines | `transporter-source.test.ts` oracle groups | passing |
| repo-wide type check | `npm run lint` | passing |

**Self-check:** 1 vacuous test found and fixed (the wave-2 cadence test described above). No `let _ =`, no
`assert(true)`, no assertion that could pass with the behaviour wrong — verified by the fact that 11 of 14 fail on
today's tree and each failure names the batch insert.

### What Dev must NOT do (read the Design Deviations first)

Do not wire `spawnProceeds` into the enemy arrival path. The lines the story cites for it are the **player** create
path. The enemy laws to wire are: take a number (`takeEnemyNumber`), wait behind any unserved player and for your
own ticket (`enemyTurn`), and advance the counter on service (`serveEnemy`) — JOUSTRV4.SRC:5663-5677, :5724.

**Handoff:** To Dev (Yoda) for implementation.


- **Improvement** (non-blocking): joust's troll-rise suites reach only waves 1-4, so no test in the game
  exercised an EGG wave with the troll armed — which is exactly how F-1 shipped green. `demo-jt11-4.test.ts`
  now covers wave 5, but the general gap stands: `demo-troll.test.ts` and `demo-jt9-11.test.ts` stop at the
  troll wave itself. Affects `plugins/joust/tests/demo-troll.test.ts` (a wave-type dimension over the troll
  behaviour, not just the wave-4 entry). *Found by Dev during implementation.*

- **Gap** (non-blocking): F-2's root cause is structural, not a one-off. A file-selecting REGEX in a guard is
  invisible to every rename sweep — `grep 'demo.ts'` cannot see `(events|demo)\.ts$`. `audioFiles()` is now
  self-checking, but other suites select files by pattern the same way and carry the same blind spot.
  Affects `plugins/joust/tests/` (an audit of pattern-based file selectors, each given a required-file
  assertion). *Found by Dev during implementation.*

- **Question** (non-blocking): the pad-occupancy deferral (TCURUSE/STTRn, JOUSTRV4.SRC:5709-5710) is still
  unmodelled — the one-service-per-frame rule stands in for it, as this story's own comment records. jt11-9
  is filed for it; nothing here changes that, but F-1 is a reminder that the enemy-entry path now has three
  interacting gates (WCREATE nap, ticket, troll arm) and a fourth will want its own wave-type coverage.
  Affects `plugins/joust/src/core/sim.ts` (`serveEnemies`). *Found by Dev during implementation.*

---

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 3413/3413 passing in the joust project (GREEN); 14747/14747 cabinet-wide
**Status:** GREEN — implementation complete, all four gates verified. Branch pushed to origin.

**Files Changed:**
- `plugins/joust/src/core/sim.ts` — `ENEMY_STAGGER_FRAMES = 61` (WCREATE's per-bird `PCNAP 61`) applied in
  `pendingWaveEnemies`; `serveEnemies` retry nap corrected to one attempt per frame; troll gate moved to the first
  bird's arrival
- `plugins/joust/tests/game.test.ts`, `dumb-wingbeat.test.ts` — frozen seeded replays seated with `seatWaveInstantly`
- `plugins/joust/tests/homing-wiring.test.ts` — `reversalsInPlay` seated; `craft` waiting room emptied
- `plugins/joust/tests/demo-jt3-7-menagerie.test.ts`, `demo-jt3-7-reviewfix.test.ts`, `demo-jt4-4.test.ts`,
  `demo-jt4-5.test.ts`, `demo-jt9-40.test.ts`, `demo-ptero.test.ts` — `pendingEnemies: []` added to the
  force-a-clear idiom
- `plugins/joust/tests/demo-jt9-11.test.ts`, `demo-jt9-42.test.ts`, `audio-emission.test.ts` — troll-rise loop
  guards widened past the new arrival frames
- `plugins/joust/tests/audio-events.test.ts` — entry window widened to span the full `PCNAP 61` walk-in

### Verification evidence

| Gate | Command | Result |
|---|---|---|
| joust suite | `npx vitest run --project joust` | **3413 passed / 3413**, 173 files, 0 failed |
| type check | `npm run lint` (tsc --noEmit, repo-wide) | **clean** |
| orchestrator | `npm run test:orchestrator` | **478 pass, 0 fail** |
| whole cabinet | `npx vitest run` | **14747 passed**, 1 todo, 976 files, 0 failed |

All 14 tests in `demo-jt11-4.test.ts` pass, including the three durability guards TEA flagged as the jt9-45 trap
(complement ids/types unchanged, full materialisation window per enemy, seed-deterministic schedule) — the ones that
only bite once the timing genuinely moves.

**Behaviour verified in the production sim, not only in the suite.** `createGame(0x1234, 1)` stepped 300 frames:
buzzards materialise at frames **62, 123, 184** — `61 * (i + 1)` plus CREEM's one-frame `PCNAP 1`. This is the check
the story actually turns on, because an earlier pass satisfied every test with arrivals ~1 frame apart, which is
invisible on screen and did not fix the reported defect.

### What was implemented

> **AC numbering:** the references below are to `sprint/context/context-story-jt11-4.md`'s ten ACs — the numbering
> TEA used throughout this session. The session file's own seven-item condensation numbers them differently
> (context AC-3 = `spawnProceeds`; session AC-2 = the same clause). Read both against the context file.

1. **`ENEMY_STAGGER_FRAMES = 61`** — WCREATE's per-bird `PCNAP 61` (JOUSTRV4.SRC:2187-2207), nap-then-create, so
   nobody arrives on the wave-advance frame. This is the visible stagger. (AC-2, AC-4, AC-6)
2. **The CREEM/CRELP service queue** underneath it — each bird takes a number, waits behind any unserved player and
   for its own ticket, one service per frame, retrying every frame on failure (`ENEMY_SERVE_NAP = 1`).
   (AC-1, AC-9 — `newServiceQueue`/`takeEnemyNumber`/`enemyTurn`/`serveEnemy` now have real production callers in
   `src/core/sim.ts`, which was the dead-code condition that motivated the epic. `spawnProceeds` does not, and
   deliberately so — see AC-3 below.)
3. **Troll gate** moved to the first bird's arrival rather than the whole complement (see Design Deviations).
4. **Fixture migration** across 12 suites via the two documented idioms in `tests/helpers/wave-entry.ts`:
   `seatWaveInstantly` for frozen seeded replays, `pendingEnemies: []` alongside the strip-to-players force-a-clear
   (a ticket-holder is alive and holds the wave open, as its CRELP-spinning process does in the ROM). (AC-8)

Enemy specs, `enemyProcess`, the `materialise` effect and the core sim contract are untouched — only insertion
timing moved (AC-5), and wave advance still appends through the same `arrivals` path. All new code is pure core and
the purity guards pass (AC-7); no new dependencies and no change to the `stepGame` signature (AC-10).

**No assertion was weakened to reach green.** Where a test genuinely conflicted with the new behaviour its body was
reshaped to the surviving invariant (the `enemy-materialise` cue test keeps its 4047 anchor and now pins jt9-59's
"one cue per bird on its own arrival frame"); elsewhere only loop guards were widened past the new arrival frames.

### Carried to the Reviewer

- **AC-3 is deliberately unimplemented, and the specs now say so.** The lines it cites are the player create path;
  independently re-verified against `JOUSTRV4.SRC` before coding. Do not "fix" it by wiring `spawnProceeds` into
  enemy arrivals. AC-3/AC-9, the Technical Approach, Key Invariants and the epic's title + defect (5) were all
  corrected in `44bda2c7` rather than left for a future story to trip over.
- **Check `ENEMY_STAGGER_FRAMES` against WCREATE :2189**, not against `CRELP :5667` — TEA's forward-impact note
  points at the wrong nap. Both naps are modelled; both are load-bearing.
- **`sim.ts` is now `src/core/sim.ts`** (`3ce7142a`), symbols included. The diff is wide (134 files) but entirely
  mechanical; the two genuine collisions it surfaced (`audio-flap.test.ts`'s local `SimState` alias, and the
  `jt9-55` control that used `sim.ts` as a name joust was supposed to lack) were fixed, not worked around.
- **Pad occupancy is designed and filed as jt11-9** (`b0638287`), with `sprint/context/context-story-jt11-9.md`
  carrying the full test design. Designing it produced a finding worth the Reviewer's attention: **it cannot be
  implemented as scoped, because there is nothing to contend for.** Measured (seed 0x1234, 1P, 260 frames): an
  arrival is born on its pad and its brain moves it the very next frame (id 256 born f62 at x=23 on TR3, x=25 by
  f82). `MATERIALISE_WINDOW = 120` is the collision gate, not a standing period; the ROM's is `LDA #30 / STA
  PFRAME` (:5726-5727). A pad is therefore occupied for exactly one frame, and a 400-frame sweep on four seeds
  finds zero same-pad collisions. `TCURUSE` on top of that would be unobservable dead state — this epic's own
  disease. jt11-9 carries the 30-frame stand as a hard prerequisite, in the same story as the gate it makes real.
- **Housekeeping:** pf's setup step reserialised `sprint/epic-jt11.yaml` and flattened its story indentation from
  2-space to 0, reddening `tests/sprint-repo-routing.test.mjs`. Restored and committed; `complete-phase` later
  reflowed the same file's long scalars (harmless — indentation survived). Expect it on any step that rewrites it.

**Commits:** `58524132` (RED) → `74874d90` (serve queue) → `6c46acff` (troll + fixtures) → `8ffa8f21` (PCNAP 61
stagger + remaining fixtures).

**Handoff:** To Reviewer (the Thought Police) for code review.

---
_Session tracking for story jt11-4 in epic jt11._
## Subagent Results — round 1 (superseded; see round 3 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (found F-1) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (found F-4) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (found F-8) |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`, their domains covered by the Reviewer directly)
**Total findings:** 8 confirmed, 0 dismissed, 0 deferred

> **Only 4 of 9 specialists were enabled**, and the five disabled ones (edge-hunter, silent-failure,
> test-analyzer, type-design, simplifier) are precisely the domains that matter for a simulation-timing
> change. Their coverage was NOT claimed from a subagent — the Reviewer worked each domain by hand, and
> three of the eight findings (F-1, F-4, F-8) came out of that manual pass. Turning them back on for this
> epic's remaining stories is recorded as a Delivery Finding.

> **Note on the rule-checker's "uncommitted local modification" observation.** It is correct that it saw a
> dirty `sim.ts` mid-flight: the Reviewer was verifying the F-1 fix candidate in the working tree at that
> moment and restored it immediately after (`git checkout --`). The tree is clean and identical to the
> reviewed diff — confirmed by `git status --short` returning empty after the probe. Everything the
> rule-checker reports about the DIFF stands; its transient tree observation does not indicate stray work.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (26 checks, enumerated by the rule-checker) plus
CLAUDE.md's project rules. Enumerated per rule, not per exemplar:

| Rule | Items enumerated | Result |
|------|-----------------|--------|
| Core/shell boundary — no clock, DOM, ambient entropy, I/O in `src/core/` | every added block in `sim.ts` (`PendingEnemy`, `pendingWaveEnemies`, `serveEnemies`, troll gate, the three new carried fields) | **compliant** — verified by reading, not only by the scanner; `purity.test.ts` + `purity-scanner.test.ts` 83/83 green |
| Determinism (same seed + inputs ⇒ bit-identical replay) | `pendingWaveEnemies` (positional seed), `serveEnemies` (integer tickets, array order preserved), `enterViaPads` (unchanged) | **compliant** — no Map/Set iteration-order dependence, no entropy; suite pins same-seed replay |
| No `as any` / `@ts-ignore` / unwarranted `!` in core | all added lines in `sim.ts` | **compliant** — zero hits |
| `??` vs `||` on nullable | 3 new optional fields (`pendingEnemies`, `serviceQueue`, `trollArmed`) | **compliant** — all use `??`; the single `||` (`enemiesLeft`) is genuine boolean logic |
| jt9-30 — no `<ourfile>.ts:<line>` in test comments | both new test files | **compliant** — ROM citations only |
| ROM citations resolve and say what the comment claims | 9 cited ranges (`:2187-2207`, `:5663-5666`, `:5667-5677`, `:5672-5675`, `:5709`, `:5710`, `:5724`, `:5726-5727`, `:5641-5654`) | **compliant** — all 9 independently re-read and confirmed exact; radix confirmed decimal (`PCNAP 61` :2191 / `PCNAP 65` :2618, bare immediates) |
| Two suites must not overlap (vitest vs orchestrator node:test) | `tests/jt9-55-joust-yaml-refs.test.mjs` | **compliant** — stays in the orchestrator suite; 47/47 green |
| Test-file count anchor stays truthful | `plugins/joust/README.md` | **compliant** — 173 stated, 173 discovered |
| Retirement swept everywhere (lang-review #24) | the 141-file rename | **VIOLATION — F-2 (regex-matched path missed) and F-5 (dangling `Demo*` in docs/context/test-header comments)** |
| Source-text guard must prove its own claim (lang-review #15, #25) | AC-9 wiring guard, `demo-jt11-4.test.ts:296-302` | **VIOLATION — F-3: `.includes()` is satisfied by the import block; cannot prove invocation** |

### Devil's Advocate

Argue this branch is broken. Start where it is weakest: **one session wrote the tests, the implementation and
this review.** Every "verified" below was produced by the same reasoning that produced the code, and the two
HIGH findings are both self-inflicted — which is evidence the arrangement is unsafe, not evidence it worked.
F-1 in particular survived a green 3413-test suite, a green 14747-test cabinet, a clean build and a Dev
Assessment that explicitly claimed the troll change was safe because "one buzzard on the pads is enough".
That claim is true only on waves that HAVE buzzards. The author reasoned about the wave in front of him and
generalised; the suite agreed because it only ever tests waves 1–4. A player reaching wave 5 sees a feature
silently vanish, and nothing anywhere would have told anyone.

Now attack the rest. A confused user is not the risk here — there is no user input surface — so the real
adversary is *the next developer*. What would they do? They would trust the AC-9 guard's title and delete a
call site during a refactor; F-3 proves all four tests stay green. They would trust the arrival-cadence suite
and "simplify" `ENEMY_STAGGER_FRAMES` to 1; F-4 proves the suite stays green, and we KNOW this because that
exact implementation already shipped once inside this story and was green. They would add a stale cue total
to `sim.ts`; F-2 proves the jt9-28 guards no longer look there, and the non-vacuity assertion designed to
catch an empty scan still passes because other files supply claims. Three separate guards in this repo now
assert something weaker than their titles say, and in each case the failure is silent-green rather than red.

What about a stressed runtime? The queue itself holds up: bounded by one wave's complement, drained before
the wave can advance (`enemiesLeft`, line 2367), re-seeded per wave so tickets cannot desync, and the retry
path re-attempts every frame so no ticket can starve. I tried to construct a softlock — a pending enemy whose
ticket never comes up — and could not: `enemyTurn` needs `npserv === lpserv`, and players never take numbers
in this port, so the lowest ticket always matches. The one genuine footgun is a hand-built `SimState` that
supplies `pendingEnemies` but omits `serviceQueue`: `leserv` would reset to 0 every frame and only ticket 0
would ever be served, holding the wave open forever. Not reachable from production (which always sets it),
but a trap for future fixtures, and the optional-field design is what allows it.

### Reviewer (audit)

- **Dev deviation "The cadence constant is WCREATE's `PCNAP 61`, not CRELP's `PCNAP 1`"** → ✓ ACCEPTED by
  Reviewer: independently re-verified at JOUSTRV4.SRC:2187-2207 — `10$ PCNAP 61` precedes `SECCR CREEM,EMYID`,
  bare decimal, same form as the established `PCNAP 65`. Correcting TEA's forward-impact pointer was right.
- **Dev deviation "The lava troll rises on the FIRST bird, not the whole complement"** → ✗ **FLAGGED by
  Reviewer**: the reasoning holds for waves that field ground enemies and is wrong for every wave that does
  not. See F-1. The deviation's own rationale ("one buzzard on the pads is enough to make the choice real")
  silently assumes a buzzard exists.
- **Dev deviation "`homing-wiring.test.ts` fixtures seated"** → ✓ ACCEPTED by Reviewer: the bit-for-bit claim
  was checked against `develop`'s actual construction (`[...players, ...enemies]`, demo.ts:1247) — seating
  appends the pendings after the players, reproducing that order exactly. Both zero-reversal controls still
  expect zero and still pass, so the guard retains its teeth.
- **TEA deviation "Arrival cadence pinned as a relation, not a frame constant"** → ✗ **FLAGGED by Reviewer**:
  defensible in the abstract, demonstrably wrong here. The evidence is inside this very story — an
  implementation with a ~1-frame stagger satisfied the whole suite while failing the reported defect. The
  direct sibling jt9-59 pins `≥65` for the ptero stagger, so pinning a lower bound is this codebase's own
  established idiom, not an implementation transcript. See F-4.
- **TEA deviation "No test asserts the empty-third rule on the ENEMY path (AC-3 uncovered)"** → ✓ ACCEPTED by
  Reviewer: re-verified that `:5641-5654` sits inside `CREPLY`, reached via `CMPA #PLYID / BEQ CREPLY`
  (:5670-5671), and that `CREEM`/`CRELP` never touch AREA1-3. Not writing that test was correct, and the
  specs were amended rather than left to mislead.

## Reviewer Assessment — round 1 (superseded; see round 3 below)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][EDGE] | **The lava troll never rises on an egg wave.** The gate requires a live `kind:'enemy'`, but an egg wave enters only eggs (baiters are `kind:'ptero'`, so they do not satisfy it either). Measured on wave 5: `trollArmed=true`, arena `[player, egg×12]`, no troll in 400 frames. On `develop` it rose on the advance frame. Waves 5/10/15/20 are all egg waves past `TROLL_WAVE=4` — one wave in five loses a gameplay feature silently. Regression introduced by `8ffa8f21`, which replaced `pendingEnemies.length === 0` (true on an egg wave) with `processes.some(enemy)` (never true there). | `plugins/joust/src/core/sim.ts:2515` | Gate on `(processes.some((p) => p.kind === 'enemy') \|\| pendingEnemies.length === 0)`. **Verified by the Reviewer**: wave 4 (normal) → troll at +61, preserving the stagger intent; wave 5 (egg) → troll at +1, matching `develop`. Add a regression test at wave 5 — the existing troll suites only reach waves 1–4, which is why this was invisible. |
| [HIGH][RULE] | **The rename silently blinded two audit guards.** `audioFiles()` selects core files with a **regex**, `/core[/\\](events\|demo)\.ts$/`, which the rename sweep never touched because it is not the string `'demo.ts'`. Proven: the scan now covers 22 files with `includes_core_sim=false`, so jt9-28's AC5 and AC6 guards no longer scan the game's largest cue-emitting file — which still carries its own `SEVENTEEN_OK['sim.ts']` allow-list entry for cues it is no longer checked for. The non-vacuity assertion (`claims > 2`) that exists to catch an empty scan still passes, because other files supply claims. Green tests, less coverage. | `plugins/joust/tests/audio-channel-role.test.ts:653` | Change the alternation to `(events\|sim)`. Then re-run and assert the scan includes `core/sim.ts` — ideally add a guard that the selector matches a known-required file, so the next rename cannot blind it silently. |
| [MEDIUM][RULE] | **The story's headline AC is guarded by a vacuous check.** `src.includes(fn)` over comment-stripped source is satisfied by the **import block** (`sim.ts:97-100` lists all four names as plain text). Deleting every call site while leaving the import would keep all four `it.each` cases green. The title claims invocation; the assertion can only prove the module mentions the identifier — exactly the lang-review #25 failure mode. AC-9 is "the dead serving law gains a production caller", so this is the one guard that most needed to be real. | `plugins/joust/tests/demo-jt11-4.test.ts:296-302` | Assert a CALL, not a mention: match `\bfn\s*\(` on source with the import block removed, or count call sites. The sibling "imported, not re-implemented" test is correctly scoped and should stay as-is. |
| [MEDIUM][TEST] | **The behaviour the story exists to deliver has no guard.** The suite pins only "different frames" and "strictly later" — never the magnitude — so a 1-frame stagger passes everything. This is not hypothetical: that implementation shipped earlier in this story and was green while failing the reported defect. The direct sibling jt9-59 pins the ptero cadence as `≥65-frame`, so a lower bound is this codebase's own idiom. | `plugins/joust/tests/demo-jt11-4.test.ts` (arrival-cadence describes) | Add one assertion mirroring jt9-59: consecutive arrivals at least ~61 frames apart, citing WCREATE JOUSTRV4.SRC:2189. |
| [LOW][RULE] | Dangling `Demo*` / `demo.js` references the rename missed, several on lines the diff itself edited: `plugins/joust/docs/superpowers/specs/2026-07-28-joust-playability-design.md:103,113`; `sprint/context/context-story-jt8-1.md:16`, `-jt8-4.md:89`, `-jt8-6.md:10,47,55,66,78,83`; and six test-header comments still saying "dynamic import of demo.js off disk" (`demo-jt9-11`, `-jt9-25-decoder`, `-jt9-25`, `-jt9-42`, `-jt9-11-source`, `-jt9-41`). Two pre-existing design docs also now dangle (`docs/superpowers/specs/2026-07-22-…:38`, `2026-08-07-…:29`) — not introduced here. | as listed | Sweep the remaining `DemoSim`/`DemoEvent`/`loadDemo`/`DemoModule` tokens and the "demo.js" prose. |
| [LOW][DOC] | `WaveEntryView`'s docstring says the interface exposes "an arena and a waiting room", but it has no `arena` field — and `SimState` has a real, differently-scoped `arena: ArenaState` (cliff/bridge destruction). Risks conflating the two. | `plugins/joust/tests/helpers/wave-entry.ts:29` | Reword to "the processes list and the waiting room". |
| [LOW][DOC] | `StepDemo<T>` and its `demo` parameter keep the terminology this same branch retires project-wide. | `plugins/joust/tests/helpers/wave-entry.ts:36` | Rename to `StepSim<T>`; sweep the residual `const demo = …` locals if cheap. |
| [LOW][SIMPLE] | `nap: ENEMY_SERVE_NAP - 1` evaluates to `0` and reads as arithmetic on a constant whose value makes it a no-op. Correct (the failed attempt consumed this frame, so it retries next frame, matching `CRELP`'s nap-test-`BNE CRELP` loop) but obscure. | `plugins/joust/src/core/sim.ts` (`serveEnemies` retry branch) | Either `nap: 0` with the existing comment, or keep the expression and state in the comment that the frame just spent IS the nap. |

**Verified good (evidence, not assertion):**
- `[VERIFIED]` A queued enemy holds the wave open — `sim.ts:2367` folds `pendingEnemies.length > 0` into `enemiesLeft`, and `clearable` (2377-2380) additionally requires no eggs and a live player. Without this the wave would re-seed its own waiting room every frame.
- `[VERIFIED]` No cross-wave ticket desync — `sim.ts:2435` passes a fresh `newServiceQueue()` on every advance, so `leserv`/`neserv` cannot carry a stale offset into the next wave.
- `[SEC]` `[VERIFIED]` **reviewer-security returned CLEAN — no purity, determinism, resource-exhaustion or
  index-safety defect.** Confirmed independently by the Reviewer rather than accepted on trust: no starvation or
  unbounded growth is possible because tickets are unique ascending integers, array order is preserved, the retry
  path re-attempts every frame, and `enemyTurn`'s `npserv === lpserv` clause is always satisfied (players take no
  numbers in this port); `pendingEnemies` is bounded by one wave's complement and provably drained before the wave
  can advance (`sim.ts:2367`). The specialist also verified by READING, not merely trusting the purity scanner,
  that the diff introduces no `Math.random`/`Date.now`/`performance.now`, no `as any`/`@ts-ignore`, and no
  Map/Set iteration-order dependence. The classic web-app categories (injection, authn/z, tenancy, secrets, CORS)
  genuinely do not apply to an offline single-player browser game with no backend, and no findings were
  manufactured in them.
- `[VERIFIED]` All 9 ROM citations exact, radix included — re-read against `JOUSTRV4.SRC` by reviewer-comment-analyzer, which also confirmed `:5641-5654` is inside `CREPLY`. Note this specialist reported the troll comment "matches the implementation precisely" — true, and precisely why comment review cannot catch F-1: the comment faithfully describes a bug.
- `[VERIFIED]` The attract-mode `'demo'` page name was correctly NOT renamed (`attract-scheduler.ts:29,77,94`, `main.ts:334,514,558`) — a genuinely different concept.
- `[VERIFIED]` README test-count anchor truthful (173 stated / 173 discovered) and the jt9-55 replacement control is sound — `attract.ts` exists in other games but not joust.

**Data flow traced:** wave advance → `pendingWaveEnemies(wave, rng, newServiceQueue())` draws a ticket per bird and sets `nap = 61*(i+1)` → each frame `serveEnemies` decrements naps, and the one awake bird whose ticket equals `leserv` is spliced into `sim.processes` (after flight/collision, so it first flies next frame) → `serveEnemy` advances `leserv` → the bird becomes drawable and collidable. Safe because the ticket is drawn once, the queue is re-seeded per wave, and an unserved bird is still counted alive.

**Handoff:** Back to Dev for fixes (F-1 and F-2 are blocking; F-3 and F-4 should land with them since all four are test-integrity issues in the same suite).


---

## Dev Assessment — Rework (round 2)

**Implementation Complete:** Yes — all EIGHT Reviewer findings addressed, not just the two blocking ones.
**Tests:** 3419/3419 joust (GREEN); 14753/14753 cabinet-wide; orchestrator 478/478; `npm run lint` clean.
**Commit:** `3583658f`
Branch — `feat/jt11-4-serve-queue-enemy-arrival-cadence`

### Findings → fixes

| # | Finding | Fix | Mutation that proves the new guard bites |
|---|---------|-----|------------------------------------------|
| F-1 | [HIGH][EDGE] troll never rose on an egg wave | gate now also passes on an empty waiting room (`sim.ts`, `stepSim` troll block) | buggy `some(enemy)`-only gate → wave-5 test reddens; no-wait gate → wave-4 control reddens |
| F-2 | [HIGH][RULE] `audioFiles()` regex blinded by the rename | `(events\|demo)` → `(events\|sim)`, plus `AUDIO_SCAN_REQUIRED` and an allow-list/scan-set cross-check | reverting the alternation reddens BOTH new guards |
| F-3 | [MEDIUM][RULE] vacuous `src.includes(fn)` | asserts `\bfn\s*\(` on import-stripped source, plus a stripping non-vacuity sibling | aliasing `serveEnemy` to a local (behaviour identical) reddens it |
| F-4 | [MEDIUM][TEST] no cadence magnitude | consecutive arrivals ≥61 frames (WCREATE :2189) | 1-frame stagger leaves all 16 older assertions green, reddens only this |
| F-5 | [LOW][RULE] dangling `Demo*` / `demo.js` | swept 6 test headers, 4 design specs, 3 context stubs, 1 claim | — |
| F-6 | [LOW][DOC] `WaveEntryView` "arena" | reworded, and says why `SimState.arena` is a different thing | — |
| F-7 | [LOW][DOC] `StepDemo<T>` | → `StepSim<T>`; every `demo` param renamed `state` | — |
| F-8 | [LOW][SIMPLE] `nap: ENEMY_SERVE_NAP - 1` | → `nap: 0`, reason stated; the now-unused constant deleted | — |

### Two things I measured rather than accepted

1. **F-1's blast radius.** The Reviewer wrote "waves 5/10/15/20". Measured through `dispatchWaveType`:
   the egg waves in 1..40 are **5, 10, 15, 20, 25, 30, 35, 40** — every fifth wave, not four cases. The
   code comment states the measured form.
2. **F-2's coverage delta.** A standalone probe of the old and new selectors: **21 files with
   `src/core/sim.ts` ABSENT → 22 with it present.** (My first probe attempt copied the guard file into
   `tests/` and the copy tripped the very guards it contained — the "a test that writes into the tree
   another suite MEASURES" trap. Re-probed out-of-tree.)

### Test-count arithmetic

3413 → 3419 is **exactly** the six tests added (4 in `demo-jt11-4.test.ts`, 2 in `audio-channel-role.test.ts`).
No pre-existing test was lost, renamed away or silently skipped.

**Handoff:** Back to Reviewer.


---

## Review Correlation

All eight findings are from the **internal Reviewer**; no external reviewer, CI or automated-tooling findings
exist for this story (no PR is open, and `gh pr view --comments` has nothing to read). Language: TypeScript
(`repos.yaml` → `arcade`); checklist `.pennyfarthing/gates/lang-review/typescript.md`.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| F-1 | reviewer | [HIGH][EDGE] Deferred troll gate waits for a `kind:'enemy'` that an egg wave never produces | NEW_CHECK | — | Added as check **#27** — "A gate that waits for a THING, in a mode where the thing is never created" |
| F-2 | reviewer | [HIGH][RULE] `audioFiles()` selects core files by regex; the rename blinded it and the non-vacuity count could not see the read-set shrink | NEW_CHECK | — | Added as check **#28** — "A guard that selects its READ-SET by pattern, and a count that cannot see it shrink" |
| F-3 | reviewer | [MEDIUM][RULE] `src.includes(fn)` over comment-stripped source is satisfied by the import block | EXISTING_CHECK | **#15** Source-text assertions that match a TOKEN, not the CLAIM (and #25, scope) | Dev missed an existing check — #15's "anchor to the DECLARATION that does the work" and its mutation-test requirement both applied verbatim |
| F-4 | reviewer | [MEDIUM][TEST] Cadence pinned by order only; a 1-frame stagger passes everything | NEW_CHECK | — | Added as check **#29** — "An ORDERING assertion standing in for a MAGNITUDE the story is about" |
| F-5 | reviewer | [LOW][RULE] Dangling `Demo*` / `demo.js` tokens the rename sweep missed | EXISTING_CHECK | **#24** A RETIREMENT applied where the AC named it, and nowhere else | Dev missed an existing check; the regex-selector half of the same root cause is what #28 now covers |
| F-6 | reviewer | [LOW][DOC] `WaveEntryView` docstring describes an `arena` field the interface does not have | EXISTING_CHECK | **#17** Comments and docs that assert a MECHANISM nobody re-ran | Dev missed an existing check — the docstring was written against an earlier shape of the interface |
| F-7 | reviewer | [LOW][DOC] `StepDemo<T>` keeps terminology this branch retires | NOT_APPLICABLE | — | Project-specific naming, not a TypeScript pattern |
| F-8 | reviewer | [LOW][SIMPLE] `nap: ENEMY_SERVE_NAP - 1` is a no-op expression on a constant | NOT_APPLICABLE | — | Local readability; no language-level class of bug behind it |
| P-1 | process | REJECTED verdict still advanced `review → finish`, and the gate's declared recovery route is not executable | PROCESS | — | Note added to Delivery Findings (see the Dev entry tagged PROCESS) |

### Signal Summary
- **External findings: 0** — no PR open; no external or AI reviewer has seen this branch
- **CI findings: 0** — no CI run for this branch yet; `npm run lint`, both suites and the build were run locally and are green
- **Internal findings: 8** (2 HIGH, 2 MEDIUM, 4 LOW), all caught in-process by the Reviewer
- **Process findings: 1** — a pf workflow gap, filed as a Delivery Finding
- **New checks added: 3** (#27, #28, #29 — all internal-sourced, so none carries the `[EXT]` prefix)

**Worth flagging for the repeat-miss rule:** #15 has now been missed on a source-text guard in this repo more
than once (jt11-4 F-3 here; the check's own origin is cp5-1 I-H2). It is a candidate for promotion from a
checklist item to an automated gate — a lint rule that rejects `src.includes(<identifier>)` and bare
`toContain('<identifier>')` over source text read from disk would catch the whole class mechanically.
---

## Subagent Results — round 2 (superseded; see round 3 below)

**Round 2** — re-review of the rework (`e6798303`), the two doc commits, and the previously
unreviewed rebase-reconciliation commit `70b640a3`. Diff scope: `git diff 2beae26f..HEAD`.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (orchestrator RED) | confirmed 1, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by the Reviewer directly (found R2-F2) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by the Reviewer directly |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by the Reviewer directly (found R2-F2, R2-F5) |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 (one defect, 4 restatements of it) | confirmed 1, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by the Reviewer directly |
| 7 | reviewer-security | Yes | clean | none (1 LOW restated from round 1) | confirmed 0, dismissed 0, deferred 1 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by the Reviewer directly (found R2-F4) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (same orchestrator RED, independently found) | confirmed 1 (merged with #1), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled via settings)
**Total findings:** 5 confirmed, 0 dismissed, 1 deferred

> **Nothing was taken on trust.** Every subagent claim that became a finding was re-measured by the
> Reviewer first-hand: the orchestrator RED was reproduced with `node --test` and attributed to a
> commit; the `:2189` citation was read out of `JOUSTRV4.SRC` directly; and the four new guards were
> mutation-tested in-tree (tree verified clean before and after every mutation — `git status --short`
> empty at each step, no `git checkout --` ran over uncommitted work).

> **Two of the five findings came from the disabled domains** (edge-hunter, test-analyzer,
> simplifier). R2-F2 in particular — a control test blind to a 6× regression — was found only by
> hand-mutating the gate the test guards. The round-1 recommendation to re-enable `edge_hunter` and
> `test_analyzer` for the rest of epic jt11 stands, and is now evidenced twice.

### Reviewer mutation battery (round 2)

Run against the branch tip, each mutation restored immediately, tree clean throughout.

| Mutation | Expected | Observed |
|----------|----------|----------|
| Drop `\|\| !arrivalsStillComing` from the troll gate (re-introduce F-1) | wave-5 test reddens | **reddens** — wave 4 still passes ✓ |
| Drop the gate's bird-wait entirely (Dev's claimed mutation) | wave-4 control reddens | **reddens** ✓ — Dev's claim verified |
| Weaken the bird-wait to "waiting room empty" (`!arrivalsStillComing` alone) | wave-4 control should redden | **STAYS GREEN** ✗ — troll rise moves 61 → 366. **R2-F2** |
| Revert the audio selector to `(events\|demo)` (re-introduce F-2) | both new guards redden | **both redden** ✓ |
| Collapse `ENEMY_STAGGER_FRAMES` 61 → 1 (re-introduce F-4) | cadence guard reddens | **reddens** (2 failed / 16 passed) ✓ — matches check #29's stated blast radius exactly |
| Re-indent `sprint/epic-jt11.yaml` stories by 2 spaces | orchestrator goes green | **478/478 green** ✓ — the indentation is the sole defect |

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` — now **29** checks, three of which
(#27/#28/#29) this diff itself authored. Enumerated per rule by `reviewer-rule-checker` across 37
rules / 61 instances, plus the Reviewer's own pass.

| Rule | Items enumerated | Result |
|------|-----------------|--------|
| #27 — a gate that waits for a THING never created in some mode | the troll gate (`sim.ts:2551-2557`) | **compliant** — repaired with the disjunction the check prescribes, and the new tests reach wave 5, past every prior suite's wave-4 ceiling |
| #28 — a guard selecting its READ-SET by pattern | `audioFiles()`, plus a cabinet-wide sweep for the same alternation shape across all nine games | **compliant** — regex repaired, positive `AUDIO_SCAN_REQUIRED` list and allow-list cross-check added, both mutation-verified; **no other instance of the pattern exists in the cabinet** |
| #29 — an ORDERING assertion standing in for a MAGNITUDE | the arrival-cadence test; the wave-4 troll control | **VIOLATION — R2-F2**: the cadence test complies (magnitude pinned, mutation-verified), but the wave-4 troll control the same commit added is a lower bound only and cannot see 61 → 366 |
| #15 / #25 — a source-text guard must prove its claim | the AC-9 call-site guard, its non-vacuity sibling, the two audio read-set guards | **compliant** — `\bfn\s*\(` over comment-**and**-import-stripped source; strip verified by its own sibling test; all four serving-law names have real call sites |
| #24 — a retirement swept EVERYWHERE | repo-wide sweep for `DemoSim\|DemoState\|DemoProcess\|DemoEvent\|StepDemo\|loadDemo\|createWaveDemo\|stepDemo\|demo.js` | **compliant** — zero hits outside `sprint/archive/**` (sealed records, correctly untouched) and one comment that documents the rename in prose |
| #17 — comments asserting a mechanism nobody re-ran | "every fifth wave is an egg wave"; README "177 files"; "21 → 22 files" | **compliant** — all three independently reproduced (WAVE_TABLE sweep; `vitest list` = 177; standalone selector probe = 21/22) |
| ROM citations resolve and say what the comment claims | every citation added or changed in the rework | **VIOLATION — R2-F3**: `JOUSTRV4.SRC:2189` (×4) is `STD PWRTS2,U`, not `PCNAP 61` (which is :2191). The range forms `:2187-2192` / `:2187-2207` in the same commit are correct |
| Core purity / determinism / no `as any` / `??` over `\|\|` | the only `src/core/` change (the troll gate) and all new test code | **compliant** — pure boolean/array logic, no clock/DOM/entropy/I/O, no Map/Set order dependence, no `as any`/`@ts-ignore`; the sole `!` is `.pop()!` in test code and is warranted |
| Two suites must not overlap | every touched test file | **compliant** — all stay in their pre-existing bucket |
| jt9-30 — no `<ourfile>.ts:<line>` in test comments | every added line in the diff's `.ts` files | **compliant** — zero matches |
| Epic-shard structural convention (`tests/sprint-repo-routing.test.mjs`) | `sprint/epic-jt11.yaml` after the rebase reconciliation | **VIOLATION — R2-F1**: story blocks rewritten flush-left; the orchestrator suite is RED on the branch tip |

### Devil's Advocate

Argue the branch is broken. The easy target is no longer the code — the eight round-1 findings were
fixed properly, and I proved four of the new guards bite by mutating the things they guard. The
target is the *process that produced the last commit*. Everything through `c6a84479` was reviewed,
reworked and mutation-tested. Then a rebase happened, and `70b640a3` — a commit written after the
Dev Assessment was closed, describing itself as a "reconcile" — shipped a red gate. Its message ends
with "Full verification: joust 3487/3487, lint clean, citations 1083/1083." Three suites named, and
the one suite that guards the file the commit spends 282 of its 390 lines rewriting is not among
them. Worse, Dev's own round-1 handoff had already written the warning down: "pf's setup step
reserialised `sprint/epic-jt11.yaml` and flattened its story indentation from 2-space to 0 …
**Expect it on any step that rewrites it.**" The trap was documented, then walked into, then
declared verified. That is the shape of a defect that recurs: the knowledge existed and the check
did not.

So what else did that unreviewed commit carry? It re-wrote a *sibling story's* test suite (102 lines
of `lava-shore-jt11-5.test.ts`) and hand-composed a conflict in `audio-events.test.ts` between
jt11-3's re-baselined 2866 anchor and this story's serve-queue window — both plausible, neither
covered by the round-1 review, both green only because the author says so. I read them: the
lava-shore edit is a pure symbol rename, and the audio-events reshape genuinely strengthens the
assertion (per-ID cue matching across a 320-frame window beats a single-frame count). But note the
one soft spot — `expect(totalCues).toBe(totalArrived)` is arithmetic on two counters the per-frame
assertion has already forced equal, so it can never fail independently. Harmless, but it reads as a
second guard and is not one.

And a confused future developer? They would trust the wave-4 troll control's title — "the troll
waits for a bird to be SERVED, not for the advance" — and refactor the gate to wait on the waiting
room instead. The title stays true in spirit, the test stays green, and the troll arrives on frame
366 instead of 61: six times later, in a game where the whole point of the deferral was that the
troll grabs a bird rather than a knight. The `sim.ts` comment three lines above the gate argues
exactly this property is load-bearing — "waiting for the whole complement would park the troll for
`61 * count` frames" — and nothing in the suite defends it. That is check #29 again, in the test the
same commit wrote to satisfy check #29.

### Reviewer (audit)

Round-2 deviations, all four logged by Dev under `### Dev (rework, round 2)`:

- **"F-8 fixed by DELETING the constant, not only by inlining `0`"** → ✓ ACCEPTED: `ENEMY_SERVE_NAP`
  had no remaining non-comment reference (grepped repo-wide, zero hits), and leaving a dead named
  constant behind would be the worse smell. The `PCNAP 1` citation survives on the `PendingEnemy.nap`
  docblock and at the retry site. Numerically identical to the prior expression — a readability fix,
  not a behaviour change, independently confirmed.
- **"F-5's sweep extended past the list the Reviewer wrote"** → ✓ ACCEPTED: "not introduced here" was
  a statement about blame, and Dev is right that it says nothing about whether the reference dangles.
  Sweeping `game-loop.json` and the two pre-existing design specs was correct; leaving `sprint/archive/**`
  alone was also correct — those are sealed records. Re-verified: zero `Demo*`/`demo.js` hits remain
  outside the archive.
- **"F-2 got TWO guards where the Reviewer suggested one"** → ✓ ACCEPTED: the allow-list/scan-set
  cross-check catches the case the required-file list cannot catch for itself, which is the right
  instinct. Both guards mutation-verified to redden on the reverted regex. The noted coupling
  (allow-listing a file now requires widening the selector first) is the intended direction.
- **"F-1's comment states a MEASURED wave set, not the Reviewer's list"** → ✓ ACCEPTED, and the
  correction was right: my round-1 list ("waves 5/10/15/20") was scoped to the waves just past
  `TROLL_WAVE` and would have read as exhaustive in a source comment. Dev's measured form (every
  fifth wave) was independently reproduced against `WAVE_TABLE`.

**UNDOCUMENTED deviations found by the Reviewer:**

- **The rebase reconciliation (`70b640a3`) is undocumented work.** It landed after the Dev Assessment
  was written and is logged in no deviation entry, yet it rewrote a sibling story's suite
  (`lava-shore-jt11-5.test.ts`, 102 lines), hand-composed a conflict resolution in
  `audio-events.test.ts`, re-measured the README census, and rewrote `sprint/epic-jt11.yaml`. Only
  the last is defective (R2-F1), and the other three are sound on reading — but a commit of that
  reach arriving after the assessment closed should carry its own deviation entry. Severity: L.
- **`expect(totalCues).toBe(totalArrived)`** (`audio-events.test.ts`) is implied by the per-frame
  assertion above it and cannot fail independently. Not wrong, but it reads as a second guard.
  Severity: L. Folded into R2-F5's note rather than filed separately.

## Reviewer Assessment — round 2 (superseded; see round 3 below)

**Verdict:** REJECTED

Round 2. All eight round-1 findings are genuinely fixed — four of the new guards were mutation-tested
by the Reviewer against the exact defects they exist to catch, and all four bite. The rejection is
**not** a re-litigation of those: it is one blocking regression introduced by the rebase-reconciliation
commit `70b640a3`, which no review had yet seen, plus three smaller issues.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][RULE] | **`npm run test:orchestrator` is RED on the branch tip.** `70b640a3` re-serialised `sprint/epic-jt11.yaml` and flattened all 12 story blocks from the repo-standard 2-space indent to column 0. YAML parses identically (no data loss — all 9 prior stories present with identical field sets, plus 3 legitimately added), but `tests/sprint-repo-routing.test.mjs:255` matches `/^ {2}- id: \S/` as TEXT and now sees zero stories. **This is the exact trap Dev documented in the round-1 handoff** ("Expect it on any step that rewrites it") — and the commit message's "Full verification" line names joust, lint and citations, but not the orchestrator suite that guards this file. CI runs `test:orchestrator` in the deploy path and `just ci` is red. | `sprint/epic-jt11.yaml:27` (and every story block) | **Already fixed in the working tree, uncommitted — commit it.** Recording this verdict (`pf sprint story update jt11-4 --review-verdict rejected`) re-serialised the shard and restored the 2-space form on its own; the orchestrator suite is 478/478 with that change in the tree, and a structural compare against `HEAD` shows the only content delta is the two `review_*` fields. If you re-do it by hand instead: re-indent the whole `stories:` block by 2 spaces — `- id:` to column 2, its children to column 4 (the `^ {4}title:` assertion is next in line), not only the `- id:` lines. **Note the root cause is narrower than round 1 assumed:** pf's own writer emits the CORRECT indentation (just demonstrated), so the flattening came from the rebase conflict resolution in `70b640a3`, not from a pf re-serialisation step. |
| [MEDIUM][EDGE][TEST] | **The wave-4 troll control is blind to a 6× regression — check #29's own failure mode, in the test written to satisfy check #29.** It asserts only `rose >= 61`. Weakening the gate from "a bird has been served" to "the waiting room is empty" (`!arrivalsStillComing` alone) moves the rise from frame **61 to frame 366** and leaves both troll tests green. **Measured, not argued.** The `sim.ts` comment immediately above the gate argues this property is load-bearing — "waiting for the whole complement would park the troll for `61 * count` frames" — so the suite does not defend the behaviour its own comment calls the point of the deferral. | `plugins/joust/tests/demo-jt11-4.test.ts:340-352` | Add the upper bound: the troll must rise on the FIRST arrival, so `expect(rose).toBeLessThanOrEqual(ENEMY_STAGGER_FRAMES + 2)` alongside the existing lower bound (unmutated value is exactly 61). Cite the same WCREATE nap. |
| [MEDIUM][DOC] | **A ROM citation that does not open on what it claims, ×4.** `JOUSTRV4.SRC:2189` is cited as WCREATE's `PCNAP 61`. Line 2189 is `STD PWRTS2,U SAVE RETURN ADDRESS`; `10$ PCNAP 61` is at **:2191**. The range citations added by the same commit (`:2187-2192`, `:2187-2207`) are correct, so only the single-line shorthand is wrong. **The wrong number originated in my own round-1 F-4 fix instruction and was copied forward** — corrected here. | `plugins/joust/tests/demo-jt11-4.test.ts:77,251,350`; `.pennyfarthing/sidecars/dev/gotchas.md:2467` | Change all four to `:2191` (or the correct range). The sidecar matters most — it is the copy future stories will read. |
| [LOW][TEST] | `serveEnemies`' retry branch is unreachable in production and untested. Naps are seeded `61 * (i + 1)`, so exactly one enemy is ever awake on a given frame; `served.length === 0` never blocks and `enemyTurn` always passes. The `else` arm the F-8 edit touched therefore never executes in a real game, and no test constructs the contention state (grepped the joust suite for `serveEnemies`/contention/turn-denial — nothing). It should stay, because it models `CRELP` faithfully, but nothing would catch a mistake in it. | `plugins/joust/src/core/sim.ts` (`serveEnemies` else branch) | Non-blocking. A unit test that hands `serveEnemies` two awake pendings and asserts one is served and the other retried with `nap: 0` would cover it in three lines. |
| [LOW][SIMPLE] | The new helper `demoSourceSansImports` keeps the `demo` prefix this branch retires, in the same commit whose F-7 fix renamed `StepDemo` → `StepSim` and every `demo` parameter to `state`. It reads `../src/core/sim.ts`. Mitigating: the sibling `demoSourceSansComments` is pre-existing and 49 test files still carry the `demo-` prefix, so file-level naming is an unswept convention, not this commit's doing. | `plugins/joust/tests/demo-jt11-4.test.ts:395` | Non-blocking. `simSourceSansImports` if the sibling is renamed with it; otherwise leave both and let a dedicated sweep handle the `demo-*` test-file convention. |

**Verified good (evidence, not assertion):**

- `[VERIFIED]` **All eight round-1 findings are genuinely fixed, and four were proven by mutation, not by reading.** Re-introducing F-1 reddens the wave-5 test; re-introducing F-2 reddens both new audio guards; collapsing the stagger to 1 reddens the cadence test and exactly 16 of 18 others stay green, matching check #29's stated blast radius; and Dev's own claimed wave-4 mutation reddens as claimed.
- `[VERIFIED]` **No data was lost in the epic-YAML reconciliation** — parsed both revisions and compared story-by-story: all 12 stories present, identical field sets, the only content changes being jt11-2/3/5 → `done` with dates (develop's truth, correctly restored) and jt11-10/11/12 added. The prose re-wrap is YAML-identical. The defect is indentation and nothing else.
- `[VERIFIED]` **The `#28` blindness pattern exists nowhere else in the cabinet** — a sweep for regex/alternation-built read-set selectors across all nine games' suites found no second instance, so the fix does not need porting.
- `[VERIFIED]` **The README census is truthful** — 177 stated, 177 discovered by `vitest list`, re-measured on the merged tree after the rebase.
- `[SEC]` `[VERIFIED]` **reviewer-security returned clean on the applicable categories and did not manufacture findings in the inapplicable ones.** Independently confirmed: `pendingEnemies` is bounded by one wave's complement and re-seeded (not appended) per advance; no starvation is reachable because tickets are dense, monotone and drawn in entry order, `leserv` only advances, and players take no numbers in this port; the wave-clear gate counts an unserved ticket as still-alive so a wave cannot falsely clear. Injection/authn/tenancy/secrets/CORS genuinely do not apply to an offline single-player browser game.
- `[VERIFIED]` The round-1 `pendingEnemies`/`serviceQueue` optional-field footgun is **unchanged and still not reachable** — every production assignment pairs them atomically (`sim.ts:2471-2472`, `:2523-2524`), `game.ts` never touches either field directly, and every hand-built fixture in the tree sets `pendingEnemies: []`. Deferred, as in round 1, not dismissed.
- `[SILENT]` `[VERIFIED]` **No swallowed error or silent fallback introduced** (domain disabled; worked by hand). Enumerated every failure path in the diff: `seatWaveByStepping` THROWS with a count rather than returning a half-seated state (`wave-entry.ts:86-88`); `pickTrollVictim` returning `null` leaves `trollArmed` latched so the rise RETRIES next frame instead of being dropped (`sim.ts:2557-2561`); `serveEnemies`' retry arm re-queues with `nap: 0` rather than discarding the enemy, and the wave cannot clear while it holds a ticket (`sim.ts:2367`). The one silent fallback in the diff is `state.pendingEnemies?.length ?? 0` (`wave-entry.ts:41`) — deliberate, since the helper is typed structurally against states that legitimately predate the field, and it is the same optional-field trap already deferred above rather than a new one.
- `[TYPE]` `[VERIFIED]` **Type invariants hold across the rework** (domain disabled; worked by hand). `AUDIO_SCAN_REQUIRED` is `as const`, so a typo in a required path is a compile error, not a silently-unmatched string. `StepSim<T>` keeps the generic parameter that carries the caller's own state type straight back out, so the rename widened nothing — `tsc --noEmit` repo-wide is clean, which is the real proof, since every call site would have had to be re-typed by hand otherwise. `WaveEntryView` still asks for the least a caller must have (`sim.processes`, optional `pendingEnemies`) rather than importing `SimState`, preserving the second-entry discipline `pictures-gate.test.ts` pins. No `as any`, no `@ts-ignore`, no new non-null assertion outside the warranted `.pop()!`.
- `[VERIFIED]` The `audio-events.test.ts` conflict resolution is sound and stronger than what it replaced — per-ID cue matching across a 320-frame window catches a doubled or missing cue that the old single-frame count could not, and `seatWaveInstantly` at frame 0 restores the exact process order (`[...players, ...enemies]`) the file's frozen fingerprints were measured under.

**Data flow traced:** wave advance → `pendingWaveEnemies` draws a ticket per bird and seeds `nap = 61 * (i + 1)` → each frame `serveEnemies` decrements every nap and splices in the one awake bird whose ticket equals `leserv` → `serveEnemy` advances the counter → **the troll gate reads the waiting room it just drained**, rising once a bird is on the pads *or* once nothing is coming. That last disjunction is the F-1 fix, and the egg wave is the mode where its right-hand side is the only true one.

**Handoff:** Back to Dev for fixes. R2-F1 is blocking and mechanical (a re-indent; verified sufficient). R2-F2 and R2-F3 should land with it — one is a two-line assertion, the other is four line numbers. R2-F4 and R2-F5 are optional.

---

## Dev Assessment — Rework (round 3)

**Implementation Complete:** Yes — all five round-2 Reviewer findings addressed.
**Tests:** joust 3488/3488 (177 files); cabinet-wide 14882/14883 (1 todo); orchestrator **478/478**;
`npm run lint` clean; joust build OK; citations 56/56 (1083 claims).
**Files Changed:**
- `sprint/epic-jt11.yaml` — story blocks re-serialised to the 2-space indent (R2-F1)
- `plugins/joust/tests/demo-jt11-4.test.ts` — troll upper bound, contention test, `:2191`, `simSource*` (R2-F2/F3/F4/F5)
- `.pennyfarthing/sidecars/dev/gotchas.md` — `:2189` → `:2191` (R2-F3)
**Commit:** `dbd13358`
Branch — `feat/jt11-4-serve-queue-enemy-arrival-cadence` (pushed)

### Findings → fixes

| # | Finding | Fix | Mutation that proves the guard bites |
|---|---------|-----|--------------------------------------|
| R2-F1 | [HIGH] orchestrator RED — epic shard flattened to column 0 | re-serialised to 2-space; structural compare vs `HEAD` shows no content delta beyond the recorded verdict | the suite itself: 477/478 before, **478/478** after |
| R2-F2 | [MEDIUM] wave-4 troll control blind to 61 → 366 | upper bound `<= ENEMY_STAGGER_FRAMES + 2` added beside the existing lower bound | gating on `!arrivalsStillComing` alone reddens the control — ~~"and only it (it left everything green before)"~~ **CORRECTED at finish, see below** |

> **Correction to the R2-F2 mutation record (SM, at finish — Reviewer finding R3-F2, check #23).**
> The row above originally claimed the mutation "reddens the control, and only it (it left everything
> green before)". Re-measured by the Reviewer on the branch tip: it reddens **13 tests across 5 files**
> — `demo-jt11-4.test.ts`, `demo-jt9-42.test.ts`, `demo-jt9-11.test.ts`, `demo-jt3-7-menagerie.test.ts`
> and `audio-emission.test.ts`. And because `sim.ts` and those four other test files are byte-identical
> between the round-2 tip `70b640a3` and `HEAD` (`git diff --name-only 70b640a3..HEAD` lists only
> `typescript.md`, `gotchas.md`, `demo-jt11-4.test.ts`, `epic-jt11.yaml`), **12 of those 13 reddened at
> round 2 as well.** The suite was never blind to the 61→366 regression; one file's control was.
> The fix itself is correct and stays — only the blast-radius claim was wrong. Corrected here rather
> than routed, because this table is archived as institutional memory at finish.
| R2-F3 | [MEDIUM] `JOUSTRV4.SRC:2189` cited ×4 as `PCNAP 61` | all four → `:2191`; re-read the source line before and after | — (documentation) |
| R2-F4 | [LOW] `demoSource*` helpers keep the retired term | both renamed `simSource*` (8 sites, file-local) | — (naming); `tsc` clean, zero `demoSourceSans` hits remain |
| R2-F5 | [LOW] `serveEnemies` retry arm unreachable and untested | contention test through the public `stepSim` seam | re-napping the loser (`nap: 1`) reddens it; dropping `served.length === 0` reddens it |

### The one thing I checked rather than accepted

**R2-F4's stated mitigation does not hold.** The finding recorded `demoSourceSansComments` as pre-existing
code the rename sweep had inherited, which would have argued for leaving both alone. `demo-jt11-4.test.ts`
is entirely new in this story — 443 added lines, no context lines — so that helper is this story's own use
of the term it retires, not an inheritance. That flipped the finding onto its other branch, so both were
renamed. Logged as a deviation.

### Test-count arithmetic

3487 → 3488 is **exactly** the one test added (the contention case). The troll upper bound is a second
assertion inside an existing test, so it moves no count. No pre-existing test was lost, renamed away or
silently skipped.

### Note on the verification claim

The round-2 commit's "Full verification" line named three suites and omitted `npm run test:orchestrator`,
which is what let R2-F1 ship. Every gate is listed above, and the orchestrator suite ran on the committed
tree, not on a working tree that happened to differ.

**Handoff:** Back to Reviewer.


---

## Review Correlation — round 3

All five findings are from the **internal Reviewer** (round 2); no external reviewer, CI or
automated-tooling findings exist for this story (no PR is open). Language: TypeScript
(`repos.yaml` → `arcade`); checklist `.pennyfarthing/gates/lang-review/typescript.md`.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| R2-F1 | reviewer | [HIGH] A rebase re-serialised an epic shard flush-left; YAML identical, the text-level orchestrator guard saw zero stories, and the commit claimed "Full verification" while omitting that suite | NEW_CHECK | — | Added as check **#30** — "A semantics-preserving REWRITE that breaks a guard reading the file as TEXT" |
| R2-F2 | reviewer | [MEDIUM] The wave-4 troll control pinned a lower bound only; 61 → 366 stayed green | EXISTING_CHECK | **#29** An ORDERING assertion standing in for a MAGNITUDE | **Dev missed a check this story AUTHORED one round earlier.** #29 was added by jt11-4 round 2 for the arrival cadence; the troll control written in the same commit has the same defect, one axis short in the other direction (no upper bound) |
| R2-F3 | reviewer | [MEDIUM] `JOUSTRV4.SRC:2189` cited ×4 as `PCNAP 61`; the instruction is at :2191 | EXISTING_CHECK | **#17** Comments and docs that assert a MECHANISM nobody re-ran | Dev missed an existing check — and the wrong number originated in the round-1 FINDING text, so it was copied from the review rather than read from the source |
| R2-F4 | reviewer | [LOW] `demoSource*` helpers keep the term the branch retires | NOT_APPLICABLE | — | Project-specific naming, not a TypeScript pattern |
| R2-F5 | reviewer | [LOW] `serveEnemies`' retry arm is unreachable in production and untested | NOT_APPLICABLE | — | A faithful port of a ROM branch the port cannot yet reach is a deliberate state, not a language-level bug class; carried forward as a Delivery Finding against jt11-9 instead |

### Signal Summary
- **External findings: 0** — no PR open; no external or AI reviewer has seen this branch
- **CI findings: 0** — no CI run yet; every gate was run locally on the COMMITTED tree
- **Internal findings: 5** (1 HIGH, 2 MEDIUM, 2 LOW), all caught in-process by the Reviewer
- **New checks added: 1** (#30 — internal-sourced, so no `[EXT]` prefix)

**Worth flagging for the repeat-miss rule — twice over:**

1. **#29 was missed by the story that wrote it,** in the same commit. A check authored from one
   finding was not then applied to the sibling test in the same diff. The generalisable habit: when a
   round adds a check, re-scan **that round's own diff** against it before handing back — which is what
   check #13 (the fix-introduced-regressions meta-check) already says, and #13's range had just been
   bumped to `#14-#29` by the very commit that missed #29.
2. **#15 remains the standing candidate for automation** (flagged in round 2, unchanged here): a lint
   rule rejecting `src.includes(<identifier>)` and bare `toContain('<identifier>')` over source text read
   from disk would catch that whole class mechanically.

---

## Subagent Results

**Round 3** — re-review of the rework (`dbd13358`) and the post-assessment doc commit (`a29c0097`),
against the whole story diff. Scope: `git diff origin/develop...HEAD` (147 files) with the round-3
delta `git diff 70b640a3..HEAD` (4 files) read separately. Branch tip `a29c0097`; base
`origin/develop` = `bd111c89` (local `develop` was stale at `3a8d1b5a` and was NOT used).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (stray artifact; all 8 gates green) | confirmed 1, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain worked by hand (R3-F1, R3-F3) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain worked by hand (see Verified good) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain worked by hand (R3-F1, R3-F2, R3-F4) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 2, dismissed 0, deferred 1 (routed as a Delivery Finding) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain worked by hand (see Verified good) |
| 7 | reviewer-security | Yes | findings | 1 (low, informational) | confirmed 0, dismissed 0, deferred 1 (third-round deferral, unchanged) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain worked by hand (R3-F3, R3-F7) |
| 9 | reviewer-rule-checker | Yes | findings | 1 confirmed + 1 unproven lead + 2 errors of fact | confirmed 1, dismissed 1, deferred 0 |

**All received:** Yes (4 enabled returned, 5 pre-filled as disabled)
**Total findings:** 5 confirmed from specialists, 1 dismissed (with rationale), 2 deferred

### Domains I hand-worked because their specialist is off

`edge_hunter`, `silent_failure_hunter`, `test_analyzer`, `type_design` and `simplifier`. Commands, so
the work is re-runnable rather than asserted:

- **edge/test:** the mutation battery below (`npx vitest run --project joust` per mutant, each mutation
  applied with `Edit`, reverted with `git checkout --`, `git status --porcelain` empty before and after).
- **test (dead-seam probe):** a throwaway `plugins/joust/tests/zz-reviewer-probe.test.ts` driving
  `seatWaveByStepping` and counting the frames wave 2 needs; run, read, **deleted** (`git status
  --porcelain` empty afterwards, `HEAD` still `a29c0097`).
- **simplifier:** `grep -rn '<helper>' --include='*.ts' .` for every export added by
  `tests/helpers/wave-entry.ts`; `git ls-files '*.png'` for the artifact census.
- **type_design/silent_failure:** re-read every `??`/`?.` and every failure path in the core diff; no
  new swallow, no new cast. Corroborated independently by `reviewer-rule-checker` check #4 (4/4 `??`
  correct) and check #1 (zero type-safety escapes added).

### Reviewer mutation battery (round 3)

Four mutants against the branch tip, each reverted and the tree re-verified clean. Baseline before and
after: joust **3488/3488** (177 files), orchestrator **478/478**.

| # | Mutation | Site | Expected | Measured | Verdict |
|---|----------|------|----------|----------|---------|
| M1 | `nap: ENEMY_STAGGER_FRAMES * (pending.length + 1)` → `ENEMY_STAGGER_FRAMES + 100 * pending.length` (gaps become 100, first arrival still 61) | `sim.ts:1340` | red | **GREEN — 3488/3488, all 177 files** | **SURVIVES** → R3-F1 |
| M2 | retry arm `nap: 0` → `nap: 1` | `sim.ts:1379` | red | red, **exactly 1 test** (the new contention test, on "served on the very next frame") | caught — R2-F5 bites |
| M3 | drop `served.length === 0 &&` from the service gate | `sim.ts:1371` | red | red, **exactly 1 test** (the same contention test) | caught — R2-F5 bites |
| M4 | troll gate → `!arrivalsStillComing` alone (the round-2 regression) | `sim.ts:2554` | red | red, **13 tests across 5 files** | caught — R2-F2 bites, but see R3-F2 |

M1 is the finding: the story's headline ROM constant can be changed by 64% and nothing in the cabinet
notices. M4 is the correction: the blast radius is 13, not 1, and 12 of those 13 pre-date round 3.

### Rule Compliance

Checklist: `.pennyfarthing/gates/lang-review/typescript.md`, 30 checks (the branch adds #27-#30 itself).
`reviewer-rule-checker` enumerated all 30; I re-derived the ones round 2 found broken plus the ones the
round-3 diff could newly violate. Applicable checks and their verdict on THIS diff:

- **#13 (fix-introduced regressions, meta)** — **VIOLATION, twice.** (a) The range string was bumped at
  `typescript.md:104` (`#14-#30`) but not at `:590` or `:655`, which still read `#14-#29` — check #24's
  pattern inside the checklist that defines it (R3-F5). (b) Round 3's own diff does not re-scan against
  #29: the troll assertion gained its upper bound, the sibling cadence assertion 130 lines above did not
  (R3-F1). Round 3's correlation names this exact habit as the lesson and then repeats it.
- **#15 / #25 (source-text token vs. claim; guard scope)** — **COMPLIANT.** Every source-text assertion
  in `demo-jt11-4.test.ts:444-488` runs over `simSourceSansImports()`, anchors on invocation syntax
  (`\b<fn>\s*\(`), and carries its own non-vacuity control. The negative arm (`function\s+<fn>\b` must be
  false) closes the re-implementation hole. Independently enumerated by the rule-checker; I agree.
- **#17 / #20 (comments asserting an unrun mechanism; quantities from a self-changing artifact)** —
  **MOSTLY COMPLIANT, one violation.** I byte-read `JOUSTRV4.SRC:2185-2196`: `:2191` is `10$ PCNAP 61`
  and `:2189` is `STD PWRTS2,U`, so R2-F3's four corrections are right and the `:2187-2192` range is
  right. `sim.ts:700` still cites `:2618` for `SECCR PTERST`, which is at `:2621` — pre-existing, routed
  (Delivery Finding). The `serveEnemies` doc comment's behavioural claims (one per frame, `nap: 0` not
  `nap: 1`, `61*(i+1)`) all match the code and are now mutation-backed by M2/M3.
- **#23 (a recorded mutant whose red count is not blast radius)** — **VIOLATION.** The Dev Assessment's
  round-3 table records M4 as reddening "the control, and only it… it left everything green before".
  Measured: 13 tests, 5 files, 12 of them pre-dating round 3 (R3-F2).
- **#24 (a retirement applied where the AC named it, and nowhere else)** — **VIOLATION, low.**
  `stepSim(demo: SimState, …)` (`sim.ts:2168`) still names its parameter `demo` and reads `demo.` 24
  times inside the very function the rename renamed, while commit `13265a4d` claims the name "means the
  same thing everywhere" (R3-F8). The 49 `demo-*.test.ts` filenames and `main.ts`'s genuine `'demo'`
  attract page are correctly out of scope — Dev logged the former as a deliberate deferral.
- **#27 (a gate that waits for a THING, in a mode where the thing is never created)** — **COMPLIANT and
  mutation-proven.** The gate is the disjunction the check prescribes; M4 shows it bites.
- **#28 (a guard selecting its read-set by pattern)** — **COMPLIANT.** The purity scanner enumerates
  `coreDir` with `readdirSync(recursive)` rather than a name pattern, so the rename could not blind it;
  the round-1 F-2 audio-selector fix is in place. Verified by rule-checker and by `reviewer-security`.
- **#29 (an ORDERING assertion standing in for a MAGNITUDE)** — **VIOLATION.** See R3-F1 and
  "Challenged" below.
- **#30 (a semantics-preserving rewrite breaking a text guard)** — **COMPLIANT.** I parsed
  `sprint/epic-jt11.yaml` at `70b640a3` and at `HEAD` with `yaml.safe_load` and compared story-by-story:
  12 stories both sides, identical field sets, and the ONLY content delta is jt11-4's `review_verdict`
  and `review_findings`. The re-indent restored `^ {2}- id:`, `^ {4}title:`, `^ {4}status:` and
  `^ {4}acceptance_criteria:` — orchestrator **478/478**, re-run by me and by two specialists.
- **#1-#12, #14, #16, #18, #19, #21, #22, #26** — no violating instance in this diff (rule-checker
  enumerated each; I spot-checked #4's four `??` sites and #26's assertion terms and concur).

### Challenged VERIFIEDs and dismissed findings

- **CHALLENGED — `reviewer-rule-checker` reported check #29 CLEAN.** It judged only the two assertions
  round 3 ADDED and did not enumerate the sibling cadence assertions at `demo-jt11-4.test.ts:246` and
  `:252`, which are lower-bound only. I did not take its VERIFIED: I mutated the nap seed (M1) and the
  whole cabinet stayed green. Evidence beats enumeration; the check is violated (R3-F1).
- **CHALLENGED — `reviewer-rule-checker` states `tests/jt9-55-joust-yaml-refs.test.mjs` is "not exposed
  (different epic file, untouched by this diff)".** It IS touched: `git diff origin/develop...HEAD --
  tests/jt9-55-joust-yaml-refs.test.mjs` is 15 lines, and the changed hunk is R3-F4.
- **DISMISSED — `reviewer-rule-checker`'s check-#14 lead** that the egg-hatch quota gate
  (`sim.ts:2316-2321`) diverges from the ROM by counting only live enemies and not `pendingEnemies`.
  Dismissed on primary source: `JOUSTRV4.SRC:2193` is `INC NENEMY`, and it sits AFTER `SECCR CREEM`
  (`:2192`) which sits after `10$ PCNAP 61` (`:2191`). A bird still serving its WCREATE nap is not in
  NENEMY on the machine either, and `pendingEnemies` models exactly that pre-create nap — so excluding
  it MATCHES the ROM rather than diverging from it. Not a defect; no follow-up needed.
- **DEFERRED — `reviewer-security`'s optional-field note** (`pendingEnemies`/`serviceQueue` default
  independently). Same item as round 1 and round 2, deferred a third time, not dismissed: every
  production write pairs them, `game.ts` never builds a partial `SimState`, and nothing serialises one.
  Routed as a Delivery Finding.
- **DEFERRED — `reviewer-comment-analyzer`'s `sim.ts:700` citation** (`:2618` for `SECCR PTERST`).
  Confirmed true by byte-read but pre-existing (jt9-59) and out of this story's citation set; routed as
  a Delivery Finding rather than added to the severity table.

### Devil's Advocate

Argue this is broken. Start with the one thing three rounds have never questioned: the suite's ability to
tell the ROM's cadence from a wrong one. It cannot. I changed the gap between arrivals from 61 frames to
100 — a bird every 1.67 seconds instead of every second, which is the difference between a wave that
opens and a wave that dawdles — and 3488 tests across 177 files reported success. Every artifact this
story produced says the opposite: the test's own comment says "the stagger has magnitude, not just
order"; the sidecar entry says "one of the assertions must carry the number"; check #29 exists because
of this exact story. All three are true only in one direction. The number is carried against being too
SMALL and nothing at all against being too LARGE, and the only reason a grosser inflation gets caught is
an accident — the troll test's new upper bound happens to pin the FIRST arrival, and `WINDOW = 400`
happens to cap the last. Neither was written to guard the cadence. Remove or retune either for its own
reasons and the cadence loses its last accidental bound with no test going red to say so.

Now the confused user, who here is the next Dev. `wave-entry.ts` tells them, in a doc comment, to reach
for `seatWaveByStepping` "if the frames matter". They will — jt11-9 is pad occupancy and frames are the
whole point. It will throw on wave 2. Not on some exotic wave: wave 2, the second wave in the game, four
bounders, 244 frames against a default limit of 240. The helper has never been called by anything, so no
test has ever discovered this, and the error it throws ("the transporter still had 1 enemy(s) queued
after 240 frames") reads like a sim bug rather than a fixture-limit bug, which is exactly the wrong place
to send someone.

The malicious reader is the one who trusts the record. The round-3 assessment says the troll mutation
reddened one test and that everything was green before it — so a future story, seeing the troll gate as
guarded by exactly one control, might feel free to rewrite that control. In fact twelve other tests
guard it and always did. The record understates the safety net and overstates the fix, which is the
worst combination: it invites a change that the record says is risky and the suite says is safe, and it
does so from the sidecar, where it will outlive everyone who could correct it.

What of stressed inputs? A wave whose complement is large — wave 10 fields eight bounders — holds its
waiting room open for 488 frames, over eight seconds, and the wave-clear gate correctly refuses to clear
while a ticket is outstanding. I could find no path where a wave clears early or never clears: tickets
are dense and monotone, `leserv` only advances, players take no numbers in this port, and the retry arm
re-queues rather than drops. I looked for a livelock and there is none. The failures here are all
failures of the net, not of the fish.

### Reviewer (audit)

See `### Reviewer (audit, round 3)` under Design Deviations above — both round-3 Dev deviations stamped
ACCEPTED (one mutation-verified), plus one UNDOCUMENTED deviation added (the false mutation record).

---

## Reviewer Assessment

**Verdict:** APPROVED

Round 3. **All five round-2 findings are genuinely fixed, and I proved three of them by mutation rather
than by reading.** R2-F1's re-indent is content-clean — I parsed the epic shard at `70b640a3` and at
`HEAD` and the only delta across twelve stories is jt11-4's own two `review_*` fields — and the
orchestrator suite is 478/478. R2-F2's troll window bites (M4). R2-F5's contention test bites on both
of the mutations Dev claimed for it, and on nothing else (M2, M3). R2-F3's four citations are correct:
`JOUSTRV4.SRC:2191` is `10$ PCNAP 61`, byte-read. R2-F4's rename is complete. Every gate is green and
every number in the Dev Assessment matched exactly when re-run independently.

**No Critical or High issue, so this does not block.** The findings below are two MEDIUMs and five LOWs,
all in the test net and the record rather than in the simulation — which is itself the shape of the
round: the production code has now survived three rounds and a twelve-mutant cumulative battery.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM][TEST][EDGE] | **The arrival cadence is pinned on one side only, and the story's headline ROM constant is therefore unguarded.** `frames[0] >= 61` and `frames[i] - frames[i-1] >= 61` have no upper bound. **Measured, not argued:** reseeding the nap as `ENEMY_STAGGER_FRAMES + 100 * pending.length` — gaps of 100 instead of the ROM's 61, first arrival unchanged — leaves **the entire joust suite green, 3488/3488 across 177 files** (M1). The cadence is bounded above only by accident: the troll test's new `<= 61 + 2` pins the FIRST arrival, and `WINDOW = 400` caps the last. This is R2-F2's own defect on the sibling assertion in the same file, and check **#29 — which this story authored — now stands violated by this story for the second consecutive round.** | `plugins/joust/tests/demo-jt11-4.test.ts:246` and `:252` | The gaps are EXACTLY 61 (M1's baseline). Change both `toBeGreaterThanOrEqual(ENEMY_STAGGER_FRAMES)` to `toBe(ENEMY_STAGGER_FRAMES)`. Two tokens. Re-run M1 to confirm it now reddens. |
| [MEDIUM][SIMPLE][EDGE] | **A new exported helper has zero callers and its default cannot seat wave 2.** `seatWaveByStepping(state, step, limit = 240)` is referenced by nothing in the repository (`grep -rn` across `*.ts`/`*.mjs`/`*.md`: only its own definition and the doc comment pointing at it). **Measured:** wave 2's four bounders need **244** frames; called with the default it throws `the transporter still had 1 enemy(s) queued after 240 frames`. Wave 3 (6 bounders) needs 366, wave 10 (8) needs 488 — so the default is wrong for every wave past the first. The module's own doc directs the reader to it ("Use `seatWaveByStepping` if the frames matter"), and jt11-9 — already filed — is the story that will. `pendingEnemyCount` is likewise exported with no external caller. | `plugins/joust/tests/helpers/wave-entry.ts:83` | Derive the bound from the complement rather than pinning a constant: `limit = ENEMY_STAGGER_FRAMES * (pendingEnemyCount(state) + 2)`. Or delete both unused exports until a caller exists — the project rule is not to build for hypothetical callers. Either way it needs a test, since nothing exercises it today. |
| [LOW][TEST][RULE] | **The round-3 mutation record is false, and it is about to be archived.** The Findings→fixes table states the `!arrivalsStillComing` mutation "reddens the control, and only it (it left everything green before)". Measured on the tip: **13 tests across 5 files** (`demo-jt11-4`, `demo-jt9-42`, `demo-jt9-11`, `demo-jt3-7-menagerie`, `audio-emission`). `sim.ts` and those four other files are byte-identical between `70b640a3` and `HEAD`, so **12 of the 13 reddened at round 2 as well** — the suite was never blind to the 61→366 regression; one file's control was. Check **#23** (a recorded mutant whose red count is not blast radius). | `.session/jt11-4-session.md`, Dev Assessment round 3, R2-F2 row | Correct the row to the measured blast radius before finish archives it. The fix itself is right and stays. |
| [LOW][TEST] | **The replacement control repeats the defect its own comment forbids.** The jt9-55 ambiguity control was moved off `sim.ts` (which jt11-4 made real for joust) onto `attract.ts`, and the new comment states the rule: *"Pick a basename joust genuinely lacks, not one it happens to lack today."* `attract.ts` is precisely such a name — joust has `src/core/attract-scheduler.ts` and `src/shell/attractScreen.ts`, and the fleet-convergence pressure that just produced `sim.ts` is the same pressure that would produce `attract.ts`. | `tests/jt9-55-joust-yaml-refs.test.mjs:230` | Pick a game-specific noun joust cannot acquire: `volcano.ts` (battlezone), `mirv.ts` (missile-command), `scorpion.ts` (centipede) or `trench-channel.ts` (star-wars). |
| [LOW][DOC][RULE] | **Check #13's range was bumped in one of three places.** `typescript.md:104` reads "#1-#12 and #14-#30"; the pass template at `:590` and the fail-recovery entry at `:655` still read "#14-#29". Check #24's pattern, inside the checklist that defines check #24. | `.pennyfarthing/gates/lang-review/typescript.md:590`, `:655` | Both to `#14-#30`. |
| [LOW][DOC] | **The rename converted a dangling line-ref into a plausible one.** `enemy.ts:534` cites `sim.ts:425` and `:654` for the `pchase: 0` / `brain: 'linet'` spawn sites; `:425` is the `serviceQueue` field declaration and `:654` is the enemy-types doc block. It was already wrong as `demo.ts:425` on `origin/develop` (verified) — but a filename that no longer exists reads as suspect where a live one reads as authoritative, which `comment-line-refs.test.ts`'s own header calls "the worse failure". That guard covers test comments only; `src/` holds 5 such refs and this story rewrote 2. | `plugins/joust/src/core/enemy.ts:534` | Name the SYMBOL instead of the line, per the jt9-30 rule the guard already enforces one directory over. Routed as a Delivery Finding for the scope widening. |
| [LOW][RULE] | **The retirement's most conspicuous survivor is inside the renamed function.** `stepSim(demo: SimState, …)` still names its parameter `demo` and reads `demo.` 24 times, while the rename commit `13265a4d` claims the name "means the same thing everywhere". Dev logged the 49 `demo-*.test.ts` filenames as a deliberate deferral but not this. Check #24. | `plugins/joust/src/core/sim.ts:2168` | Rename the parameter to `state` (mechanical, file-local, `tsc` will confirm), or add it to the deferral Dev already logged so the claim and the code agree. |
| [LOW][SIMPLE] | **A stray screenshot was committed to the repo root and survived two reviews.** `joust-after-start.png` (1635×1085, added by `3c7c8196`) is referenced by nothing (`grep -rn "joust-after-start"` outside `.git`: no hits) and is the only tracked PNG at the root — every other tracked PNG lives under `plugins/*/docs`, `plugins/*/public`, `lobby/public` or `sprint/demos`. | `joust-after-start.png` | Delete it. [confirmed by `reviewer-preflight`] |

**Verified good (evidence, not assertion):**

- `[VERIFIED]` **Every gate re-run independently and every Dev number matched exactly** — joust
  **3488/3488** (177 files), cabinet-wide **14882 passed / 1 todo**, orchestrator **478/478**, `npm run
  lint` clean, `node scripts/build-app.mjs joust` OK, citations **1083 claims / 35 files**. Confirmed by
  `reviewer-preflight` and re-run by me before and after the mutation battery. Working tree clean, tip
  `a29c0097` unchanged.
- `[VERIFIED]` **R2-F1 is content-clean, proven by parsing rather than by eyeballing hunks** —
  `yaml.safe_load` of `sprint/epic-jt11.yaml` at `70b640a3` and at `HEAD`, compared story-by-story:
  12 stories both sides, identical field sets, and the sole content delta is jt11-4's `review_verdict:
  rejected` and `review_findings`. Check #30's own prescribed method, applied to check #30's own fix.
- `[EDGE]` `[VERIFIED]` **The troll gate bites, and harder than recorded** — M4 reddens 13 tests across
  5 files. `[TEST]` **The contention test bites on exactly the two mutations claimed for it, and on
  nothing else** — M2 and M3 each redden precisely one test, the new one.
- `[DOC]` `[VERIFIED]` **Every ROM citation this branch adds or changes opens on what it claims.**
  I byte-read `JOUSTRV4.SRC:2185-2196` myself (`:2191` = `10$ PCNAP 61`, `:2189` = `STD PWRTS2,U`), and
  `reviewer-comment-analyzer` independently byte-verified ~15 more — CREEM `:5663-5666`, CRELP
  `:5667-5676`, the players-first branch `:5672-5674`, `GOTTR INC [TCURUSE,X]` `:5710`, `INC LESERV`
  `:5724`, WCREATE `:2187-2192`/`:2187-2207`, WAVEGG `:2737`, `spawnProceeds` `:5641-5654`,
  `CMPA #PLYID/BEQ CREPLY` `:5670-5671`, the VRAND fall-through `:5678-5709` — extent as well as line.
  Zero `:2189` references remain anywhere in the tree. One pre-existing error found and routed
  (`sim.ts:700`).
- `[SEC]` `[VERIFIED]` **No starvation, livelock, unbounded growth or false wave-clear is reachable.**
  Independently reasoned and corroborated by `reviewer-security`: `pendingEnemies` is REPLACED not
  appended at both write sites, `serviceQueue` re-seeds per wave, `nap` cannot go negative (`pe.nap > 0`
  guards the decrement), tickets are dense and monotone in the same order as the naps so the single
  forward pass always meets the lowest live ticket first, `takePlayerNumber`/`playerTurn`/`servePlayer`
  have zero production callers so the players-first gate is permanently satisfied, and `enemiesLeft`
  (`sim.ts:2393`) ORs in `pendingEnemies.length > 0` so a wave cannot clear over an outstanding ticket.
  Injection, authn, tenancy, secrets and CORS genuinely do not apply to an offline single-player game.
- `[SILENT]` `[VERIFIED]` **No swallowed error or silent fallback introduced** (domain disabled; worked
  by hand). Re-walked every failure path: `seatWaveByStepping` THROWS with a count rather than returning
  a half-seated state — which is why R3-F3 is a limit bug and not a corruption bug; `pickTrollVictim`
  returning `null` leaves `trollArmed` latched so the rise RETRIES rather than being dropped
  (`sim.ts:2557-2561`); the retry arm re-queues instead of discarding (`sim.ts:1379`). The one silent
  fallback, `state.pendingEnemies?.length ?? 0` (`wave-entry.ts:41`), is the deliberate structural typing
  already deferred.
- `[TYPE]` `[VERIFIED]` **Type invariants hold** (domain disabled; worked by hand, corroborated by
  `reviewer-rule-checker`): zero `as any` / `as unknown as` / `@ts-ignore` added anywhere in the diff,
  all four new `??` sites are on genuinely-optional fields with no `0`/`''` masking, every new relative
  import carries `.js`, and `type`-only imports are marked. `tsc --noEmit` repo-wide is the real proof
  and it is clean.
- `[SIMPLE]` `[VERIFIED]` **The `wave-entry.ts` helpers that ARE used are used widely** — 45 call sites
  for `seatWaveInstantly`, 37 for `withNoPendingEnemies`, 30 for `strippedToPlayers`, 13 for
  `waveComplement`. The abstraction earned itself; only the two unused exports (R3-F3) did not.
- `[TEST]` `[VERIFIED]` **No pre-existing test was weakened, renamed away or silently skipped.** Compared
  `expect(` and `it(`/`test(` counts against `origin/develop` for the ten most-churned suites: every one
  is identical or higher (`audio-events` 46→48, `audio-channel-role` 51→53 and 19→21 tests; the other
  seven unchanged at identical counts despite large diffs — the churn is the rename, not the assertions).
- `[RULE]` `[VERIFIED]` **The core/shell purity boundary survived the rename that could have blinded it.**
  `purity-scanner` enumerates `coreDir` with `readdirSync(recursive: true)` rather than a name pattern,
  so `sim.ts` is still swept — the round-1 F-2 failure mode (a regex-selected read-set) does not recur
  here. Zero `Math.random`/`Date.now`/`window.`/`document.`/`localStorage`/`fetch` in `sim.ts`.

**Data flow traced:** wave advance seeds the waiting room — `pendingWaveEnemies` draws a ticket per
ground enemy in entry order and stamps `nap = 61 * (i + 1)`; eggs bypass the transporter entirely and
enter immediately (WAVEGG). Each frame `serveEnemies` decrements every nap, and the ONE awake bird whose
ticket equals `leserv` is spliced into `processes` while `serveEnemy` advances the counter; a bird that
is awake but out of turn re-queues at `nap: 0`, eligible again next frame. The troll gate then reads the
waiting room the service just drained, rising once a bird stands on the pads OR once nothing is coming —
the second disjunct being the egg wave, where nothing ever will. The wave-clear gate counts an
outstanding ticket as a live enemy, so the wave cannot advance out from under its own arrivals. Safe
because every stage is a pure function of the previous state and a seeded RNG, and because the two
counters that could disagree (`pendingEnemies`, `serviceQueue`) are written together at every production
site.

**Pattern observed:** `plugins/joust/tests/helpers/wave-entry.ts` is the right pattern done well — a
behaviour change that would otherwise have rippled into dozens of unrelated fixtures was absorbed by
three named helpers that say what each caller MEANT (`seatWaveInstantly` for "I just need birds",
`withNoPendingEnemies` for "force a clear"), with the doc comment forbidding their use in the suite the
story is actually about. 112 call sites adopted it. The anti-pattern is one file over: the two exports
nobody adopted (R3-F3) shipped untested with a default that cannot work.

**Error handling:** `serveEnemies`' failure arm re-queues rather than dropping (`sim.ts:1374-1379`) and
`pickTrollVictim`'s `null` leaves the latch armed (`sim.ts:2557-2561`) — both retry rather than lose
state. `seatWaveByStepping` throws with a count instead of returning a half-seated state
(`wave-entry.ts:86-88`), which is correct design and is exactly why R3-F3 surfaces as a loud throw
rather than a quiet wrong fixture.

**Handoff:** To SM for finish-story. Three notes for finish: (1) recording this verdict re-serialises
`sprint/epic-jt11.yaml`, which is the file round 2's HIGH was about — **re-run `npm run
test:orchestrator` after the verdict is written**, per check #30; (2) R3-F1 and R3-F2 are two-token and
one-paragraph fixes that would be cheap to take in-phase before archiving, since R3-F2's record becomes
institutional memory at archive time; (3) R3-F3 and the routed Delivery Findings belong with **jt11-9**
(pad occupancy — it is the story that will call `seatWaveByStepping`) and **jt11-10** (the naming/pins
chore — R3-F5, R3-F7, R3-F8).