---
story_id: "jt11-5"
jira_key: "jt11-5"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-5: Lava shore + burn-off

## Story Details
- **ID:** jt11-5
- **Jira Key:** jt11-5
- **Workflow:** tdd
- **Stack Parent:** none (standard repo, no depends_on)
- **Branch:** feat/jt11-5-lava-shore-burn-off
- **Branch Strategy:** gitflow (feat/jt11-5-lava-shore-burn-off)
- **PR:** https://github.com/slabgorb/arcade/pull/282

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T15:09:46Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T13:54:59Z | 2026-08-12T13:57:14Z | 2m 15s |
| red | 2026-08-12T13:57:14Z | 2026-08-12T14:31:32Z | 34m 18s |
| green | 2026-08-12T14:31:32Z | 2026-08-12T14:46:28Z | 14m 56s |
| review | 2026-08-12T14:46:28Z | 2026-08-12T14:59:25Z | 12m 57s |
| green | 2026-08-12T14:59:25Z | 2026-08-12T15:05:50Z | 6m 25s |
| review | 2026-08-12T15:05:50Z | 2026-08-12T15:09:46Z | 3m 56s |
| finish | 2026-08-12T15:09:46Z | - | - |

## Sm Assessment

Setup complete for jt11-5 (8pt, tdd, arcade). Session file, story context
(`sprint/context/context-story-jt11-5.md`), epic context, and branch
`feat/jt11-5-lava-shore-burn-off` (cut from develop, gitflow) are all in place;
sprint YAML updated to in_progress. Jira skipped — not enabled for this project.

Coordination notes for downstream agents:

- **Title-only story: the title is the spec.** Two defects, both must land:
  (A) render — transcribe BRIDGE/BRIDG2 lava-shore planks (JOUSTRV4.SRC:1126-1127,
  solid-colour DMA fills 54x3 at 0,211 and 60x3 at 240,211) as a solid-fill DrawOp
  kind, so landMaskAtX's or-0x20 landable shore (flight.ts:210-214,
  JOUSTRV4.SRC:987-989) is no longer invisible black at x 0-54/240-300 y211.
  (B) sim — wire the dead ArenaState queries (groundOutcomeInState /
  bridgeGroundOutcome / backgroundActive, arena-state.ts:172-199, zero callers)
  into the production ground-mask consumers (frame.ts:257,266; enemy.ts:1287,1294;
  demo.ts:1285), make or-0x20 conditional on !bridgeBurned for bridge columns
  (LAVAB, JOUSTRV4.SRC:5258-5264), and filter drawList BACKGROUND_RECORDS by
  arena.destroyedCliffs (demo.ts:2534-2549).
- **Out of scope:** CLFDES crumble animation (that is jt11-7). CLIF5 island is
  correctly indestructible and already renders — do not touch.
- **Sequencing:** shares demo.ts with jt11-4 (still backlog, not started). Do not
  let jt11-4 start in a sibling checkout while this story is in flight.
- Line numbers in the title were measured at filing time — TEA should re-verify
  each cited site before pinning tests to it.

Routing: tdd is a phased workflow; next agent is TEA (Tyr One-Handed) for RED.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking): LNDXS3 — the post-burn landing source table the ROM's
  LAVAB sweep converges LNDXTB toward (`EORA LNDXS3,X`, JOUSTRV4.SRC:5259-5262) — is
  not transcribed in the port. The RED suite pins the burn as "drop the baked
  `ORA #$20`, keep the native LNDXS1 bits" (probed at x=20/100/250), which
  reproduces LNDXS3 only if the two tables' $20 spans agree; the island's exact
  east/west footing edges post-burn are therefore unpinned.
  Affects `plugins/joust/src/core/flight.ts` (Dev should sanity-check the LNDXS1
  $20 span against LNDXS3 in the quarry while implementing; if they differ, the
  conditional needs the transcribed span, not the global drop).
  *Found by TEA during test design.*
- **Question** (non-blocking): a stander on the burned plank now walks off into
  what `groundOutcome` calls lava-troll space (LNDB7). Whether the lava-grip hand
  (GRAB1-6, jt3-3/jt9 grip system) should then seize that faller is the troll
  system's law, not this story's; nothing pins it either way.
  Affects `plugins/joust/src/core/troll.ts` (possibly nothing — verify the grip's
  grab-zone reads already cover an entity dropped at shore X columns; file a
  follow-up story if not).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): contract drift caught up while declaring the
  seams: `steerWake`'s `bumpX` (production since jt9-48) and the scheduler
  ProcessSpec's `enemy`/`egg` arms (production since jt5-3/jt2-7) were missing
  from the TEA contracts — the same one-directional drift uf1-9 fixed for
  `stepEnemyDetailed`.
  Affects `plugins/joust/tests/helpers/` (done in this story's RED commit).
  *Found by TEA during test design.*

### Dev (implementation)

- **Question ANSWERED** (non-blocking): TEA's LNDXS3 question is settled by the
  quarry — LNDXS3 is not a second table but a LABEL 32 bytes into LNDXS1
  ("LABEL LNDXTB OR THE ZERO POINT ON SCREEN", JOUSTRV4.SRC:7797-7799), i.e. the
  zero-origin alias of the SAME source bytes. The burn's per-column target state
  IS the native table, so "drop the ORA #$20, keep the native bits" is exactly
  the ROM's law — no span transcription needed, island edges included.
  Affects nothing (`plugins/joust/src/core/flight.ts` is faithful as built).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the OTHER BCKXTB consumers in enemy.ts —
  `cliffBlocksClimb` (the vertical climb sample, jt9-23) and any future
  look-up through `bckMaskAt` — still sample the pristine background, so a
  destroyed cliff still vetoes a climb decision. No test demanded them and the
  story named only the look-ahead; candidate for a small follow-up story.
  Affects `plugins/joust/src/core/enemy.ts` (thread `arena` into
  `cliffBlocksClimb`'s sample the way `steerWake`'s got it).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): stepDemo's `arena: demo.arena` threading and enemy.ts's
  walk-off comparison are unguarded — both mutable with the full suite green
  (mutations M2/M1, Reviewer Assessment F1/F2).
  Affects `plugins/joust/tests/` (two pinning tests, this round).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): ArenaState fields are not `readonly` and the
  three PRISTINE_ARENA singletons are unfrozen while now shared across 7 call
  sites (F3); `survivingOps()` re-derives the private isForegroundArena
  threshold (F4). Both requested in-round as cheap hardening.
  Affects `plugins/joust/src/core/arena-state.ts`, `plugins/joust/src/core/demo.ts`,
  `plugins/joust/tests/lava-shore-jt11-5.test.ts`.
  *Found by Reviewer during code review.*
- **Question** (non-blocking): `backgroundActive`'s multi-bit sample law is
  unpinned though unreachable through real BCK geometry (F5) — one synthetic
  unit case would close it; if not taken this round, fold into the
  cliffBlocksClimb follow-up story Dev proposed above.
  Affects `plugins/joust/tests/arena-destruction.test.ts` (one case).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **No production-caller pin for `bridgeGroundOutcome`**
  - Spec source: story title (session file), "make the dead queries the production
    path - groundOutcomeInState/bridgeGroundOutcome/backgroundActive"
  - Spec text: all three arena-state queries are named as dead code to enliven
  - Implementation: the wiring suite pins callers for `groundOutcomeInState`
    (frame.ts, enemy.ts, demo.ts) and `backgroundActive` (enemy.ts) only; the
    bridge burn's behaviour is pinned through the conditional `groundMaskAt`
    mask instead, which subsumes what `bridgeGroundOutcome` answers
  - Rationale: the query is bridge-span-specific (a fixed $20 mask) while every
    named consumer site handles arbitrary columns; forcing a call-site would be
    wiring for wiring's sake. Dev may wire it where it genuinely fits or absorb
    it — but it must not silently stay dead: Reviewer should check its status
  - Severity: minor
  - Forward impact: Reviewer checks `bridgeGroundOutcome` ends the story either
    called or deliberately absorbed/removed with the jt3-2 unit pins updated
- **Plank z-order pinned BACKGROUND despite the port's y≥$C0 foreground split**
  - Spec source: JOUSTRV4.SRC:998-1002 (BRIDGE/BRIDG2 written with the arena's
    background objects at wave init; sprites blit over them every frame)
  - Spec text: the fills are wave-init background writes
  - Implementation: AC-1 requires both fill ops BEFORE the first entity op,
    although `isForegroundArena` (destY ≥ $C0) would route y=211 records into
    the after-sprites group like CLIF5's own art
  - Rationale: the foreground split is jt3-7's deliberate island-art ruling; the
    flat 3-px planks are ROM background, and a fill painted after the sprites
    would bar the feet of anything overlapping rows 211-213
  - Severity: minor
  - Forward impact: Dev must exempt fill ops from the isForegroundArena routing
    (or emit them before the record loop)
- **Enemy walk-off covered by proxy, not behaviourally**
  - Spec source: story title, "threading ArenaState into the ground-mask
    consumers (… enemy.ts:1287,1294 …)"
  - Spec text: both enemy ground lines (land + walk-off) consume the arena
  - Implementation: the enemy's LAND line is pinned behaviourally (shadow-brain
    descent vetoed on destroyed CLIF2) and both lines by the comment-stripped
    source pin; the grounded-enemy WALK-OFF has no behavioural test
  - Rationale: a grounded enemy's next wake re-decides its brain, and every
    brain may flap into takeOff, which is indistinguishable from walk-off at
    the assertion surface without over-constraining brain internals; the player
    walk-off test pins the shared CKGND EQ/NE law itself
  - Severity: minor
  - Forward impact: none expected — the walk-off branch is the same
    `kind !== 'platform'` dispatch in both steppers and the source pin holds
    enemy.ts to the seam

### Dev (implementation)

- **`bridgeGroundOutcome` deliberately ABSORBED, not wired**
  - Spec source: story title (session file), "make the dead queries the
    production path - groundOutcomeInState/bridgeGroundOutcome/backgroundActive"
  - Spec text: all three arena-state queries named as dead code to enliven
  - Implementation: `groundOutcomeInState` and `backgroundActive` gained real
    production callers (frame.ts/enemy.ts/demo.ts and steerWake respectively);
    `bridgeGroundOutcome` did not — the conditional `groundMaskAt` consumes the
    burn per column, which subsumes the span-level query. Its JSDoc now states
    the absorption explicitly (arena-state.ts), and jt3-2's unit suite still
    pins its semantics
  - Rationale: TEA's deviation invited exactly this disposition ("wire it where
    it genuinely fits or absorb it — but not silently"); every production
    consumer handles arbitrary columns, so a fixed-$20 span query has no honest
    call-site
  - Severity: minor
  - Forward impact: Reviewer confirms the documented absorption satisfies the
    title's intent; if not, the alternative is deleting the query plus updating
    jt3-2's contract/tests, which is churn this story should not carry

### Reviewer (audit)

- **TEA: no production-caller pin for `bridgeGroundOutcome`** → ✓ ACCEPTED by
  Reviewer: agrees — forcing a fixed-$20 span query into per-column consumers
  would be artificial; the absorption is real and now documented (see Dev
  deviation below).
- **TEA: plank z-order pinned BACKGROUND despite the y≥$C0 split** → ✓ ACCEPTED
  by Reviewer: JOUSTRV4.SRC:998/1002 verified — the planks are wave-init
  background writes; the island-fore split is jt3-7's scoped ruling, and the
  implementation exempts fills correctly (emitted into `back` before the
  record loop, pinned by AC-1).
- **TEA: enemy walk-off covered by proxy, not behaviourally** → ✗ FLAGGED by
  Reviewer: the deviation's "forward impact: none expected" is FALSIFIED by
  mutation M1 — reverting the enemy comparison to `=== 'airborne'` survives
  the full suite. Escalated to finding F2 [HIGH] in the Reviewer Assessment.
- **Dev: `bridgeGroundOutcome` deliberately ABSORBED, not wired** → ✓ ACCEPTED
  by Reviewer: the JSDoc claim was independently verified true by the
  comment-analyzer (no production call-site; the conditional mask + veto ARE
  the production consumption); jt3-2's unit pins still hold the semantics.
- **Round-2 closure of the flagged TEA deviation** (enemy walk-off by proxy):
  the F2 grounded-shadow pin now covers it behaviourally and kills mutation
  M1 — the flag is RESOLVED; no deviation remains open.

**Tests Required:** Yes
**Reason:** 8-point bug story, two defects (sim + render); the title is the spec
and every cited site was re-verified against source before pinning (line drift
found and absorbed: applyWaveDestruction demo.ts:2252 not :2249, wave-1 seed
:1259 not :1254, egg ground check :1290 not :1285, drawList :2539-2557).

**Test Files:**
- `plugins/joust/tests/lava-shore-jt11-5.test.ts` — behaviour: AC-1 plank fills
  (geometry/colour transcribed from JOUSTRV4.SRC:1126-1127, LIB EQU $8 :60),
  AC-2 burn-off driven by demo.arena (producer-pinned both directions with
  arena splices), AC-3 drawList filters BACKGROUND_RECORDS by destroyedCliffs
  (op-identity + order via the record projection; real path at wave 6, $F0
  synthetic, WCLFEW rebuild), AC-4 the conditional OR-$20 mask law
  (plank/island/back-compat probes), AC-5 player land + walk-off through
  stepFrame opts.arena (CKGND EQ/NE: LNDB7 "INDICATE NOT TO LAND" :6792),
  AC-6 enemy descent veto (stepEnemyDetailed ctx.arena), egg bounce vetoes
  (stepEgg arena + the frame.ts egg call-site), AC-7 steerWake background veto
  (destroyed CLIF1L clears both CLIF1 bits $03; unrelated-cliff control).
- `plugins/joust/tests/lava-shore-jt11-5-wiring.test.ts` — comment-stripped
  source pins (the hud-jt11-2 hardened ?raw idiom, stripper controlled both
  ways): groundOutcomeInState called from frame.ts/enemy.ts/demo.ts,
  backgroundActive from enemy.ts, and main.ts dispatching a 'fill' op kind.
- Contract catch-up (TEA-owned): demo-contract (DrawOp 'fill' kind +
  width/colour, stepEgg arena), flight-contract (groundMaskAt arena),
  scheduler-contract (stepFrame opts {wave, arena}; ProcessSpec enemy/egg),
  enemy-contract (steerWake bumpX + arena; stepEnemyDetailed ctx.arena).
- `plugins/joust/README.md` — derived file census 174 → 176 (the
  audio-seam-scope jt5-7 AC5 guard; bumped in the same commit).

**Tests Written:** 33 (25 behaviour + 8 wiring) covering 7 ACs
**Status:** RED (20 failing — 15 behaviour + 5 wiring; every failure verified
to be the intended assertion, no premise failures) — verified by testing-runner
(RUN_ID jt11-5-tea-red): 3443 passing elsewhere, 174 other files green,
`npm run lint` clean. RED committed as `test(jt11-5): RED - lava shore planks
render + burn-off consumed by production ground paths`.

### Rule Coverage

| Rule (lang-review/typescript) | Test(s) | Status |
|------|---------|--------|
| #1 type escapes (no `as any`/`!`) | suite itself is cast-free; contract types force Dev to type the new params | n/a (rubric) |
| #2 readonly params not mutated | steerWake/stepFrame purity pinned by existing steering/scheduler suites; new tests pass shared fixtures re-used across arms (a mutation would poison the second arm) | failing→green with impl |
| #4 null/undefined (optional arena defaults pristine) | `back-compat: an INTACT arena (and no arena at all) keep today's mask`, plus every no-arg premise arm | passing today, guards impl |
| #5 ESM `.js` specifiers / `import type` | tsc (`npm run lint`) over the new files + contracts | passing |
| #3 enums, #6 React, #7 async | no enums/JSX/async surface in scope | n/a |

**Rules checked:** 3 of 3 applicable lang-review rules have coverage (2 by
test, 1 by the repo-wide type gate); `.claude/rules/` and `SOUL.md` do not
exist in this repo.
**Self-check:** 0 vacuous assertions found; every burn/veto test carries an
in-test pristine premise or a passing control twin, and the two AC-2 arms that
are vacuously green today (zero fills at wave 3) are paired with the red
presence + producer pins that give them teeth.

**Handoff:** To Dev (Loki Silvertongue) for GREEN. Implementation surface the
tests dictate: `groundMaskAt(x, y, arena?)` drops the baked `| 0x20` when
`arena.bridgeBurned`; `stepFrame(state, inputs, {wave, arena})` threads the
arena to the player pair, `stepEnemyDetailed` ctx, and `stepEgg`; consumers
resolve outcomes through `groundOutcomeInState`; `steerWake(enemy, target,
bumpX, arena)` masks the BCK sample through `backgroundActive`; `drawList`
emits the two fill ops while `!arena.bridgeBurned` (BEFORE the entity ops) and
filters BACKGROUND_RECORDS by `destroyedCliffs`; `main.ts` paints
`kind === 'fill'` with fillRect through the palette. The demo layer must pass
`demo.arena` into its stepFrame/stepEgg calls or the producer pins stay red.
CLFDES crumble is jt11-7 — do not touch. jt11-4 shares demo.ts — keep it
sequenced, not parallel.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/flight.ts` - groundMaskAt gains optional arena; once
  bridgeBurned the mask is the plain table AND (the LAVAB per-column clear at
  bit granularity; LNDXS3 verified to be the zero-origin label INTO LNDXS1, so
  the native bytes ARE the post-burn state)
- `plugins/joust/src/core/frame.ts` - stepFrame opts gains arena, threaded via
  runBehaviour into the player pair (land + walk-off through
  groundOutcomeInState, walk-off now CKGND's kind !== 'platform'), the enemy
  ctx, and the egg call-site
- `plugins/joust/src/core/enemy.ts` - stepEntity mirrors the player pair;
  stepEnemyDetailed ctx gains arena; steerWake gains (bumpX, arena) and masks
  its BCKXTB sample through backgroundActive
- `plugins/joust/src/core/demo.ts` - stepEgg gains arena (ledge test through
  groundOutcomeInState + conditional mask); stepDemo passes demo.arena into
  stepFrame; DrawOp gains kind 'fill' + width/colour; drawList emits the
  BRIDGE/BRIDG2 fills into the back group while !bridgeBurned and filters
  BACKGROUND_RECORDS by destroyedCliffs (variant rows via their _-prefix cliff)
- `plugins/joust/src/core/arena-state.ts` - bridgeGroundOutcome JSDoc records
  the documented absorption (see Dev deviation)
- `plugins/joust/src/main.ts` - blitOp paints kind 'fill' with fillRect through
  the palette nibble (the drawIsland idiom)

All no-arena callers step against one shared PRISTINE_ARENA instance —
bit-identical to the old bare-groundOutcome path, which is why zero existing
tests moved.

**Tests:** 3463/3463 joust (33/33 story tests GREEN, RED->GREEN with no other
test touched), 478/478 orchestrator, lint clean, 1083/1083 ROM citations
verified — testing-runner RUN_ID jt11-5-dev-green.
**Branch:** feat/jt11-5-lava-shore-burn-off (pushed, commit c216d73f)

**Handoff:** To Tyr One-Handed (TEA) for verify (simplify + quality-pass).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3463+478 green, lint clean, citations 1083/1083, no smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer's own edge pass + mutations M1/M2 |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer checked defaults/fallbacks (`?? PRISTINE`, `colour ?? 0`) directly |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 2 (enemy walk-off = Reviewer's M1; back-compat/boundary notes folded to LOW), deferred 2 (backgroundActive multi-bit — unreachable today; burned-branch boundaries) |
| 5 | reviewer-comment-analyzer | Yes | clean | none (every ROM citation verified against quarry) | N/A |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker's Readonly finding covers the domain |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no input/auth/network surface in a pure-sim diff (Reviewer judgment) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — Reviewer noted the one duplication (groundMaskAt burned branch) as LOW |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (Readonly<ArenaState> typing; survivingOps threshold reimplementation) |

**All received:** Yes (4 enabled returned, 5 disabled and covered)
**Total findings:** 6 confirmed, 0 dismissed, 2 deferred (with rationale)

### Rule Compliance

Rule-checker swept all 26 lang-review/typescript checks + 3 project rules over
61 instances; Reviewer spot-verified the load-bearing ones:

- **#1 type escapes** — compliant (no `as any`/`!`/ts-ignore in the diff).
- **#2 readonly params** — VIOLATION (one class, 7 sites): every new
  `arena: ArenaState` parameter is mutable-typed and PRISTINE_ARENA is not
  frozen; no writer exists today (verified by grep and by rule-checker), but
  the diff turns PRISTINE_ARENA into a widely-shared default. → finding F3.
- **#4 null/undefined** — compliant: every default is `??`/default-param
  (fires on undefined only); `colours[op.colour ?? 0]` is the correct `??`
  under a legitimately-zero value.
- **#5 modules** — compliant; the new scheduler↔enemy contract type cycle is
  `import type`-only (erased; tsc + suite green).
- **#8/#18 test apparatus** — VIOLATION: `survivingOps()` reimplements the
  private `isForegroundArena` 0xc0 threshold. → finding F4.
- **#14 both-branch consistency** — compliant: zero bare
  `groundOutcome(groundMaskAt(` sites survive in src/ (grep).
- **#15/#25 source-text guards** — compliant, comment-stripped and anchored to
  call expressions declared in a different file than the one scanned.
- **#17 prose claims** — compliant: bridgeGroundOutcome "no production
  call-site" and the "planks precede entities" claims independently verified.
- **core purity** — compliant (no clock/random/DOM in touched core files).
- **#6/#10/#16** — N/A (no JSX, no input boundary, no aria surface).

### Devil's Advocate

Assume this diff is broken. The most dangerous property of the change is that
its correctness is invisible at wave 1 — every default-arena path is
bit-identical by construction, so 3400 green tests mostly re-prove the part
that didn't change. Where would it rot? First: the demo layer. stepDemo passes
`arena: demo.arena` at exactly one call site, and my mutation M2 proved the
entire suite is blind to its deletion — a refactor of stepDemo (jt11-4 shares
this file and is queued next) can drop the thread and ship the story's
original defect again, green. Second: the enemy walk-off. The CKGND EQ/NE
correction exists twice, and only the player copy is pinned; M1 proved the
enemy copy reverts silently — a "simplify: make the two steppers uniform"
pass could flip the wrong one. Third: the shared PRISTINE_ARENA. It is
mutable-typed, unfrozen, and now threaded through seven call sites; the first
future `arena.bridgeBurned = true` on a default-arena path poisons every
subsequent frame of every caller in that module, and nothing — type, freeze,
or test — would catch it at the boundary. Fourth: the fills carry
`colour ?? 0`; a malformed op paints palette 0 silently instead of failing
loudly, though drawList is the only producer today. Fifth: z-order — the fills
bypass isForegroundArena deliberately; if the island-fore ruling is ever
generalised ("route ALL y≥0xc0 arena ops fore"), the fills' background pin
reddens loudly — that one IS tested. The first three items are real; the
first two are my blocking findings, the third is F3.

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

**Round-2 verification (all independent — Dev's claims re-proven, not trusted):**
- [TEST] F1 CLOSED: mutation M2 (delete `arena: demo.arena` from stepDemo's
  stepFrame call, git-diff-confirmed single-site mutant) now fails exactly the
  new AC-8 pin "with the demo arena burned, the same egg finds no plank —
  through stepDemo itself". Restored; clean tree re-verified.
- [TEST] F2 CLOSED: mutation M1 (revert enemy.ts walk-off to `=== 'airborne'`,
  git-diff-confirmed) now fails exactly the new grounded-shadow pin. The
  fixture is the probed non-flapping discriminator (pristine control stands;
  burned arm lifts with velY 0 — a walk-off signature, not a flap).
- [RULE] F3 CLOSED: all four ArenaState fields `readonly` in both the source
  interface and the TEA contract mirror; all three PRISTINE_ARENA singletons
  `Object.freeze`'d (diff c216d73f..3c4d68a6 verified line by line).
- [RULE] F4 CLOSED: `isForegroundArena` exported with rationale JSDoc;
  `survivingOps()` imports the production predicate — no re-derived 0xc0.
- [TEST] F5 CLOSED (optional, taken): `backgroundActive` any-overlap-clears
  law pinned synthetically with a disjoint-bit control.
- [SIMPLE] F6 (LOW, optional): declined this story — stands as routed.
- Full clean-tree verification after the battery: joust 3467/3467 (176 files),
  `npm run lint` clean, orchestrator 478/0. No new findings introduced by the
  fixes (two LOW style notes, non-blocking: the frozen const sits between
  import statements in demo.ts; isForegroundArena now carries two stacked
  JSDoc blocks).

**Data flow traced:** wave event (applyWaveDestruction) → demo.arena →
stepDemo → stepFrame opts → player/enemy/egg ground checks
(groundOutcomeInState over the conditional mask) → land/walk-off; and
demo.arena → drawList (fills + destroyedCliffs filter) → game.sim →
main.ts blitOp `fill` branch → fillRect (safe: pure data end to end, no
input surface; every default fires on undefined only).
**Pattern observed:** the jt3-2 seam finally consumed at production
(frame.ts:272/289, enemy.ts stepEntity, demo.ts stepEgg, steerWake) — the
same call-site-pinning pattern jt3-3 set with demo-troll.test.ts, now
mutation-proven at both seams this story added.
**Error handling:** groundMaskAt guards non-integer/out-of-range inputs on
both branches (flight.ts:232-240); malformed fill ops degrade to palette 0 —
acceptable, drawList is the only producer (noted LOW round 1).
**Handoff:** To Baldur the Bright (SM) for finish-story. Routed leftovers for
SM to carry: F6 (LOW refactor), Dev's cliffBlocksClimb follow-up, TEA's
troll-grip Question — file per the descoped-findings rule.

## Reviewer Assessment — round 1 (REJECTED, superseded by round 2 above)

**Verdict (round 1):** REJECTED

Round 1. The IMPLEMENTATION is correct — I verified the behaviour, the ROM
citations, the wiring and the z-order myself and through four specialists,
and found no code defect. What blocks is that the story's own acceptance
claim — "destruction is CONSUMED by the production path" — is not guarded at
two seams, proven by mutation, and this epic's precedent (jt3-2's write-only
arena, which became jt3-3's demo-troll call-site pin) treats an unpinned
acceptance-critical call-site as a must-fix, not a route-and-ship.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] F1 [TEST] | stepDemo→stepFrame arena threading unpinned: deleting `arena: demo.arena` from the stepFrame opts leaves all 3463 tests green (mutation M2, verified twice — first run contaminated by a probe file, re-run clean). The production demo could regress to pristine ground physics after wave 3 with the suite green — the story's original defect class, resurrectable invisibly. | `plugins/joust/src/core/demo.ts` (stepFrame call, ~:2054) | Add a demo-level pin: a deterministic entity (egg process is brainless — place one grounded/falling at plank x with a wave-3/burned `demo.arena`) driven through `stepDemo`, asserting the burn is consumed (no settle / walk-off). Must redden under mutation M2. |
| [HIGH] F2 [TEST] | Enemy walk-off comparison unpinned: reverting enemy.ts stepEntity's `kind !== 'platform'` to `=== 'airborne'` leaves all 3463 tests green (mutation M1; independently found by test-analyzer, high confidence). TEA's own deviation predicted "forward impact: none expected" — falsified by mutation. | `plugins/joust/src/core/enemy.ts:1327` | Add a grounded-enemy-over-burned-plank case via `stepEnemyDetailed` with a burned arena, asserting `entity.airborne` flips true. If the first grounded wake flaps (takeOff masks walkOff), stage a non-flapping wake or assert on the walkOff-vs-takeOff velY signature. Must redden under mutation M1. |
| [MEDIUM] F3 [RULE] | New `arena: ArenaState` params (7 sites: steerWake, stepEntity, stepEnemyDetailed ctx, stepPlayerEntity, runBehaviour, stepFrame opts, stepEgg) are mutable-typed and the three module-private PRISTINE_ARENA singletons are unfrozen; a single future write corrupts every default-arena caller silently. No writer exists today (verified). | `plugins/joust/src/core/enemy.ts:1226` et al. | Fix in this round (cheap): mark ArenaState's four fields `readonly` (or use `Readonly<ArenaState>` on the new params) and `Object.freeze` the PRISTINE_ARENA consts. |
| [MEDIUM] F4 [RULE] | `survivingOps()` test helper reimplements demo.ts's private `isForegroundArena` 0xc0 threshold inline; in sync today, desyncs toward green. | `plugins/joust/tests/lava-shore-jt11-5.test.ts` (~:893) | Fix in this round: export `isForegroundArena` from demo.ts and import it in the test (or pin the 0xc0 literal in a source-text assert). |
| [LOW] F5 [TEST] | `backgroundActive` multi-bit sample semantics unpinned — unreachable through real BCK geometry today (verified independently by Reviewer and test-analyzer). | `plugins/joust/src/core/arena-state.ts:197` | Optional: one direct unit case (destroyedBackgroundBits 0x02, bckBit 0x06). Route if not taken. |
| [LOW] F6 [SIMPLE] | groundMaskAt's burned branch re-derives landMaskAtX's indexing minus the OR; a future origin/bounds change must touch both. Divergent TypeError message text between branches. | `plugins/joust/src/core/flight.ts:232` | Optional refactor (shared raw-column helper). No action required this round. |

**Observations (beyond the table):**
- [VERIFIED] The walk-off widening is pristine-safe: enumerated every
  grounded below-check row (y 69/81/129/138/163/211 → LND_Y 1/2/4/8/16/160);
  with the baked OR, y211 always carries $20 → 'platform', and no other row
  can yield $80-alone — `!== 'platform'` ≡ `=== 'airborne'` in every
  pristine-reachable state. Complies with the replay-identity guarantee; the
  3463 untouched passing tests are the corroborating evidence.
- [VERIFIED] steerWake's `backgroundActive(arena, sample)` unit-sample use is
  faithful: enumerated BCK_X×BCK_Y intersections — destroyable bits
  ($01/$02/$04/$40) never co-occur with live bits in any reachable sample
  (independently confirmed by test-analyzer's probe).
- [VERIFIED] Data flow traced end-to-end: wave event (demo.ts:2274
  applyWaveDestruction) → demo.arena → stepDemo → stepFrame opts →
  runBehaviour → player/enemy/egg ground checks → land/walkOff; and
  demo.arena → drawList (fills + filter) → game.sim (game.ts:84) →
  main.ts:302 render loop → blitOp fill branch (main.ts:134, `colours` in
  module scope at :87). Both consumers reach the screen/sim.
- [VERIFIED] Fill geometry against the quarry: dest $00D3/$78D3 and len
  $1B03/$1E03 decode to (0,211,54×3)/(240,211,60×3) under the ×2 X scale;
  colour byte LIB*$11 with LIB EQU $8 (:60) → nibble 8. Matches drawList's
  emitted ops and the test's independent transcription.
- [DOC][VERIFIED] Every new ROM citation checked against JOUSTRV4.SRC by the
  comment-analyzer — all exact; LNDXS3-is-a-label confirmed at :7797-7799,
  which also retires TEA's LNDXS3 Question with evidence.
- [VERIFIED] Census: README 174→176 matches vitest's discovered file count.

**Handoff:** Back to Loki Silvertongue (Dev) for fixes F1-F4 (F1/F2 blocking,
F3/F4 in-round; F5/F6 optional/routed). Re-run mutations M1 and M2 after the
fix — both must redden.
## Dev Assessment (round 2 — review fixes)

**Implementation Complete:** Yes (F1-F5 all addressed; F6 declined as optional)
**Files Changed:**
- `plugins/joust/tests/lava-shore-jt11-5.test.ts` - F1: new AC-8 pins stepDemo
  passing demo.arena into stepFrame via a brainless egg process driven through
  stepDemo itself (control settles on the intact plank; burned demo does not).
  F2: grounded targetless shadow on the burned plank walks off with velY 0 (the
  probed non-flapping fixture; pristine control stands). F5: backgroundActive's
  any-overlap-clears law pinned synthetically ($04|$02 mixed vs disjoint $02).
  F4: survivingOps() now imports the production isForegroundArena.
- `plugins/joust/src/core/demo.ts` - F4: isForegroundArena exported (JSDoc
  states why).
- `plugins/joust/src/core/arena-state.ts` + `tests/helpers/arena-state-contract.ts`
  - F3: all four ArenaState fields readonly (both mirrors).
- `plugins/joust/src/core/frame.ts` / `enemy.ts` / `demo.ts` - F3: the three
  PRISTINE_ARENA singletons are Object.freeze'd.
- F6 (optional LOW): not taken — the duplicated indexing in groundMaskAt's
  burned branch stays as-is this story.

**Mutation evidence (Reviewer's kill condition):** M1 (enemy walk-off reverted
to === 'airborne') now fails exactly 1 test (the F2 pin); M2 (stepDemo arena
threading deleted) now fails exactly 1 test (the F1 AC-8 pin). Both restored;
mutants were run against the COMMITTED fix (3c4d68a6), so the battery is
reproducible.

**Tests:** 3467/3467 (176 files; +4 tests this round), lint clean, citations
1083/1083.
**Branch:** feat/jt11-5-lava-shore-burn-off (pushed, 3c4d68a6)

**Handoff:** Back to Heimdall (Reviewer) for round 2.