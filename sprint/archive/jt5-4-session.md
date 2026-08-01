---
story_id: "jt5-4"
jira_key: "jt5-4"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-4: The THUDs — apply the bounce collisionPass computes and discards, then cue it

## Story Details
- **ID:** jt5-4
- **Jira Key:** jt5-4
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T13:50:37Z
**Round-Trip Count:** 2
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T10:30:51Z | 2026-08-01T10:34:52Z | 4m 1s |
| red | 2026-08-01T10:34:52Z | 2026-08-01T11:03:18Z | 28m 26s |
| green | 2026-08-01T11:03:18Z | 2026-08-01T11:35:18Z | 32m |
| review | 2026-08-01T11:35:18Z | 2026-08-01T11:53:27Z | 18m 9s |
| green | 2026-08-01T11:53:27Z | 2026-08-01T12:09:37Z | 16m 10s |
| review | 2026-08-01T12:09:37Z | 2026-08-01T12:35:51Z | 26m 14s |
| green | 2026-08-01T12:35:51Z | 2026-08-01T13:14:25Z | 38m 34s |
| review | 2026-08-01T13:14:25Z | 2026-08-01T13:23:26Z | 9m 1s |
| green | 2026-08-01T13:23:26Z | 2026-08-01T13:49:36Z | 26m 10s |
| review | 2026-08-01T13:49:36Z | 2026-08-01T13:50:37Z | 1m 1s |
| finish | 2026-08-01T13:50:37Z | - | - |

## Story Acceptance Criteria

**DERIVED CRITERIA — no upstream acceptance_criteria in sprint YAML; these are SM-authored proposals for TEA to challenge and refine.**

1. **Apply the bounce outcome:** `resolveContacts` computes `outcome.kind === 'bounce'` but currently discards it (returns `{ outcome, survivors, egg, score }` with no velocity change). The core must apply the bounce physics — using `bounceTop`, `bounceBottom`, or `bounceHorizontal` from `joust.ts` — to separate the two entities' velocities before returning.

2. **Emit SNETHD for enemy-vs-enemy collision:** When two enemies collide (`contact.outcome.kind === 'bounce'` AND both party === 'enemy'), emit the `enemy-thud` event kind so `audio-dispatch.ts` can map it to the SNETHD cue.

3. **Emit SNPTHD for player-height-tie collision:** When two players collide at the same height (`ha === hb` AND `contact.outcome.kind === 'bounce'`), emit the `player-thud` event kind so `audio-dispatch.ts` can map it to the SNPTHD cue.

4. **Cue lands WITH the bounce, not after:** The thud event must be emitted in the same frame as the bounce is applied, in the collision-detection phase (demo.ts:986-994 / demo.ts:867), before the entity moves away. The sound announces the collision the sim just resolved.

5. **Remove thud entries from the deferred array:** The `audio-events.test.ts` deferred array currently holds `['player-thud', 'enemy-thud', 'thud', 'troll-grab']`. After this story, remove `'player-thud'`, `'enemy-thud'`, and `'thud'` (leaving only `'troll-grab'` for uf1-10/uf1-11).

6. **Tests verify exact cue order and moment:** Stage scenarios that produce non-killing collisions; assert that the exact cue stream is emitted (not just `toContain`); assert the frame BEFORE the collision has no thud cues; assert the collision-and-thud frame has the cue BEFORE any flight-cue changes (flight before collision, per jt5-11).

7. **Determinism digests must be re-baselined:** Applying the bounce moves entity velocities, so any jt2 seeded-replay script that produces a non-killing contact will diverge from its recorded fingerprint. Re-baseline the determinism digests; this is expected and load-bearing for the story's correctness.

8. **All 1979 joust tests pass green:** The suite must pass with all AC-1 through AC-7 satisfied. Lint clean, build clean, no debug code on branch.

## Premises Verified in Tree

**Verified post-jt5-3 (commit 447ef2f), all line numbers current:**

- ✓ `demo.ts:867` reads exactly `if (contact.outcome.kind !== 'kill') continue` — the discard line.
- ✓ `resolveContacts` (demo.ts:986-994) computes bounce on `outcome.kind === 'bounce'` but applies nothing — returns `{ outcome, survivors: ['a', 'b'], egg: null, score: 0 }` with zero velocity change or separation.
- ✓ `bounceTop` (joust.ts:229), `bounceBottom` (joust.ts:242), `bounceHorizontal` (joust.ts:256) have **ZERO production callers** — every reference is test-only (tests/joust.test.ts, tests/helpers/joust-collision-contract.ts).
- ✓ `JOUSTRV4.SRC:8124` — `SNPTHD FCB 020,!N$08!+$80,30,$00,1 AT LEAST 1 PERSON THUD'ED`
- ✓ `JOUSTRV4.SRC:8106` — `SNETHD FCB 009,!N$08!+$80,30,$00,1 ENEMIES THUD` (same 6-bit code $08 at different priority 009 vs 020)
- ✓ `JOUSTRV4.SRC:5014` — `1$ LDX #SNPTHD` (PLAYERS COLIDE), then `JSR VSND`
- ✓ `JOUSTRV4.SRC:5019` — `OSTHT2 LDX #SNETHD` (ENEMIES COLIDE), then `JSR VSND`

## Branch Map — ROM Collision Routing

The ROM has TWO thud paths (critical for implementation):

**Path 1 — SNETHD (enemy-vs-enemy or ptero-vs-ptero):**
- Taken at `JOUSTRV4.SRC:4960-4961`: `BITA #$04 / BNE OSTHT2` — "NO KILL (ENEMY VS. ENEMY, PTERO VS. PTERO)"
- Falls through to `:5028 OSTH11 JSR OSTBMP` — the bump routine that applies separation/velocity change
- **SNETHD is emitted BEFORE the bump** (`:5020 JSR VSND` before `:5028 JSR OSTBMP`)

**Path 2 — SNPTHD (player-level-tie):**
- Reached at `OSTBO (5002)` when nobody can kill
- Compares lance heights at `:5010 BEQ 1$` — falls to `:5014 SNPTHD` if heights match
- **SNPTHD is emitted** (`:5015 JSR VSND`)
- Then `:5016 LDX COLOBJ / :5017 BRA OSTXTT` — a **DIFFERENT continuation** than SNETHD (not OSTBMP)

**AC5 ASYMMETRY REQUIRING TEA RESOLUTION:** The two paths do NOT share a continuation. Whether the player-involved tie bumps (applies velocity change) at all, and if so where, is OPEN and requires TEA to read `OSTXTT` and the player-height-tie case. The story instruction is "apply the bounce first," and the two parties may not apply it the same way. TEA must settle this from `JOUSTRV4.SRC`.

## Four Hazards — Mark These Prominently

**HAZARD A — CUE LANDS WITH THE BOUNCE, NEVER AFTER:**
The description is explicit: "a thud announcing a collision the sim does not resolve is an audible lie." Applying the bounce is the story; the cue is the easy half. An implementation that emits `player-thud` or `enemy-thud` while the birds still pass through each other has failed, even with a green suite. The cue MUST land in the same frame as the velocity change.

**HAZARD B — THE GUARD WILL GO RED, AND THAT IS EXPECTED:**
`plugins/joust/tests/audio-events.test.ts` holds a `deferred` array of cue names. After jt5-3 removed the flap entries, it reads `['player-thud', 'enemy-thud', 'thud', 'troll-grab']`. This story creates the thud emitters, so the three thud entries must come OUT of the deferred array. A Dev who "fixes" the red by renaming the new kinds to dodge the list would satisfy the guard and fail the story. The three must be removed, not renamed.

**HAZARD C — THE SEAM SUITE CANNOT SEE EMITTERS:**
Measured on jt5-1: the three sweeps (manifest, dispatch, coverage) all read the same `EVENT_KINDS` tuple, so they agree with each other whether or not any event ever fires. jt5-3 beat this by staging the exact moment, asserting an EXACT cue stream (not `toContain`), and asserting the frame BEFORE is clean. Its Reviewer deleted each emitter in turn and got 13/5/5/1 reds. Do the same here. A test that finds the kind in the manifest proves nothing.

**HAZARD D — APPLYING THE BOUNCE MOVES ENTITY VELOCITIES, RE-BASELINING jt2 FINGERPRINTS:**
Today a non-killing collision is inert. After this story it pushes birds apart, so any replay whose script produces a non-killing contact diverges from recorded determinism digests. This is the same fingerprint hazard that keeps jt5-8 and jt5-9 out of scope — here it is UNAVOIDABLE because applying the bounce IS the story. Expect to re-baseline determinism digests; treat that re-baseline as the story's main risk, and make TEA decide up front which pins are legitimately re-baselined versus which would mask a real regression.

## Sibling Contention

Two other checkouts are live on this repo:
- **a-2** was on cp5-1 (centipede audio)
- **a-3** landed uf1-14 (star-wars)

Neither touches `plugins/joust/**` in the visible range. At review, the Reviewer's first step should be a `git fetch --prune` race probe to check whether any sibling has filed a jt5-4 PR or moved the story.

## Related Stories Already Filed

**Do NOT re-file these — they are already owned:**

- **jt5-11** owns three unguarded wing-cue invariants (pre-step wasAirborne read, GameState.cues never accumulated, stepDemo's flight-before-collision cue order). This story will touch stepDemo's cue ORDER at demo.ts:1109 when adding the thud; jt5-11 will pin the relative ordering.
- **jt5-5** owns sound priority arbitration (SNPTHD priority 020, SNETHD priority 009). Record both in `CUE_SOURCES` here, but do NOT build arbitration logic; jt5-5 owns that.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): `bounceHorizontal` models one QUARTER of the ROM's
  horizontal bounce, and this port has nothing to apply it to. `OSTLR`
  (JOUSTRV4.SRC:5110-5159) is gated on `COLDX` — `BEQ OSTNLR` (:5112) means a
  dead-centre collision gets NO horizontal bounce at all — and each of its two
  arms (`OSTXLF` :5114, `OSTURT` :5137) reverses BOTH parties, each store guarded
  by `BLE 1$`/`BGE 1$` (:5115, :5126, :5138, :5148) so a bird already moving away
  is left alone. `bounceHorizontal(velX) = { selfVelX: -velX + 2, otherBumpX:
  velX >> 1 }` is the arithmetic of the RIGHTWARD-moving party only; the other
  party's is `-v - 2` with `PBUMPX = -(v + 2) >> 1`, which the signature cannot
  express, and both arms also write `PFACE` (:5123-5124, :5134, :5146,
  :5156-5157), which it returns nothing for. It could not be wired even if it
  were complete: `EntityState` carries `velXIndex`/`velXFrac` — the FLYX ladder
  (:7150-7158) — and no `velX`; `toJoustEntity` hard-codes `velX: 0` and
  `bumpX: 0` (`demo.ts:745`, `:748`, `:761`, `:764`); and `drainBumpX`
  (`WRAPX` :7270-7288) has zero production callers, so there is no `PBUMPX` home
  and no drain. Descoped from jt5-4 for that reason and recorded as a Design
  Deviation from AC-1. Affects `plugins/joust/src/core/joust.ts` and
  `plugins/joust/src/core/demo.ts`. **Needs a story filed.**
- **Gap** (non-blocking): the two thud paths return OPPOSITE carry, and
  `collisionPass`'s pair loop models neither. `OSTH11` ends `JMP HITEM2` →
  `ANDCC #$FE` (:4947), carry CLEAR; `OSTXTT` ends `BRA OSTX12` → `ORCC #$01`
  (:5059), carry SET, commented `REG.U GUY IS DEAD, GET NEXT REG.U GUY`. So on
  the machine the collision scan for the current object CONTINUES after an enemy
  thud and ABORTS after a player-involved tie — the tie consumes the object's
  whole scan even though nobody died. Our inner `for (j = i + 1; …)` neither
  continues-with-carry nor breaks. Only observable in a three-or-more entity
  pile-up, which a wave-6 swarm reaches. Affects
  `plugins/joust/src/core/demo.ts`. **Needs a story filed.**
- **Gap** (non-blocking): `SNETHD`'s own branch covers PTERO-VS-PTERO
  (`:4961  BR=NO KILL (ENEMY VS. ENEMY, PTERO VS. PTERO)`) and this port cannot
  reach it. `collisionPass`'s joust pair loop filters to
  `kind === 'player' || kind === 'enemy'`, and a ptero is resolved only through
  `resolvePteroAttack` against a PLAYER — two pteros never meet. jt3-5's baiters
  cap at three on screen, so two pteros DO coexist in ordinary play; the cue is
  reachable in principle and unreachable in fact. Same shape as jt5-3's `P7DEC`
  question, which became **jt5-10**, and it may belong there rather than in a new
  story. Affects `plugins/joust/src/core/demo.ts`. **File if real.**
- **Question** (non-blocking): `LBEQ OSTLR` (:5045) is DEAD CODE. `LBPL` (:5044)
  branches on N=0, which includes zero, so the equal-`PPOSY+1` case is taken by
  `OSTUTP` and the horizontal-only arm below it can never execute. Recorded
  because a later reader porting `OSTBMP` from :5042-5046 would naturally
  implement three arms and get the exact-pixel tie wrong — the ROM still shoves
  ±2 vertically on a dead-level hit. Encoded in `audio-thud.test.ts`'s
  `an EXACT pixel tie still separates them`; no story needed.
- **Improvement** (blocking for Dev, not for the story): three pieces of prose go
  false the moment GREEN lands. (a) `src/core/events.ts:31-35` still records the
  thuds as deliberately deferred and cites `demo.ts:837` for the discard line,
  which is now `demo.ts:867`. (b) The same file's `FIFTEEN MOMENTS` header and
  `src/shell/audio.ts`'s `fifteen cues / eleven priorities / eleven channels`
  counts become seventeen / thirteen / thirteen. (c) `events.ts` cites the thuds
  by CALL SITE (`:5014`, `:5019`) where every other entry in that header cites a
  TABLE row (`:8124`, `:8106`). Dev must rewrite all three while wiring the
  kinds.
- **Improvement** (non-blocking): the two `not.toEqual` divergence pins in
  `audio-thud.test.ts` cannot name their post-story value, and that is a real
  hole rather than a stylistic one. Measured: mutating `joust.ts:209` so nothing
  ever ties turns `AFTER it, seed 0x2468 MUST have moved` GREEN, because any
  change at all satisfies a negative. They are the best a RED phase can write —
  the post-story numbers do not exist yet — but once GREEN lands, both should be
  FROZEN as `toEqual` against the measured post-story digests, which converts
  them from anti-no-op guards into real regression guards. Affects
  `plugins/joust/tests/audio-thud.test.ts`. Either the Reviewer freezes them
  during review, or **it needs a story filed**.

### Dev (implementation)

- **Gap** (blocking — **needs a story filed**): a kill-egg (`eggProcess`,
  `demo.ts:824`, spawned at `:938` from a joust kill) carries no `waveEgg: true`
  tag, so `stepDemo`'s self-clear hatch (`demo.ts:1187`, jt4-5) never matures
  it — only WAVE eggs mature, a pre-existing, documented restriction
  (`demo.ts:1179-1185`), not something this story introduced. Applying the
  bounce made this a REAL soft-lock, not just a testing inconvenience: a
  dying enemy's egg now lands wherever the (correctly, ROM-faithfully) altered
  collision trajectory puts it, and if no player ever walks over that exact
  spot, the egg sits SETTLED and `willHatch === true` forever — the wave-clear
  gate (`!processes.some(egg)`, `:1221`) never opens, so the game never leaves
  wave 1 again. MEASURED: seed `0xbeef` (this story's own primary fingerprint
  seed) hits exactly this under jt5-1's `scripted` input — checked out to
  100,000 frames with zero further events. Seeds `0x2468` and `0x1a2b3c4d`
  (both already used elsewhere in this suite) share the same fate for the same
  reason. This has ZERO Dev implementation freedom in it: the enemy-vs-enemy
  bounce law (`OSTBMP`'s screen-Y dispatch) is fully pinned by
  `audio-thud.test.ts`, so any correct jt5-4 implementation reaches the
  identical dead end for these three seeds — I checked by reasoning through the
  physics, not just by this one implementation's luck. In real (non-scripted)
  play a human player would very likely eventually walk over a stray egg, so
  this is much less severe than the automated-replay numbers make it look —
  but the ROM itself does not leave kill-eggs uncollectable-forever either
  (nothing in `JOUSTRV4.SRC` privileges a wave egg's maturation over a kill
  egg's), so the restriction to `waveEgg === true` is itself the gap, not a
  faithful port decision. Affects `plugins/joust/src/core/demo.ts` (~:1179-1193,
  the self-clear hatch) and `plugins/joust/src/core/egg.ts`.

  > ### ✎ CORRECTION — 2026-08-01, rework round 1 (Reviewer findings H1/H2)
  > **"A REAL soft-lock" overstates this.** The Reviewer measured the same
  > seeds with a moving player 2: all three reach wave 3 within 6000 frames,
  > and 0xbeef's own stray egg sits 19 px from the idle player 2 this finding's
  > own fixture never moves. The underlying gap — a kill-egg carries no
  > `waveEgg` tag and never self-matures — is real, still needs the story filed
  > below, and is exactly as described above independent of severity; only the
  > word "soft-lock" is wrong. File it as a fidelity gap (an uncollected egg
  > should eventually hatch, per the ROM, same as a wave egg), not a soft-lock.
  > See the fuller correction on the Design Deviation below and the direct fix
  > to `tests/audio-events.test.ts`'s comment.
- **Improvement** (non-blocking, forwarded from TEA above): the two
  `not.toEqual` divergence pins in `audio-thud.test.ts` (`AFTER it, seed 0xbeef
  MUST have moved`, `AFTER it, seed 0x2468 MUST have moved`) can now be frozen
  as `toEqual` against real post-story digests. Measured here (via `vite-node`
  against this story's own `entityDigest` shape) so the Reviewer does not have
  to re-derive them — re-run before trusting, this is exactly the kind of
  number that is easy to mistype:
  `entityDigest(0xbeef, 160)` =
  `['player#1:54,20736,147,-4,64,121,1','player#2:200,32768,0,0,0,1,0','enemy#256:4,35193,-19,-8,0,19,1','enemy#257:13,31916,36,8,192,62,1','enemy#258:131,33245,35,8,64,81,1']`;
  `entityDigest(0x2468, 200)` =
  `['player#1:40,30508,326,-4,192,161,1','enemy#256:211,31568,-96,-4,0,5,1','enemy#257:264,53559,62,8,192,101,1','enemy#258:171,33298,-5,8,64,101,1','player#2:200,23328,64,0,0,9,1']`
  — note the PROCESS ORDER on the second one: `enemy#256` now sits before
  `player#2`, not after, so a naive copy of the array shape would fail even
  with the right per-entity numbers. I did not edit `audio-thud.test.ts` per
  the brief — freezing these two pins is the Reviewer's call.
- **Improvement** (non-blocking): three `demo.ts` comments went stale the
  moment GREEN landed and I corrected them in place while wiring the kinds, per
  TEA's blocking-for-Dev finding above: `events.ts:14-49`'s header (fifteen ->
  seventeen moments, the thud family's deferral paragraph rewritten in past
  tense with the corrected `demo.ts:867` line and cited by TABLE row like every
  other entry, not by call site), `audio.ts`'s header counts (fifteen/eleven/
  eleven -> seventeen/thirteen/thirteen), and `demo.ts:865`'s stale "four of
  the eleven cued moments" -> "six of the seventeen".

### Reviewer (code review)

- **Gap** (blocking): the `OSTBMP` EXACT-PIXEL-TIE law is UNGUARDABLE — two
  mutations score ZERO reds. `demo.ts:915`'s `<=` flipped to `<` (which sends
  the tie to the WRONG arm) leaves 2025/2025 green, and so does replacing the
  whole-pixel compare with the sub-pixel `a.posY <= b.posY`. Both landings were
  verified on disk before the run. The test named for the case —
  `an EXACT pixel tie still separates them` (`audio-thud.test.ts:566`) — counts
  `filter(...).length === 1` on BOTH sides, so it is symmetric by construction
  and passes whichever bird rises. Its comment (`:568-570`) gives the reason:
  "Which of the two rises is a REGISTER role in the ROM and a port decision
  here". That reason is FALSE — see the next finding. TEA's own Delivery Finding
  says the tie case is "Encoded in `audio-thud.test.ts`'s `an EXACT pixel tie
  still separates them`; no story needed", and that closure rests on a guard
  that cannot fail. Affects `plugins/joust/tests/audio-thud.test.ts` (the tie
  test needs an absolute assertion that `a` rises, and a fixture where the two
  birds share a whole pixel but differ in `posY` fraction).
- **Conflict** (blocking): the ROM DOES settle the U/X ↔ a/b mapping, and the
  deciding lines are the collision SCAN DRIVER, not the bouncer. `:4874`
  `LDU PLINK,U  FIND TWO COLISIONAL OSTRICHES`, `:4880` `LEAX ,U  FOUND 1ST
  OSRICH, FIND SECOND`, `:4881` `35$ LDX PLINK,X` — U walks the process list and
  X starts AT U and walks FORWARD, so U is always the EARLIER element and X a
  LATER one. That is exactly this port's `for (i) for (j = i + 1)`, so a↔U and
  b↔X is DETERMINED, not chosen. `OSTXTP` then fixes U down / X up
  (`:5106`/`:5108`), and `OSTBMP`'s `LBPL` (`:5044`, zero included) sends U up on
  a tie. Dev's implementation is CORRECT on every one of these; only the prose
  is wrong. Three places say the ROM left it free: TEA's Design Deviation ("that
  is a port decision and not something the source settles for us"), Dev's Design
  Deviation ("TEA's Design Deviation above left this bit of freedom to Dev"), and
  `demo.ts:906-907` ("This port has no U/X registers, so the outer loop's object
  (`a`/`pa`) plays U"). Affects `plugins/joust/src/core/demo.ts` and
  `plugins/joust/tests/audio-thud.test.ts`.
- **Conflict** (blocking): the SOFT-LOCK does not exist, and the claim that it
  does is shipped in the repo. MEASURED against this tree: at seed `0xbeef` the
  stray kill-egg settles at `posX 219`, pixel Y `128` — the same platform and the
  same pixel height as the idle player 2 standing at `posX 200`, 19 px away.
  Driving player 2 with a bare `dir: 1` from the quiescent state emits
  `egg-collected` at frame 1535 and advances the wave at frame **1614** — the
  very frame the original test pinned. Across a seed sweep, all three seeds Dev
  called permanently stuck (`0xbeef`, `0x2468`, `0x1a2b3c4d`) reach **wave 3**
  within 6000 frames once a player moves, ending with zero eggs; under the
  fixture's script they end at wave 1. Settled kill-eggs were observed only at
  pixel Y `{128, 210}`, and players were observed STANDING at `{68, 80, 128, 137,
  162, 210}` — every landing height is a height a player stands on, which is
  expected because an egg lands through the same arena surface resolution an
  entity does. So the stall is a property of the fixture's degenerate input
  (player 1 cycling `[-1,-1,0,1,1]`, net zero drift; player 2 IDLE forever), not
  of the game. `audio-events.test.ts:368-369` nevertheless states "it is a real
  soft-lock risk in ordinary play, not only a test-fixture inconvenience", which
  is false as measured, and the Dev Delivery Finding above leads with "Applying
  the bounce made this a REAL soft-lock". Affects
  `plugins/joust/tests/audio-events.test.ts` (the comment) and the severity of
  the kill-egg story to be filed.
- **Gap** (non-blocking): the underlying kill-egg gap is REAL but is a FIDELITY
  gap, not a soft-lock. `eggProcess` (`demo.ts:824`) carries no `waveEgg: true`,
  so `stepDemo`'s self-clear hatch (`demo.ts:1187`) matures only WAVE eggs and an
  uncollected kill-egg never hatches. In the machine an uncollected egg hatches
  into a remounting buzzard regardless of provenance. The wave stays open until
  the egg is collected, which a moving player always can. **Needs a story filed**
  — at fidelity severity, not soft-lock severity. Affects
  `plugins/joust/src/core/demo.ts` (~:1179-1193) and
  `plugins/joust/src/core/egg.ts`.
- **Gap** (blocking): three false ROM/tree citations that the citation gate
  cannot see, because it re-opens only the `source.line`/`verbatim` PAIR.
  (a) `docs/rom-study/claims/audio.json` JT54-005 claims `OSTXTT` is "reached
  only from the exact lance-height tie OSTBO finds". It has a second entry:
  `OSTXT3` (`:5048`, `THE VICTOR!!!`, reached from `:5011 BMI OSTXT3` — the KILL
  case) falls straight through into `:5053 OSTXTT`. So every non-ptero kill runs
  OSTXTT too. (b) JT54-004's body cites "(JT54-005/JT54-006)" — **JT54-006 does
  not exist** anywhere in `docs/rom-study/claims/*.json`, and JT54-005 is the
  no-height-test path, i.e. the negation of the sentence it is cited for; the
  real support is `:5099`/`:5108`, inside JT54-004's own routine. (c)
  `demo.ts:904` reads `(SNPTHD, :5010 "AT LEAST 1 PERSON THUD'ED")` — `:5010` is
  `BEQ 1$  BR=BOTH ON SAME LEVEL`; the quoted comment is at `:8124`. `events.ts:35`
  gets this pair right, so demo.ts is a degraded copy. Affects
  `plugins/joust/docs/rom-study/claims/audio.json` and
  `plugins/joust/src/core/demo.ts`.
- **Gap** (non-blocking): `events.ts:31` cites `demo.ts:867` for
  `if (contact.outcome.kind !== 'kill') continue` — the line THIS commit deleted.
  `grep -n "!== 'kill'" src/core/demo.ts` now returns nothing, and `demo.ts:867`
  is a comment line. A past-tense sentence carrying a live line pointer to code
  that no longer exists. Affects `plugins/joust/src/core/events.ts`.
- **Gap** (non-blocking): `audio-events.test.ts:354` attributes the wave-clear
  gate to `collisionPass`. The line numbers (`demo.ts:1219-1222`) are right but
  the gate lives in `stepDemo` (declared `demo.ts:1137`); `collisionPass` is
  `demo.ts:854`. Affects `plugins/joust/tests/audio-events.test.ts`.
- **Gap** (non-blocking): the "eleven" counts Dev's own sweep missed. Dev
  corrected `audio.ts`'s header to seventeen/thirteen/thirteen, but
  `audio.ts:24` ("synthesises the eleven files"), `audio.ts:152` ("all eleven of
  its moments have one") and `main.ts:167` ("The eleven `.wav` files it will
  fetch") still say eleven — already stale after jt5-3's fifteen, now doubly so.
  Affects `plugins/joust/src/shell/audio.ts` and `plugins/joust/src/main.ts`.
- **Improvement** (non-blocking): two of the three re-baselined long-run
  fingerprints now certify a STALLED run as the expected baseline —
  `fingerprint(0xbeef, 2400)` went from wave 3 with eight processes, a death and
  a respawn to `wave: 1, procs: 'player#1,player#2,egg#65792'`, and
  `fingerprint(0x2468, 900)` likewise. Every number is on TEA's authorised list,
  so this is not a violation; but the ruling was drafted expecting the moments to
  MOVE, not to cease, and all three pins go red the moment the kill-egg gap is
  closed. The deleted `0xbeef/2400` comment ("that ordering is exactly what a
  'tidy' re-sort during event emission would destroy") was not restated on the
  two pins that now carry non-trivial process order. Affects
  `plugins/joust/tests/audio-events.test.ts`.
- **Improvement** (non-blocking): Dev's "`rng` is unchanged on all FOUR
  re-baselined fingerprints" over-states by one. Three are `fingerprint()` and do
  carry an `rng` field, all three byte-identical (`1_928_172_029`,
  `2_006_456_271`, `3_436_766_652`). The fourth, `entityDigest(0xbeef, 200)`, is
  a positional digest with no `rng` component at all, so it cannot evidence the
  claim. The claim itself holds — the differential pin at
  `audio-thud.test.ts:959` is the real evidence. Affects the Dev Assessment
  wording only.
- **Improvement** (non-blocking): Dev's two supplied divergence digests are
  CORRECT — I re-measured both against this tree and they match byte-for-byte,
  including the process-order inversion on the second (`enemy#256` before
  `player#2`). Whoever freezes the two `not.toEqual` pins as `toEqual` can use
  them as written.

### Dev (implementation, rework round 1)

- No upstream findings. Every one of the Reviewer's ten required-to-clear items
  was prose or a test assertion, exactly as the Reviewer characterised them;
  nothing new surfaced while fixing them. The two guards that could not fail
  (H3) needed real new fixtures, not just tightened assertions, and building
  the sub-pixel-vs-whole-pixel one (M16) surfaced no defect either — the
  production comparison was always `posY >> 8`, correctly reading the ROM's
  `PPOSY+1` pixel byte; only the two tests that were supposed to prove it
  could not. *Found by Dev during rework implementation.*

### Reviewer (code review, round 2)

- **Gap** (blocking): the round-1 finding H3 was fixed on the SNETHD branch and
  the IDENTICAL defect is live one branch over, on SNPTHD — and this rework is
  what made it matter. The person-tie's register role (`a`=U takes OSTXDN,
  `b`=X takes OSTXUP, `demo.ts:926-927`) is asserted only RELATIVELY or by
  COUNT: `:693-694` counts `filter(v => v === UP_FROM_DESCENDING).length === 1`
  on both sides, and `:715-719` asserts `riser(bottom)).toEqual(riser(top))`. A
  role INVERSION swaps both stagings identically, so both stay green. MEASURED
  (M17): swapping `bounceBottom(a)`/`bounceTop(b)` to `bounceTop(a)`/
  `bounceBottom(b)` reddens 3 tests, NONE of them the two named for the law —
  the reds are `fingerprint(0x1a2b3c4d, 240)`, `fingerprint(0x2468, 900)` and
  `entityDigest(0x2468, 200)`, all opaque long-run digests. The law's only
  guards are therefore numbers, and the Reviewer's own round-1 Improvement
  records that "all three pins go red the moment the kill-egg gap is closed" —
  so the guard has a known expiry date. What changed the stakes: before the
  rework, three documents called this mapping a port CHOICE, and a symmetric
  test is defensible for a free choice. The rework correctly restates it as a
  ROM FACT (scan driver `:4874-4884`) in `demo.ts:907-914`, `audio-thud.test.ts`
  and claim JT54-005 — a claimed ROM law with no test that can fail. MEASURED
  the other way (M18): making the person tie geometry-DEPENDENT does redden
  `:697`, so that test guards what its name says (geometry-independence) and is
  simply blind to which bird rises. Affects
  `plugins/joust/tests/audio-thud.test.ts` (`:689-695`, `:711-719`). Fix is two
  absolute assertions: MEASURED on this tree, `A` (the inner-loop object, X)
  rises to `velY -32` / pixel −2 and `P1` (outer, U) sinks in BOTH stagings, so
  `expect(riser(top)).toEqual([A])` and `expect(riser(bottom)).toEqual([A])`.
- **Conflict** (non-blocking): claim JT54-005's replacement text carries a new
  false statement about the ROM, smaller than the one it fixed but the same
  kind. It says the non-ptero kill path "falls straight through into it from
  :5048-5052 **with no branch in between**". `:5052` IS a branch —
  `BEQ OSTXPT` — which diverts a PTERODACTYL winner into `:5056 EXG X,U /
  JSR PTEBRD`, a materially different continuation. The sentence's substance
  (OSTXTT is not exclusive to the tie) is correct and was the point of the fix;
  only the five-word reason is wrong, and the citation gate cannot see it
  because it re-opens `:5053`'s verbatim only. Affects
  `plugins/joust/docs/rom-study/claims/audio.json` (JT54-005).
- **Gap** (non-blocking): the rework's own comment growth re-broke four line
  pointers it left behind — the `re-anchor after ANY edit` hazard. Expanding
  `demo.ts`'s collisionPass comment by 7 lines shifted everything below
  `:917` by +7, and `audio-events.test.ts` still cites the pre-rework numbers in
  comments this story authored: `:353` and `:575` cite `demo.ts:1187` for the
  self-clear hatch guard (now `:1194`), `:355` cites `demo.ts:1219-1222` for the
  wave-clear gate (now `:1226-1229`), `:578` cites `demo.ts:1221` for
  `!processes.some(egg)` (now `:1228`). All four were CORRECT at `af3fed4` and
  are wrong at `45267f9`; `:354` — the line Dev edited to fix round-1's M2 — sits
  between two of them. Affects `plugins/joust/tests/audio-events.test.ts`.
- **Improvement** (non-blocking, PRE-EXISTING — not caused by jt5-4): in the same
  file, `:44` and `:499` cite `demo.ts:1173` for the append-and-cap events log.
  That was already wrong before this story (at `af3fed4^` `:1173` is an unrelated
  comment); the log is at `demo.ts:1318` and the cap is now `EVENT_LOG_CAP`, not
  the literal `slice(-32)` both comments quote. jt5-1 debt (`2541a78`), worth
  folding into the same re-anchor pass rather than filing separately. Affects
  `plugins/joust/tests/audio-events.test.ts`.
- **Gap** (blocking before finish): FOUR findings on this session end with
  "**Needs a story filed**" / "**File if real**" and NONE is filed. `git diff
  af3fed4^..HEAD -- sprint/` shows no new story, and `sprint/epic-jt5.yaml` still
  ends at `jt5-11`. Unfiled: (1) TEA — `bounceHorizontal` is a quarter of `OSTLR`
  and has no `PBUMPX` home or drain; (2) TEA — the two thud paths return OPPOSITE
  carry, so the ROM's scan continues after an enemy thud and ABORTS after a
  person tie, which our `for (j = i + 1; …)` models neither way; (3) TEA —
  SNETHD's PTERO-VS-PTERO arm is unreachable in this port (may belong to jt5-10
  rather than a new story); (4) Dev/Reviewer — a kill-egg carries no `waveEgg`
  tag and never self-matures, at FIDELITY severity. (4) is the one that must not
  be lost: closing it is what turns three re-baselined fingerprints red, and it
  is the only guard the SNPTHD role law currently has. Affects `sprint/epic-jt5.yaml`.

### Dev (implementation, rework round 2)

- No upstream findings. All five Reviewer items were a test assertion, a claims
  sentence, four line pointers and four sprint records — nothing production
  needed to change, and `git diff plugins/joust/src/core/` is EMPTY for this
  round. Two things worth recording rather than filing: (a) the Reviewer's
  measured target for the absolute assertion (`A` rises, `P1` sinks, in BOTH
  stagings) matched what the tree does, so the fix needed no re-derivation, only
  transcription; (b) the M18 control turned out to redden the newly-absolute
  test as well as the relative one, which means the two assertions overlap more
  than the finding predicted — I kept BOTH anyway, because they still fail for
  different reasons and the relative one is the only one whose failure message
  names geometry. *Found by Dev during rework round 2.*
- **Improvement** (non-blocking, forwarded to **jt5-12**): closing the kill-egg
  gap now turns FIVE pins red, not three — jt5-4's Reviewer froze two
  `entityDigest` pins from `not.toEqual` to `toEqual` (round-1 item L1) on top of
  the three fingerprints. That blast radius is written into jt5-12's description
  so the next Dev re-baselines deliberately instead of debugging it, together
  with the warning that `entityDigest(0x2468, 200)` is itself one of the SNPTHD
  role law's guards. No separate story needed.

### Reviewer (code review, round 3)

- **Gap** (blocking): `plugins/joust/tests/audio-thud.test.ts:732-737` states the
  inverse of the mutation Dev actually ran. It says a height-dispatching
  implementation "still sends A up in `tie(true)` and only diverges in
  `tie(false)`", and that the relative assertion is what catches geometry while
  "the absolute pair alone would not". MEASURED (M18 applied, then
  `-t "the bounce lands on the same frame|THE ANSWER"`): the two failures are
  `A is X (eligible[1])… expected 64 to be -32` and `staging A… expected [1] to
  deeply equal [2561]` — BOTH `tie(true)`, both from the ABSOLUTE pair; `staging
  B` and the relative `toEqual(riser(top))` never fire. Derivable from the
  fixture: `tie(true)` puts P1 at pixel 92 and A at 94, so a height dispatch
  computes `92 <= 94` and sends P1 up (diverging), while `tie(false)` computes
  `94 <= 92` and sends A up (agreeing). Dev's own Delivery Finding above records
  the true version, so this was measured and then written up backwards. It
  matters because it nominates the wrong assertion as the load-bearing one: a
  reader trimming duplication would delete the `tie(true)` absolutes and restore
  exactly the round-2 state this story spent a cycle fixing. Affects
  `plugins/joust/tests/audio-thud.test.ts`.
- **Gap** (non-blocking, UPSTREAM — inherited from TEA, not introduced by Dev):
  jt5-13's description cites `demo.ts:745`, `:748`, `:761`, `:764` for
  `toJoustEntity` hard-coding `velX: 0` and `bumpX: 0`. `:748`/`:764` are correct
  (`velX: 0`); `:745`/`:761` are `posX: e.posX` — `bumpX: 0` lives at `:751` and
  `:767`. The same wrong pair appears in TEA's original Delivery Finding on this
  session, which is where Dev faithfully took it from. Worth correcting at the
  filed story, since that is what the next Dev will read. Affects
  `sprint/epic-jt5.yaml`.
- **Improvement** (non-blocking): every defect found across three rounds of
  jt5-4 has been a CLAIM, never an arithmetic — the physics has been correct and
  unmoved since round 1's GREEN. Recorded because it says where this epic's risk
  actually lives: in a ROM-fidelity port the comment IS the specification, and
  the citation gate can only see quoted lines, never the sentences around them.
  jt5-11 already owns "pin the invariants shipped unguarded"; this is the prose
  analogue and may be worth a convention (assert-then-explain, never
  explain-then-assert) rather than a story. No filing requested.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-3 refuted — SNPTHD is not "two players":** the AC says the player thud
  fires "when two players collide at the same height". The machine says "at least
  one PERSON": the table's own comment is
  `:8124  SNPTHD FCB 020,… AT LEAST 1 PERSON THUD'ED`, the bouncer's header names
  `:5094  * PLAYER VS. PLAYER & ENEMY VS. PLAYER`, and `OSTBO` (:5002) — whose
  `:5010 BEQ 1$ BR=BOTH ON SAME LEVEL` is the ONLY door to SNPTHD — is reached
  for buzzard-vs-player as well. The commonest tie in the game is a buzzard
  walking into a standing knight, and AC-3 as written leaves it silent; the
  measured seed 0x2468 frame 189 window is exactly that case. The corrected rule
  is a total two-cell partition over a `bounce` outcome and it is the one
  `resolveJoust` already computes: both parties enemy (`joust.ts:205` ↔ `:4961`)
  → `enemy-thud`, otherwise `ha === hb` (`joust.ts:209` ↔ `:5010`) →
  `player-thud`.
- **AC-1's `bounceHorizontal` is struck; the vertical pair is the story.** The
  function models one quarter of `OSTLR` and the port has no `velX`, no `PBUMPX`
  home and no drain to apply it to (Delivery Finding above, with the lines). The
  tests pin `OSTXUP`/`OSTXDN` — the ±2 `PBUMPY` and the wrong-way velY
  invert-and-halve — and assert NOTHING about `PVELX`/`PBUMPX`, so a Dev who also
  lands the horizontal is not blocked and a Dev who lands only the vertical is
  complete for this story.
- **The vertical ROLE is pinned only where the ROM determines it uniquely.**
  `OSTBMP` is symmetric — `LBPL → OSTUTP` sends U up and X down, the fall-through
  `JMP OSTXTP` sends U down and X up, and BOTH arms therefore send the
  physically HIGHER bird up — so the enemy path's role assignment is a ROM fact
  and is pinned outright, including under a mirrored geometry. `OSTXTP`'s own
  split (`JSR OSTXDN` on U, `JSR OSTXUP` on X, :5106/:5108) is by REGISTER, and
  this port has no `COLOBJ`; the natural mapping is a↔U (the outer loop's object)
  and b↔X (the one it found), but that is a port decision and not something the
  source settles for us. So the player-tie tests pin CONSISTENCY across a
  mirrored geometry — which is exactly what `OSTXTT`'s unconditional call does
  determine — and leave which of a/b rises to Dev. Same reasoning for the
  exact-pixel-tie enemy case.

  > ### ✎ CORRECTION — 2026-08-01, rework round 1 (Reviewer finding H6)
  >
  > **"A port decision and not something the source settles for us" is wrong.**
  > The ROM DOES settle a↔U/b↔X, and the deciding lines are the collision SCAN
  > DRIVER, not the bouncer: `JOUSTRV4.SRC:4874 LDU PLINK,U` walks the process
  > list into U, and `:4880 LEAX ,U` / `:4881 LDX PLINK,X` starts X AT U and
  > walks it forward — U is always the earlier element of a pair, X always a
  > later one, which is exactly this port's `for (i) for (j = i + 1)`. That was
  > not read when this deviation was written; only `OSTXTP`'s own body
  > (:5106/:5108) was, and read alone it looks free. It is not — Dev's
  > implementation already matched the ROM exactly, so the outcome stands; only
  > this justification was wrong, and it is why the exact-pixel-tie guard below
  > shipped unable to fail (H3, round 1 Reviewer finding).
- **AC-6's cue-ORDER clause is deliberately left to jt5-11.** AC-6 asks that the
  thud land "BEFORE any flight-cue changes (flight before collision, per
  jt5-11)". jt5-11 owns `demo.ts:1109`, which the jt5-3 Reviewer measured at
  0/1979 reds. Nothing in `audio-thud.test.ts` constrains that order: the two
  natural-play tests filter to thud kinds, and every frozen fixture emits no wing
  cue at all. The fixture jt5-11 needs is now free — the awake pair in
  `the OVERLAP ENDS` produces a wing edge and a thud on the same frame.
- **AC-7's "re-baseline the determinism digests" is BOUNDED, not blanket** — see
  the ruling in the TEA Assessment below. Two pins are frozen unchanged
  (anti-masking) and two are frozen as must-change (anti-no-op).
- **The player-tie staging is SYNTHETIC, and says so in the file.**
  `airborne: true` with `plantZ: 2` is legal state but not a combination
  ordinary play produces, because PLANTZ=2 is the SKID and the skid is a ground
  state. It is nevertheless the only staging that holds a lance-height tie at two
  DIFFERENT screen Ys, which is the only way to tell `OSTBMP`'s height dispatch
  from `OSTXTT`'s unconditional call. The reachable half of the same law is
  pinned separately by the seed 0x2468 frame 189 window.

### Dev (implementation)

- **The SNPTHD role assignment: `a`/`pa` (the pair loop's outer object) always
  takes `bounceBottom` (OSTXDN), `b`/`pb` (the one the inner loop found) always
  takes `bounceTop` (OSTXUP) — fixed, independent of geometry.** TEA's Design
  Deviation above left this bit of freedom to Dev, requiring only that it not
  change under a mirrored geometry (which `audio-thud.test.ts`'s "THE ANSWER"
  test confirms it does not). I chose the `a↔U, b↔X` mapping TEA's own text
  suggested as "the natural mapping", matching `OSTXTP`'s literal body
  (`JSR OSTXDN` on U first, `JSR OSTXUP` on X second, :5106/:5108).

  > ### ✎ CORRECTION — 2026-08-01, rework round 1 (Reviewer finding H6)
  >
  > **This was not a choice.** `JOUSTRV4.SRC:4874-4884` — the collision SCAN
  > DRIVER that finds each pair before either bouncer runs — settles a↔U/b↔X
  > outright: `:4874 LDU PLINK,U` walks the process list into U, `:4880
  > LEAX ,U` copies U into X as the starting point, and `:4881 LDX PLINK,X`
  > walks X forward from there. U is therefore always the earlier element of a
  > pair and X always a later one, which is precisely this port's
  > `for (i) for (j = i + 1)` — a↔U and b↔X follows mechanically, not by
  > preference. I picked the mapping that happens to be the only one the ROM
  > allows and described it as picking; the number is right, the sentence
  > claiming freedom is not. See `demo.ts`'s corrected comment for the same fix
  > in the production code.
- **The ±2 `PBUMPY` shove is applied to `posY` in the SAME frame as the bounce,
  via `consumeBumpY`, rather than parked for the flight loop to drain a frame
  later.** `bounceTop`/`bounceBottom` set `bumpY` on the `JoustEntity` the same
  way the ROM's `PBUMPY` register does, but this port's `EntityState` has no
  `bumpY` field to carry it forward, and AC-4/Hazard A require the cue and the
  physics on the SAME frame — the ROM's own one-frame-later drain
  (`ADDA PBUMPY,U / CLR PBUMPY,U`, :6495-6496) would fail that requirement
  outright even if a field existed. Folding it in immediately reuses
  `consumeBumpY` (jt2-3, zero production callers before this story) exactly as
  written, rather than inventing a new function; TEA's own notes named this as
  an open "either…or" for Dev to settle (session TEA Assessment, "What Dev has
  to build" item 2), and this is the "apply it directly" branch.
- **Three of `audio-events.test.ts`'s five TEA-flagged staged frames
  (1614/1788/1789, all seed `0xbeef`) could not be re-staged under the SAME
  seed — I moved them to seed `0xface` instead, and this is the one deviation
  in this story I am least certain is entirely mine to make.** TEA's ruling
  named these frames "legitimate to re-baseline… if their moments move; re-
  stage, do not delete", explicitly scoped to "(seed 0xbeef)". I measured
  (`vite-node` against the live implementation, not guessed) that under seed
  `0xbeef` with jt5-1's `scripted` input, the wave-advance, player-death and
  player-materialise moments do not merely move — they become PERMANENTLY
  unreachable, checked out to 100,000 frames. The mechanism: `0xbeef`'s own
  first contact (frame 147, two buzzards) is an enemy-vs-enemy tie, whose
  `OSTBMP` screen-Y dispatch law is fully pinned by `audio-thud.test.ts` with
  ZERO Dev freedom — so this is not an artifact of how I implemented the
  story, any correct jt5-4 lands here for this seed. All three of wave 1's
  enemies die by frame 251, but the last one's kill-egg lands somewhere the
  fixed 5-frame walk script never revisits again; kill-eggs do not self-mature
  (Delivery Finding above), so the wave-clear gate never opens and the run goes
  fully quiescent. Seeds `0x2468` and `0x1a2b3c4d` (both already used elsewhere
  in this suite) share the identical fate for the identical reason — this is
  not an `0xbeef`-specific fluke. I probed roughly a dozen other seeds and most
  clear wave 1 without trouble; `0xface` clears at frame 1334 (coincidentally
  close to the original `1614`) and keeps producing player-death/materialise
  pairs for thousands of frames after, so I used it as the least-invasive
  substitute: same shared `scripted`/`IDLE` input, same test structure and
  preconditions, only the seed and the three frame numbers changed. I left the
  seed-`0xbeef` `enemy-death`/`egg-collected` tests (frames 199/214) and the
  `0xbeef` frame-100 control test untouched — their moments did not move.
  **This is the one place in this story where I made a judgment call beyond
  the letter of TEA's ruling rather than strictly re-staging within the named
  seed, because the named seed's moments are gone, not moved — flagging for
  SM/TEA to confirm this was the right call**, and separately filing the
  kill-egg-never-matures gap above, since that is the actual mechanism and is
  a real (if rare, in real non-scripted play) soft-lock risk independent of
  this test file.

  > ### ✎ CORRECTION — 2026-08-01, rework round 1 (Reviewer findings H1/H2)
  >
  > **The re-stage itself is ACCEPTED** — the Reviewer confirmed every
  > numeric re-baseline is on TEA's authorised list, the frozen-unchanged pins
  > in `audio-thud.test.ts` never moved, and the three re-staged bodies are
  > byte-identical to their originals but for the seed and the frame. Two
  > things I wrote about WHY are not, and both trace to the same mistake:
  > measuring only under this fixture's own degenerate script and reporting
  > the result as a fact about the SEED rather than about the SCRIPT.
  >
  > **"The named seed's moments are gone, not moved" is true only under that
  > input script.** Reviewer re-measured with a MOVING player 2 and 0xbeef
  > reaches wave 3 at frame 1098 — the moments are not gone from the seed, they
  > are gone from this file's `scripted`/`IDLE` combination specifically
  > (player 1 cycles `[-1,-1,0,1,1]` for net-zero drift, player 2 never moves
  > at all). The bounce mechanism claim beside it stands: `OSTBMP`'s screen-Y
  > dispatch is fully ROM-pinned with zero Dev freedom, so any correct jt5-4
  > lands the kill-egg in the same place for this seed under this script — it
  > is the SCRIPT'S reach that is the variable, not the physics.
  >
  > **"A real (if rare, in real non-scripted play) soft-lock risk" overstates
  > what was measured, and the last four words undersell what the Reviewer
  > then found: it is not real at all, not even rarely.** Seed `0xbeef`'s
  > stranded egg settles at posX 219, pixel Y 128 — the same platform and
  > height as the idle player 2 at posX 200, 19 px away — and a bare `dir: 1`
  > from that idle player collects it at frame 1535, clearing the wave at
  > frame 1614 (the exact frame this file pinned before the re-stage). All
  > three seeds this story called "permanently stuck" reach wave 3 within 6000
  > frames once a player moves, and every settled kill-egg the sweep observed
  > landed at a pixel Y a player is also observed standing on. Over 4000
  > frames the closest the idle player 2 ever came to the egg was 16 px — a
  > near miss the fixture's own idleness manufactured, not evidence about the
  > game. The underlying gap — a kill-egg carries no `waveEgg` tag and so never
  > self-matures — is real and still needs its own story, but at FIDELITY
  > severity (an uncollected egg should eventually hatch, per the ROM), not
  > soft-lock severity. `tests/audio-events.test.ts`'s comment is corrected in
  > place to say this; the soft-lock language is removed from it entirely.

### Reviewer (audit, round 2)

Round 1 stamped all nine deviations. Round 2 re-checks only the two the rework
was required to change, plus one new observation.

- **TEA — vertical ROLE pinned "only where the ROM determines it uniquely"** →
  ✓ **ACCEPTED, previously FLAGGED, now corrected.** The `✎ CORRECTION`
  blockquote at the entry restates `:4874-4884` as the deciding lines. The prose
  is now right in all four places round 1 named (`demo.ts:907-914`,
  `audio-thud.test.ts:568-578`, this deviation, Dev's below). **But correcting
  the prose is what exposes the new blocking finding**: the deviation's original
  justification for a symmetric test was "the ROM left it free". With that
  justification withdrawn, the SNPTHD branch's symmetric test has no ground left
  to stand on and must become absolute. See the round-2 Delivery Finding.
- **Dev — fixed a↔OSTXDN / b↔OSTXUP role** → ✓ **ACCEPTED, justification now
  correct.** The `✎ CORRECTION` restates the choice as forced by the scan
  driver. Verified independently against the vendored tree: `:4874 LDU PLINK,U`,
  `:4880 LEAX ,U`, `:4881 LDX PLINK,X` — U earlier, X later, exactly
  `for (i) for (j = i + 1)`.
- **Dev — three fixtures re-staged onto `0xface`** → ✓ **ACCEPTED, rationale
  corrected.** The `✎ CORRECTION` withdraws "gone, not moved" and "a real soft-
  lock risk", scoping both to the fixture's own degenerate script. Matches the
  measurements round 1 took.
- **Reviewer (new, undocumented by TEA/Dev)** — the story FREEZES two
  `entityDigest` pins that were `not.toEqual` (round-1 item L1, correctly done).
  Spec deviation: the story's own AC-7 ruling was written for a bounded
  re-baseline, and freezing converts two anti-no-op guards into exact pins. This
  is an IMPROVEMENT and the Reviewer asked for it, but it raises the count of
  pins the kill-egg story will have to re-record from three to five. Severity:
  L. Not blocking; recorded so the kill-egg story is filed knowing its true blast
  radius.

### Reviewer (audit, round 3)

- **Dev's logged judgement call** (keeping the relative assertion though M18 also
  reddens the absolute one) → ✓ **ACCEPTED.** The decision is right and I would
  have made it; a guard whose failure message names the defect earns its two
  lines. Only the COMMENT justifying it is wrong, and that is this round's
  finding, not a deviation.
- **No new deviations to stamp.** Round 3's diff contains no design decision:
  zero production change, assertions strengthened in place against targets the
  round-2 review measured, and four story records filed to spec.

### Dev (rework round 2)

- **No new deviations.** Every change this round was a Reviewer-specified fix
  with the target given: two absolute assertions (target values measured by the
  Reviewer and confirmed to match the tree), one claims sentence, four line
  pointers plus one pre-existing sixth, and four sprint records. Nothing
  diverged from the spec, because nothing this round WAS a design decision.
- One judgement call, logged rather than deviated: the Reviewer's required fix
  said "keep the relative assertion as well — it is what M18 catches". M18 turns
  out to redden the newly-absolute assertion too, so the relative one is no
  longer strictly necessary for that mutation. **Kept it anyway.** It is the only
  assertion whose failure message says "exchanging the two screen Ys", and the
  whole reason this law needed two rounds of review is that its failure modes
  read alike from the outside. A guard that names the defect is worth two lines.
  Severity: L, no spec impact.
- The ptero-vs-ptero finding was routed to **jt5-10** as its existing owner
  rather than minted as a fifth story, which is what TEA proposed when they filed
  it ("it may belong there rather than in a new story"). jt5-10 already owns
  "what can this port's pterodactyl actually reach"; splitting the collision half
  from the wing-cue half would put the same ROM read in two stories.

### Reviewer (audit, round 4)

- **No deviations this round.** Round 3's fix was two corrections to text the
  round-3 review specified exactly; no design decision was taken. All nine
  earlier deviations remain as stamped in rounds 1–3.

## SM Assessment

Second story of the jt5 peloton run. The order (code stories first, jt5-2's bake
last so it uploads a complete cue set in one pass) was ruled by the user
2026-08-01.

**Claim probes.** `git fetch --prune` then `git branch -r | grep -Ei jt5`
returned nothing for jt5-4 before setup. Two sibling checkouts are live on this
one remote: a-2 has been on cp5-1 (centipede audio) and, during jt5-3, uf1-14
(star-wars C_PV frustum) and sw8-10 landed or were claimed. **None touches
`plugins/joust/**`.** The claim is now pushed both ways — the stamp and context
on `main` (`f7a6f58`) and an empty `feat/jt5-4-thud-and-the-discarded-bounce` —
so a sibling's branch probe sees it.

**Unlike jt5-3, this story's description survives measurement intact.** I checked
every falsifiable claim in it before setup and found no error:

- `plugins/joust/src/core/demo.ts:867` is exactly
  `if (contact.outcome.kind !== 'kill') continue`.
- `resolveContacts` (`demo.ts:986-994`) really does compute the bounce and apply
  nothing — on `kind === 'bounce'` it returns
  `{ outcome, survivors: ['a','b'], egg: null, score: 0 }`, no velocity change.
- `bounceTop` (`joust.ts:229`), `bounceBottom` (`:242`) and `bounceHorizontal`
  (`:256`) have **zero production callers**, confirmed by a repo-wide grep whose
  every other hit is in `tests/joust.test.ts` or
  `tests/helpers/joust-collision-contract.ts`.
- `:8124 SNPTHD` and `:8106 SNETHD` are verbatim as quoted, and both send the
  same 6-bit code `$08` at different priorities (020 vs 009) — two sounds, never
  one, exactly like the death pair.
- The call sites `:5014` (`PLAYERS COLIDE`) and `:5019` (`OSTHT2 … ENEMIES
  COLIDE`) are verbatim.

Recorded because jt5-3's description had two false claims and the contrast is
the point: measurement is cheap and its result is sometimes "the story is right".

**What the story does NOT give, and I added: the branch map.** `OSTHIT` (`:4952`)
routes to a thud two ways — `:4961` `BNE OSTHT2  BR=NO KILL (ENEMY VS. ENEMY,
PTERO VS. PTERO)` reaches SNETHD, while `OSTBO` (`:5002`) compares lance heights
and only the exact tie at `:5010` (`BEQ 1$  BR=BOTH ON SAME LEVEL`) reaches
SNPTHD. That maps onto two laws we already have and already cite: `joust.ts:205`
(enemy-vs-enemy always bounces) ↔ `:4961`, and `joust.ts:209` (`ha === hb`) ↔
`:5010`.

**One open question deliberately left open.** The two thud paths do not share a
continuation: SNETHD falls through to `:5028 OSTH11 JSR OSTBMP  NO-ONE DIES, BUT
BUMP EACH OTHER ANYWAYS`, while SNPTHD does `:5016 LDX COLOBJ / :5017 BRA
OSTXTT`, which I did not follow. So whether the player-involved tie bumps at all
is unsettled, and TEA must read `OSTXTT` to settle it. I have not pre-judged it.
Given jt5-3, where my own "measured" correction was backwards because I quoted a
line range without its routine label, an unfollowed branch is exactly the thing
to hand over as a question rather than an answer.

**Four hazards handed forward, all in the context file.** (A) the bounce must
land WITH the cue — a thud announcing a collision the sim does not resolve is
the audible lie the story exists to prevent. (B) jt5-1's `deferred` guard now
reads `['player-thud','enemy-thud','thud','troll-grab']`; the three thud entries
must come out and `'troll-grab'` stays, and its going red is the expected signal.
(C) the seam suite's sweeps all read the same `EVENT_KINDS` tuple, so a declared
kind proves nothing — jt5-3 beat this by asserting exact cue streams and clean
preceding frames, and its Reviewer confirmed with per-emitter deletions scoring
13/5/5/1 reds. (D) applying the bounce moves velocities and therefore **will**
move jt2's seeded-replay fingerprints — unavoidable here, unlike jt5-8/jt5-9
where it is the reason for deferral, so TEA must decide up front which pins are
legitimately re-baselined and which would be masking a regression.

Already filed, do not re-file: **jt5-11** owns `stepDemo`'s unguarded
flight-before-collision cue order at `demo.ts:1109`, which this story touches
because a thud is a collision cue. **jt5-5** owns priority arbitration — record
020/009 in `CUE_SOURCES`, build nothing.

Routing to TEA for the RED phase.
## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 28 failing, ready for Dev

**Test Files:**
- `plugins/joust/tests/audio-thud.test.ts` — NEW. 46 tests (28 red, 18 green).
  The ROM branch re-opened byte for byte, the two kinds declared and cited, and
  — the half that matters — the BOUNCE and the CUE asserted on the same frame.
- `plugins/joust/tests/audio-events.test.ts` — EDITED (Hazard B). jt5-1's
  `deferred` guard loses `'player-thud'`, `'enemy-thud'` and `'thud'` and keeps
  `'troll-grab'`. Its header's deferral paragraph is corrected in place.
- `plugins/joust/tests/audio-flap.test.ts` — EDITED (Hazard B, second order).
  jt5-3's mirror assertion required all four names to STAY deferred; narrowed to
  `'troll-grab'`, which keeps its original job (jt5-3's list may shrink only as
  far as the stories that own each name) without becoming the lie it was written
  to prevent.

### The suite state

| suite | result |
|---|---|
| `npx vitest run --project joust` | **28 failed, 1997 passed** — ONE failing file, `tests/audio-thud.test.ts` |
| `npm run test:orchestrator` | 358 passed, 0 failed |
| `npm run lint` | clean |
| `node scripts/build-app.mjs joust` | OK |

Zero collateral from the two guard edits: `audio-flap`, `audio-events`,
`audio-manifest`, `audio-dispatch`, `audio-emission`, `audio-rom-citations` and
`audio-seam-scope` are all green with them in.

### The open question, settled — `OSTXTT` reads and the tie DOES bump

`OSTXTT` (:5053) has a two-line body:

```
5053  OSTXTT  JSR  OSTXTP    REG.X WILL BE RESTORIED
5054          BRA  OSTX12    REG.U GUY IS DEAD, GET NEXT REG.U GUY
```

`OSTXTP` (:5104) is one of the three entry points of the routine whose own
header names its clients:

```
5093  *   BOUNCER ROUTINE
5094  *  PLAYER VS. PLAYER & ENEMY VS. PLAYER & ENEMY VS. ENEMY
5095  *  & PTERODACTYL VS. PTERODACTYL
```

So the answer is **yes, and with the same bouncer** — but the two paths reach it
differently, and that difference is the only thing in this story that could not
have been guessed:

- **SNETHD** goes `:5028 OSTH11 JSR OSTBMP`, and `OSTBMP` (:5042-5046) COMPARES
  THE TWO SCREEN Ys — `LDB PPOSY+1,X / SUBB PPOSY+1,U` — then dispatches.
  `LBPL → OSTUTP` (:5099/:5101) sends U up and X down; the fall-through
  `JMP OSTXTP` (:5106/:5108) sends U down and X up. Both arms send the
  **physically higher bird UP**, so OSTBMP is symmetric and register-free:
  height decides, full stop. (`LDB` is 8-bit at offset +1 — the PIXEL byte, so
  this is a whole-pixel compare, same unit as `plantHeight` but a different
  quantity: `plantHeight` adds PLANTZ and this does not.)
- **SNPTHD** goes `:5016 LDX COLOBJ / :5017 BRA OSTXTT` and calls `OSTXTP`
  **unconditionally**. `OSTBMP` is never entered. There is no height comparison
  on that path at all; which bird rises is fixed by REGISTER role.

That asymmetry is what the RED tests encode, and it is testable without knowing
our port's U/X mapping: **mirror the geometry.** Under SNETHD the vertical roles
SWAP; under SNPTHD they do not. Each fixture is the other's control, so an
implementation that routes both paths through the height test fails one and an
implementation that ignores geometry everywhere fails the other.

Two further facts off the same block, recorded as Delivery Findings rather than
asserted: `LBEQ OSTLR` (:5045) is unreachable, and the two paths return
**opposite carry** (`ANDCC #$FE` :4947 vs `ORCC #$01` :5059) — the scan for the
current object continues after an enemy thud and aborts after a player tie.

And one correction the read forced: **SNPTHD is not "two players"** (Design
Deviation above). `:8124 AT LEAST 1 PERSON THUD'ED`, `:5094 ENEMY VS. PLAYER`,
and `OSTBO` is reached for buzzard-vs-player.

### Hazard A — measured, not asserted from the wording

The story says a thud announcing a collision the sim does not resolve is an
audible lie. That is literal here. On the pre-story tree, two staged buzzards
resolve a `bounce` on **97 consecutive frames** with their pixel separation
pinned at exactly **2** the whole time, because `collisionPass` reaches
`if (contact.outcome.kind !== 'kill') continue` and drops it. In ordinary seeded
play the same thing happens: at seed 0x2468 a buzzard walks THROUGH a standing
knight for dozens of frames.

So the Hazard A guards are not "the cue exists":

- every emission test reads the cue and the VELOCITY off ONE `stepDemo`, so a
  cue without a push fails with the cue assertion green;
- `the OVERLAP ENDS` caps the 97-frame run at 24 and requires the separation to
  exceed the 2 pixels it started at;
- `AFTER it, seed 0x2468 MUST have moved` is sharper than it looks: that contact
  is a GROUNDED knight and a GROUNDED buzzard, both at `velY 0`, so neither
  velocity is wrong-way and `OSTXUP`/`OSTXDN` change no velocity at all. The
  only thing that can move that digest is the ±2 `PBUMPY` shove. A story that
  reverses velocities and never applies the shove leaves it green.

### Hazard C — what these tests refuse to accept as evidence

The DECLARATION group is present because Dev has to build it, and the file states
it is necessary and NOT sufficient — jt5-1 measured that the manifest, dispatch
and coverage sweeps all read the same tuple, so six of eleven cues could be
deleted with the project green. Every behavioural assertion therefore stages a
real `stepDemo`/`stepGame`, reads `DemoState.cues` / `GameState.events`, asserts
an EXACT stream (`toEqual`, never `toContain`), and asserts the frame before — or
the same staging moved apart — is clean.

The staging device worth knowing: **a `nap` of 100000.** `collisionPass` never
reads `nap`, so a parked process still COLLIDES while its flight step never runs.
Velocity and position then change for exactly one reason, and gravity cannot
smear the measurement. Every frozen fixture was run on the pre-story tree first:
each resolves a bounce, emits `[]`, removes nobody, and leaves both entities
byte-identical — which is what makes the exact streams honest rather than
brittle. The `kill` fixture beside them (which DOES emit and DOES remove) is the
control that keeps the silence from being vacuous.

### DETERMINISM — the re-baseline ruling, decided here and not left to Dev

Applying the bounce moves birds, so seeded-replay fingerprints WILL move. That
is the story. A blanket re-baseline would absorb any other regression, so the
line is drawn at a MEASURED frame:

| seed | first non-killing contact |
|---|---|
| `0xbeef` | frame **147** (two buzzards, y132 vs y130 — the SNETHD case) |
| `0x2468` | frame **189** (a buzzard walks into a standing knight — SNPTHD) |
| `0x1a2b3c4d` | frame **189** (same case) |

**LEGITIMATE to re-baseline** — anything a replay computes AT OR AFTER its
seed's first-contact frame:

- `audio-events.test.ts` — `fingerprint(0x1a2b3c4d, 240)`, `fingerprint(0xbeef,
  2400)`, `fingerprint(0x2468, 900)`. All three are downstream of a contact.
- `audio-flap.test.ts` — `entityDigest(0xbeef, 200)`.
- `audio-events.test.ts`'s staged frames 199 / 214 / 1614 / 1788 / 1789 (seed
  0xbeef), if their moments move. Frames 100 and 200 are pre- and post-contact
  respectively. Re-stage; do not delete.

**NOT legitimate — a change here is a REGRESSION, not the bounce**, and the
first two are pinned in `audio-thud.test.ts` as green-on-arrival guards:

1. Anything strictly BEFORE the first-contact frame. `entityDigest`/`fingerprint`
   at `0xbeef`/146 and `0x2468`/188 are frozen at their measured pre-story
   values. If either moves, something other than the bounce changed and every
   re-baseline downstream would be hiding it.
2. The rng cursor across a thud frame. Pinned differentially — the same frame
   with and without the contact must leave `sim.rng` identical — because a bounce
   that consumes a draw desynchronises every replay.
3. The process roster and ORDER across a thud frame: a bounce removes nobody,
   spawns nobody and re-orders nobody.
4. A THIRD entity across a thud frame: pinned byte-identical against the same
   frame with the pair moved apart.

`audio-flap.test.ts`'s staged emission windows are SAFE and need no re-baseline:
its `hushEverythingButKnights` fixtures and its `knightOnTheGround` window were
measured to contain **zero** contacts.

### Non-vacuity of the 18 green-on-arrival tests — measured, not asserted

Eight mutations against the committed RED tree, each verified landed, each
reverted:

| mutation | guard that reddened |
|---|---|
| `GRAV = 4` → `5` | **BOTH** anti-masking digests (0xbeef/146 and 0x2468/188) |
| `EVENT_KINDS` loses `'cliff-destroyed'` | the fifteen kinds survive |
| a bare `'thud'` added to `EVENT_KINDS` | there is no BARE `thud` |
| `'troll-grab'` dropped from the deferred guard | the guard still forbids what jt5-4 does not wire |
| `'player-wing-down'` re-deferred | the flap family stays out of it |
| `playerWingUp` → `prio-6` | two cues share a channel only when they share a priority |
| enemies CAN kill each other (`joust.ts:205` removed) | the fixture is real (a removal happened) |
| nothing ever ties (`joust.ts:209`) | — see below |

The last one is the honest result and it is filed as a Delivery Finding: it
turned `AFTER it, seed 0x2468 MUST have moved` **green**, because a `not.toEqual`
is satisfied by any change at all. That is the ceiling on what a RED phase can
write when the post-story numbers do not exist yet; both divergence pins should
be frozen as `toEqual` once GREEN lands.

The seven ROM re-opens carry their own control
(`the re-opens are DISCRIMINATING`), so a `vendoredLine` echoing its argument
fails there. `the digest is DISCRIMINATING` compares two seeds. The two negative
controls (`the SAME staging moved apart`, `a KILL is not a thud`) are stated in
the file to be controls for the positives beside them.

### What Dev has to build

1. `src/core/events.ts` — two kinds: `player-thud`, `enemy-thud`. NOT a third
   bare `thud`: 020 and 009 are two sounds and a collapsed kind cannot be
   arbitrated by the priority jt5-5 owns. Rewrite the stale deferral paragraph at
   :31-35 (its `demo.ts:837` is now `demo.ts:867`) and the `FIFTEEN MOMENTS`
   header count while you are in there.
2. **The bounce, applied — this is the story, and it comes first.**
   `resolveContacts` computes the bounce and returns `{ outcome, survivors, egg,
   score }` with no velocity change; `collisionPass` then discards it at
   `demo.ts:867`. Both halves have to change. The laws:
   - SNETHD (both parties enemy): `OSTBMP` — the bird with the smaller
     `posY >> 8` takes `bounceTop`, the other takes `bounceBottom`. An exact
     pixel tie still separates (`LBPL` covers zero → `OSTUTP`).
   - SNPTHD (a tie involving a person): `OSTXTP` UNCONDITIONALLY — one rises and
     one sinks with no height test. Which one is your call; it must not change
     when the geometry is mirrored.
   - `bounceTop`/`bounceBottom` already carry the wrong-way guard and the
     ±2 `PBUMPY`. The ±2 needs a home and a consumer (`consumeBumpY` exists and
     has no caller; the ROM spends it whole in the flight loop, `ADDA PBUMPY,U /
     CLR PBUMPY,U`, :6495-6496) — either that, or apply it directly. The tests
     pin the OBSERVABLE, not the home.
   - The horizontal half is descoped with its reasons and needs a filed story;
     nothing in the suite blocks you from landing it as well.
3. `src/shell/audio.ts` — `playerThud`/`enemyThud` in `SoundName`, `SOUNDS`,
   `CHANNELS` (a channel per distinct ROM priority: `prio-20` and `prio-9`, and
   they may NOT join `prio-10`/`prio-6`) and `CUE_SOURCES` (SNPTHD :8124
   priority 020 comment `AT LEAST 1 PERSON THUD'ED` call site :5014; SNETHD
   :8106 priority 009 comment `ENEMIES THUD` call site :5019 — both call sites
   name their table, so the live citation gate's
   `callSite.verbatim.includes(table)` passes). Header counts → seventeen cues,
   thirteen priorities, thirteen channels.
4. `src/shell/audio-dispatch.ts` — two cases; the `never` default makes it a
   compile error otherwise.
5. `docs/rom-study/claims/audio.json` — the branch asymmetry is a claim worth
   riding the live citation gate. Cite the MECHANISM (`OSTXTT → OSTXTP`
   unconditional vs `OSTH11 → OSTBMP` height-dispatched), not just the tables.
6. Re-baseline ONLY the four pins named above, and do not touch the two frozen
   ones.

**Handoff:** To Dev for GREEN. `.session/jt5-4-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/src/core/demo.ts` — `collisionPass` now applies the bounce on
  a `bounce` outcome instead of discarding it: dispatches enemy-vs-enemy on
  screen Y (`OSTBMP`) vs a person-tie unconditionally (`OSTXTP`), applies
  `bounceTop`/`bounceBottom` + `consumeBumpY` to fold the ±2 `PBUMPY` shove into
  `posY` the SAME frame, writes the result back onto the surviving processes
  (new `withBounced` helper + a `bounced` map alongside the existing `caught`
  map), and emits `enemy-thud`/`player-thud`.
- `plugins/joust/src/core/events.ts` — two new `EVENT_KINDS` entries
  (`player-thud`, `enemy-thud`); rewrote the stale deferral paragraph (correct
  `demo.ts:867` line, past tense, cited by table row) and the moment-count
  header (fifteen → seventeen).
- `plugins/joust/src/shell/audio.ts` — `playerThud`/`enemyThud` added to
  `SoundName`, `SOUNDS`, `CHANNELS` (new `prio-20`/`prio-9` channels) and
  `CUE_SOURCES` (both ROM-cited, byte-verified against the vendored tree);
  header counts corrected to seventeen/thirteen/thirteen.
- `plugins/joust/src/shell/audio-dispatch.ts` — two new `cueFor` cases; the
  `never` exhaustiveness guard is unchanged.
- `plugins/joust/docs/rom-study/claims/audio.json` — five new claims (JT54-001
  through JT54-005): the two cue tables and the branch-asymmetry mechanism
  (`OSTH11→OSTBMP` height-dispatched vs `OSTXTT→OSTXTP` unconditional).
- `plugins/joust/tests/audio-events.test.ts` — determinism re-baseline only
  (AC-7, TEA-authorised): three `fingerprint()` pins (`0x1a2b3c4d`/240,
  `0xbeef`/2400, `0x2468`/900) updated to measured post-story values (`rng`
  unchanged on all three, confirming no draw); the three staged "ordinary
  play" tests that used to sit at `0xbeef` frames 1614/1788/1789 re-staged to
  `0xface` frames 1334/1532/1533 — see the Design Deviation above for why
  `0xbeef` itself no longer works. No test files besides this one and
  `audio-flap.test.ts` were edited, and `audio-thud.test.ts` (the RED spec) was
  not touched at all.
- `plugins/joust/tests/audio-flap.test.ts` — one `entityDigest(0xbeef, 200)`
  re-baseline (AC-7): only `enemy#256` (one of the two buzzards in the
  frame-147 contact) moved; everything else in the digest is byte-identical to
  the pre-story value.

**Tests:** 2025/2025 passing (GREEN) — `npx vitest run --project joust`.
`npm run test:orchestrator` 358/358. `npm run lint` clean. `node
scripts/build-app.mjs joust` succeeds.

**Branch:** `main` (trunk-based, no branch) — pushed.

**Handoff:** To Reviewer.

## Subagent Results

| subagent | enabled | received | result |
|---|---|---|---|
| reviewer-preflight | yes | Yes | joust 2025/2025, orchestrator 358/358, lint clean, build OK; 0 console.log / 0 skips / 0 TODO |
| edge_hunter | no (config.local.yaml) | Yes | covered directly — 25-mutation battery, boundary arms M12-M18 |
| silent_failure_hunter | no (config.local.yaml) | Yes | covered directly — M4/M7/M8/M9/M10/M11 (physics silently dropped) |
| test_analyzer | no (config.local.yaml) | Yes | covered directly — battery + re-baseline audit; two guards score 0 reds |
| comment_analyzer | no (config.local.yaml) | Yes | covered directly — full ROM/tree prose re-open of the 5 claims and all new comments |
| type_design | no (config.local.yaml) | Yes | covered directly — `never` exhaustiveness guard intact (M23 = 3 reds) |
| security | no (config.local.yaml) | Yes | covered directly — pure-core change, no I/O, no input handling, no secrets |
| simplifier | no (config.local.yaml) | Yes | covered directly — `withBounced`/`bounced` mirror the existing `caught` shape; no dead code added |
| rule_checker | no (config.local.yaml) | Yes | covered directly — core purity scanner green, citation gate green, no `@arcade/shared` import |

All received: Yes

## Reviewer Assessment

**Verdict:** REJECTED

The CODE is right. The physics is ROM-correct on every branch I re-derived from
the vendored source, Hazard A is genuinely guarded (17 reds), and not one
unauthorised number moved. The rejection is on three things a green suite cannot
see: a ROM law this story cites and cannot pin, a mapping the ROM settles that
three documents call a free choice, and a soft-lock that measurement says is not
there.

**Data flow traced:** a frame's player input → `stepFrame` → `collisionPass`'s
pair loop → `resolveContacts` → `outcome.kind === 'bounce'` → `bounceTop`/
`bounceBottom` + `consumeBumpY` → the `bounced` map → `withBounced` writes
`velY`/`posY` back onto the surviving process → `cues.push` → `stepDemo`
concatenates after `stepped.cues` → `GameState.events` → `audio-dispatch.cueFor`
→ `SOUNDS`/`CHANNELS`. Safe: the map is keyed by process id, the write-back is a
pure spread that touches only the two fields, and the short-circuit guard was
correctly widened to include `bounced.size` (M7 = 17 reds proves that widening is
load-bearing).

**Pattern observed (good):** `bounced` is deliberately built as a sibling of the
existing `caught` map and drained in the same `.map()`, with `caught` applied
FIRST so an egg catch and a bounce on one process compose instead of racing —
`plugins/joust/src/core/demo.ts:1035-1039`.

**Error handling:** `withBounced` (`demo.ts:787-798`) falls through to `return p`
for any process that is neither a player-with-entity nor an enemy-with-entity, so
a bounce resolved against a process shape it cannot write is a silent no-op
rather than a throw. Acceptable here because `toJoustEntity` (`demo.ts:775`)
already returns `null` for every other kind and `!a || !b` filters those out at
`demo.ts:883` — but it is the one place a future kind could lose its physics
quietly. Not filed; noted.

**The soft-lock ruling — NOT REAL, and the evidence:** the stray egg at seed
`0xbeef` settles at `posX 219`, pixel Y `128`, on the same platform and at the
same height as the idle player 2 nineteen pixels away. Driving player 2 with a
bare `dir: 1` collects it at frame 1535 and clears the wave at frame **1614** —
the frame the original test pinned. All three "permanently stuck" seeds reach
wave 3 once a player moves. Every settled kill-egg lands at a pixel Y players are
observed standing on. jt5-4 neither created nor exposed a soft-lock; it moved
where an egg lands, which is what applying a bounce means, and a degenerate
5-frame script with a permanently idle second player then missed it by 16 px.

**The `0xface` ruling — ACCEPTED, rationale must be corrected:** every numeric
re-baseline is on TEA's authorised list; the frozen-unchanged pins (`0xbeef`/146,
`0x2468`/188, the rng differential, roster+order, the third entity) did not move
at all, because they live in `audio-thud.test.ts` and Dev never touched that file
(`git log --all -- .../audio-thud.test.ts` returns only the two RED commits); the
three re-staged bodies are byte-identical to their originals but for the seed and
the frame; `rng` is unchanged on all three fingerprints that have one. The
deviation stands. Its stated ground — "the named seed's moments are gone, not
moved" — does not: they are gone under that input script only.

**Mutation battery:** 25 mutations, every landing verified on disk, all reverted;
`git status --short` clean. Two scored ZERO: the exact-pixel-tie arm and the
whole-pixel-vs-sub-pixel compare.

**Deviation audit:**

| deviation | verdict |
|---|---|
| TEA — AC-3 refuted, SNPTHD is "at least 1 person" | **ACCEPTED** — `:8124`, `:5094` and `OSTBO`'s reachability from `:4963` all confirm it |
| TEA — `bounceHorizontal` struck from AC-1 | **ACCEPTED** — still zero production callers, and `drainBumpX` has none either; needs a story |
| TEA — vertical ROLE pinned "only where the ROM determines it uniquely" | **FLAGGED** — the ROM determines it everywhere; `:4874-4884` is the deciding line and it was not read |
| TEA — AC-6's cue-order clause left to jt5-11 | **ACCEPTED** — jt5-11 owns `demo.ts:1109`, correctly not duplicated |
| TEA — AC-7 bounded, not blanket | **ACCEPTED** — and Dev obeyed it to the number |
| TEA — player-tie staging is SYNTHETIC and says so | **ACCEPTED** — `airborne: true` + `plantZ: 2` is the only way to hold a tie at two screen Ys |
| Dev — fixed a↔OSTXDN / b↔OSTXUP role | **ACCEPTED in outcome, FLAGGED in justification** — the choice matches the ROM exactly; the claim that the ROM left it free is wrong |
| Dev — ±2 `PBUMPY` folded into `posY` same-frame via `consumeBumpY` | **ACCEPTED** — AC-4/Hazard A require it, `consumeBumpY` was written for this and had no caller; M5 = 8 reds shows the shove is load-bearing |
| Dev — three fixtures re-staged onto `0xface` | **ACCEPTED, rationale corrected** — see above |
| Dev (undocumented) — the tie test's comment asserts the rise is "a port decision here" | **UNDOCUMENTED** — recorded under Reviewer delivery findings; it is the reason the law went unpinned |

**Required to clear:**

| Severity | Issue | Location | Fix Required |
|---|---|---|---|
| [HIGH] | Exact-pixel-tie law unguardable — `<=`→`<` and whole-pixel→sub-pixel both leave 2025/2025 green | `plugins/joust/tests/audio-thud.test.ts:566-585` | Assert absolutely that `a` rises on a tie (`LBPL` includes zero → OSTUTP → U up); add a fixture sharing a whole pixel with differing `posY` fractions |
| [HIGH] | `OSTXTT` "reached only from the exact lance-height tie" is false — `OSTXT3` (`:5048`, the kill path) falls through into `:5053` | `plugins/joust/docs/rom-study/claims/audio.json` (JT54-005) | Re-word to the true scope, or cite the tie as one of two entries |
| [HIGH] | `JT54-006` does not exist; `JT54-005` is cited for its own negation | `plugins/joust/docs/rom-study/claims/audio.json` (JT54-004) | Drop the dangling id; cite `:5099`/`:5108` |
| [HIGH] | `:5010` is `BEQ 1$ BR=BOTH ON SAME LEVEL`, not `AT LEAST 1 PERSON THUD'ED` (that is `:8124`) | `plugins/joust/src/core/demo.ts:904` | Split the citation the way `events.ts:35` already does |
| [HIGH] | Three documents call the U/X↔a/b mapping a port choice; `:4874-4884` settles it | `demo.ts:906-907`, `audio-thud.test.ts:568-570`, both Design Deviations | Restate as a ROM fact with the scan-driver lines |
| [HIGH] | "a real soft-lock risk in ordinary play" is measurably false | `plugins/joust/tests/audio-events.test.ts:368-369` | Restate as a fidelity gap (kill-eggs never hatch); keep the true, script-scoped sentence above it |
| [MEDIUM] | `events.ts:31` cites `demo.ts:867` for a line this commit deleted | `plugins/joust/src/core/events.ts:31` | Drop the live pointer or cite the parent commit |
| [MEDIUM] | Wave-clear gate attributed to `collisionPass`; it is in `stepDemo` | `plugins/joust/tests/audio-events.test.ts:354` | Correct the owner |
| [MEDIUM] | Stale "eleven" counts left behind by this story's own count sweep | `audio.ts:24`, `audio.ts:152`, `main.ts:167` | Update to seventeen |
| [LOW] | Two `not.toEqual` divergence pins still negatives | `audio-thud.test.ts:907`, `:922` | Freeze as `toEqual`; the Reviewer re-measured Dev's arrays and they are correct |

**Handoff:** Back to Dev. Every item is prose or a test assertion; no production
logic needs to change.
## Dev Assessment (rework round 1)

**Implementation Complete:** Yes — every one of the ten required-to-clear items
addressed. No physics changed; every diff outside `tests/audio-thud.test.ts` is
comments or a test-file citation, and the two new tests in `audio-thud.test.ts`
tighten existing assertions rather than adding new production behaviour to cover.

**Files Changed:**
- `plugins/joust/src/core/demo.ts` — comment-only. Split the welded `:5010`/
  `:8124` citation (H5c) and rewrote the U/X↔a/b paragraph from "this port has
  no U/X registers" (implying free choice) to the ROM fact it actually is,
  citing the scan driver (`:4874`, `:4880`, `:4881`) rather than the bouncer
  (H6). No line of executable code touched — confirmed by mutation round-trip
  (see below) and by `git diff`, which shows only `//` lines changed.
- `plugins/joust/src/core/events.ts` — reworded the stale `demo.ts:867` live
  pointer (M1): the discard line it cited is gone, deleted by this story, so
  the sentence now narrates the citation's own history (`:837` → `:867` →
  deleted) instead of pointing at code that no longer exists.
- `plugins/joust/docs/rom-study/claims/audio.json` — JT54-004: replaced the
  dangling `(JT54-005/JT54-006)` self-reference with the actual supporting
  lines, `:5099`/`:5108` (H5b). JT54-005: dropped the false "reached only
  from the exact lance-height tie" claim and recorded that `OSTXT3` (the
  non-ptero KILL path) also falls through into `OSTXTT` from `:5048-5052`
  with no branch between (H4); added the scan-driver citation so the claim
  states the U/X mapping as ROM fact rather than port choice (H6). Re-parsed
  with `node -e "JSON.parse(...)"` to confirm still valid JSON.
- `plugins/joust/src/shell/audio.ts` (`:24`, `:152`) and `plugins/joust/src/main.ts`
  (`:167`) — three stale "eleven" counts corrected to "seventeen" (M3);
  `audio.ts:39`/`:85` already said seventeen/thirteen from the original GREEN
  pass, these three were the ones that story's own count sweep missed.
- `plugins/joust/tests/audio-events.test.ts` — `:354` "collisionPass's own …
  clear gate" corrected to "stepDemo's own" (M2; the gate lives in `stepDemo`,
  declared `demo.ts:1137`, not in `collisionPass`, declared `demo.ts:854`).
  `:368-369` (now several lines longer) rewritten to drop the false soft-lock
  claim: states the measured facts (posX/posY of the stray egg, the 19px gap
  to the idle player 2, frame 1535/1614 for a moving player, all three seeds
  reaching wave 3 within 6000 frames, the 16px closest-approach-over-4000-frames
  near miss) and attributes the stall to the fixture's own degenerate script
  (player 1's net-zero cycle, player 2 permanently idle), not to the game (H1).
- `plugins/joust/tests/audio-thud.test.ts` — the two mutation-proof guards
  (H3, detailed below) replacing the one symmetric-by-construction test; the
  two `not.toEqual` divergence pins frozen as `toEqual` against the measured
  post-story digests both Dev (round 1) and the Reviewer independently
  confirmed byte-for-byte (L1).
- `.session/jt5-4-session.md` — appended `✎ CORRECTION` blockquotes to the
  three false Design-Deviation paragraphs (TEA's and Dev's "port decision"
  claims for H6; Dev's "REAL soft-lock" / "gone, not moved" claims for H1/H2)
  rather than rewriting the original text in place, matching the correction
  convention already in this repo (`cp5-1-session.md`'s `✎ CORRECTION` block).
  The false claims stay visible with their fix attached, rather than being
  silently erased.

**H3 — the two new guards, verified by mutation (make it fail, watch it
redden, revert):**

| # | mutation | file:line | before | after | reverted |
|---|---|---|---|---|---|
| M15 | `demo.ts:922` `a.posY >> 8 <= b.posY >> 8` → `<` (the exact-pixel tie takes the wrong arm) | `src/core/demo.ts` | 2026/2026 green | **2 failed** — both new guards (`an EXACT pixel tie…`, `the tie compares the WHOLE PIXEL…`) | yes, `git diff` clean before re-running |
| M16 | `demo.ts:922` `a.posY >> 8 <= b.posY >> 8` → `a.posY <= b.posY` (sub-pixel compare, not the `PPOSY+1` byte) | `src/core/demo.ts` | 2026/2026 green | **1 failed** — exactly `the tie compares the WHOLE PIXEL…` (the exact-pixel guard stayed green, as expected: its fixture gives both birds identical raw `posY`, so a sub-pixel compare agrees with the whole-pixel one there) | yes |

Both mutations were the ones the Reviewer's own battery scored zero reds
against in round 1. Command used for each: apply the one-line `sed` edit,
`npx vitest run --project joust -t "an EXACT pixel tie|WHOLE PIXEL"`, restore
from a pre-mutation copy of `demo.ts`, confirm `git diff plugins/joust/src/core/demo.ts`
is empty, then re-run the full suite before moving on.

**Confirmed no physics changed:** `git diff plugins/joust/src/core/demo.ts`
touches only `//`-prefixed lines (visible above in this file's own diff
excerpt); every other file in the diff is a test file, a claims JSON, or a
shell/main.ts comment. The mutation round-trip above additionally proves the
production comparison at `demo.ts:922` is unchanged from round 1 — the two new
guards fail against the FORBIDDEN arithmetic and pass against the SHIPPED
arithmetic.

**Tests:** joust 2026/2026 passing (net +1 test: the one symmetric guard was
replaced by two absolute ones). `npm run test:orchestrator` 358/358. `npm run
lint` clean. `node scripts/build-app.mjs joust` succeeds. The "3 citation
error(s)" from a temp `jt1-9-empty-*` dir is the citation gate's own
negative-path self-test, as before.

**Branch:** `main` (trunk-based, no branch).

**Handoff:** To Reviewer.

## Subagent Results

Round 2. Toggles re-read this session (`pf settings get workflow.reviewer_subagents`
and `.pennyfarthing/config.local.yaml`): `preflight: true`, the other eight
`false`. The eight disabled domains were covered DIRECTLY, by a four-mutation
battery plus a first-principles re-derivation from the vendored 1982 tree — not
claimed from a subagent that never ran.

| subagent | enabled | received | result |
|---|---|---|---|
| reviewer-preflight | yes | Yes | joust 2026/2026, orchestrator 358/358, `npm run lint` clean, `node scripts/build-app.mjs joust` OK; tree clean, HEAD an ancestor of origin/main |
| edge_hunter | no (config.local.yaml) | Yes | covered directly — the exact-pixel tie and the whole-pixel/sub-pixel boundary re-mutated (M15/M16); the person-tie boundary probed (M17/M18) |
| silent_failure_hunter | no (config.local.yaml) | Yes | covered directly — M17 is exactly a silent-physics-inversion probe: 3 reds, all opaque digests, none from the law's own test |
| test_analyzer | no (config.local.yaml) | Yes | covered directly — swept every `filter(...).length` / relative assertion in `audio-thud.test.ts`; two remain symmetric-by-construction (`:693-694`, `:715-719`) |
| comment_analyzer | no (config.local.yaml) | Yes | covered directly — all five JT54 claim verbatims re-opened against `JOUSTRV4.SRC`; every `demo.ts:NNNN` pointer in the diff's files re-resolved against the tree |
| type_design | no (config.local.yaml) | Yes | covered directly — no new types; `lint` clean; the new fixture overrides one field of `EntityState` with no cast |
| security | no (config.local.yaml) | Yes | covered directly — comment/test-only rework in a pure core; no I/O, no input parsing, no secrets, no network |
| simplifier | no (config.local.yaml) | Yes | covered directly — net +1 test, one test replaced by two; no dead code, no new abstraction |
| rule_checker | no (config.local.yaml) | Yes | covered directly — all 15 checks of `.pennyfarthing/gates/lang-review/typescript.md` enumerated below; #13 and #15 violated |

**All received:** Yes (1 ran, 8 covered directly)
**Total findings:** 5 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

Round 1's ten items are DONE, and I verified every one of them rather than
taking the Dev Assessment's word: the two mutations that scored zero reds now
score two and one, all five JT54 verbatims still re-open byte-exact, the ROM
facts the rework asserts are true against the vendored tree, the production
comparison is untouched, and lint/orchestrator/build are green. The rejection is
not a re-litigation of round 1. It is that fixing H3 on one branch and
re-labelling the OTHER branch's law from "port choice" to "ROM fact" left a
claimed ROM law with no test that can fail — and `lang-review/typescript.md`
#15's closing rule ("**Every guard must be mutation-tested: delete the
mechanism and require red**") and #13 ("re-scan the fix diff against #15") both
name that exact outcome.

**Race probe:** `git fetch --prune` — `origin/main` moved 45267f9→5b8cd28 while
this review ran. Both commits are siblings' (`test(cp5-2)`, `docs(tea)`); `git
diff --name-only 45267f9..origin/main` touches `plugins/centipede/**` and
`.pennyfarthing/sidecars/tea/` only, zero joust files. No jt5-4 contention.

**Data flow traced (re-traced end to end, not carried over):** the pair loop's
`resolveContacts` → `outcome.kind === 'bounce'` → the fork at `demo.ts:921`.
`isEnemyThud` → `aHigher = a.posY >> 8 <= b.posY >> 8` → `bounceTop`/
`bounceBottom` → `consumeBumpY` → `bounced` map → `withBounced` → `velY`/`posY`
on the process → `cues.push({type:'enemy-thud'})`. Verified against the machine:
`OSTBMP` (`:5042`) is `LDB PPOSY+1,X / SUBB PPOSY+1,U`, so `B = X.pixel −
U.pixel`, and `LBPL OSTUTP` (`:5044`, zero included) takes the branch when
`X.pixel >= U.pixel`, i.e. when U is the physically higher bird. `OSTUTP`
(`:5097-5102`) sends U up (`:5099`) and X down (`:5101`). With a=U and b=X that
is exactly `a.pixel <= b.pixel → a up`. The shipped line is right, to the
comparison operator.

**[RULE] — the blocking finding.** `lang-review/typescript.md` #15's bolded rule
is violated on the SNPTHD branch, and #13's meta-check is what should have
caught it. `demo.ts:926-927` fixes the person-tie roles by register
(`bounceBottom(a)` / `bounceTop(b)`, matching `OSTXTP`'s `:5106`/`:5108`). The
two tests named for that law assert it only by COUNT (`:693-694`) or RELATIVELY
(`:715-719`). MEASURED (M17): invert the two roles and both stay GREEN; the only
reds are `fingerprint(0x1a2b3c4d, 240)`, `fingerprint(0x2468, 900)` and
`entityDigest(0x2468, 200)` — three opaque long-run digests, one of which this
very story re-baselined, and all of which the Reviewer's own round-1 Improvement
predicts "go red the moment the kill-egg gap is closed". So the law's guard has a
scheduled expiry.

**[TEST] Why this is a rework consequence and not a pre-existing condition I am
now noticing.** Before 45267f9, three documents said the U/X↔a/b mapping was a
free port choice; against that claim a symmetric test is the *correct* test —
you cannot pin what the source leaves open. The rework, correctly and at my
insistence, restates it as a ROM fact in `demo.ts:907-914`, in
`audio-thud.test.ts:568-578` and in claim JT54-005. That upgrade is what leaves
`:689` and `:697` under-asserting. The fix is two lines, and I measured the
target so Dev does not have to: `npx vite-node` against this tree gives, for
BOTH `tie(true)` and `tie(false)`, `A velY=-32` (risen) and `P1 velY=64`
(sunk) — so `expect(riser(top)).toEqual([A])` and
`expect(riser(bottom)).toEqual([A])`.

**[EDGE] The guard IS partly load-bearing — the fair reading.** M18 (make the
person tie geometry-DEPENDENT) reddens `:697`. That test does what its title
says: it proves the person tie ignores geometry. It is blind only to WHICH bird
rises. I am not calling it a useless test; I am calling the law under-asserted
in exactly the axis the rework promoted to ROM fact.

**[DOC] The claims file traded a big falsehood for a small one.** JT54-005's
replacement is substantively right — `OSTXT3` (`:5048`) does fall into `OSTXTT`
(`:5053`) — but it says "from :5048-5052 **with no branch in between**", and
`:5052` is `BEQ OSTXPT`, which diverts a pterodactyl winner into
`EXG X,U / JSR PTEBRD` (`:5056-5057`). A reader porting the kill path from the
cited range would be told a branch they can see is not there. The gate cannot
catch it: I re-opened all five JT54 `source.line`/`verbatim` pairs
programmatically and all five match byte-exact, which is precisely why a false
sentence beside a true quote ships green.

**[DOC] The rework re-broke four of its own line pointers.** Growing
`collisionPass`'s comment by 7 lines shifted everything below `demo.ts:917` by
+7. `audio-events.test.ts:353`/`:575` cite `demo.ts:1187` for the self-clear
hatch (verified: correct at `af3fed4`, now `:1194`); `:355` cites
`demo.ts:1219-1222` for the wave-clear gate (now `:1226-1229`); `:578` cites
`demo.ts:1221` (now `:1228`). `:354` — the line Dev edited to fix round-1's M2 —
sits between two of them. Separately and NOT this story's fault, `:44`/`:499`
cite `demo.ts:1173` for the append-and-cap log, which lives at `:1318` and no
longer reads `slice(-32)`; fold it into the same pass.

**[SIMPLE] Verified good.** Net +1 test for a strictly stronger suite: one
symmetric test became two absolute ones, and two `not.toEqual` anti-no-op pins
became `toEqual` regression pins. No new abstraction, no dead code, no
production line added. `git show 45267f9 -- src/core/demo.ts` is `//` lines only,
and M15/M16 independently prove the comparison at `:922` is byte-unchanged from
round 1 — the new guards fail the forbidden arithmetic and pass the shipped one.

**[SEC] Verified good.** Comment-and-test rework inside a pure deterministic
core. No I/O, no user input parsed, no secrets, no network, no filesystem write
outside the test helper's read-only `vendoredLine`, which is guarded by
`existsSync` and only ever called inside an `it()` (the tp1-8 collection trap).
Nothing here reaches the shell or the browser.

**[TYPE] Verified good.** No new type surface. The new fixture spreads
`EntityState` and overrides one numeric field with no cast, no `as any`, no
`ts-ignore`; `npm run lint` (`tsc --noEmit`, repo-wide — the only type check
anywhere) is clean. `audio-dispatch.ts`'s `never` exhaustiveness guard is
untouched and still the thing that would fail a future kind without a cue.

**[SILENT] Verified — with the caveat above.** The failure mode this story most
had to fear is physics computed and silently dropped, and it is guarded: M15/M16
prove the height compare cannot be quietly wrong on the enemy branch, and round
1's M5/M7 proved the `±2` shove and the `bounced.size` short-circuit widening are
load-bearing. The one silent inversion still available is M17's, above.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`, all 15

| # | check | verdict on this diff |
|---|---|---|
| 1 | Type-safety escapes | PASS — no `as any`/`ts-ignore`/`!` added; `lint` clean |
| 2 | Generic/interface pitfalls | PASS — no new generics or interfaces |
| 3 | Enum anti-patterns | PASS — `EVENT_KINDS` tuple + `never` guard unchanged |
| 4 | Null/undefined | PASS — `velYOf` stays `number \| undefined`; the new `.toBe()` assertions fail loudly on `undefined` rather than skipping |
| 5 | Module/declaration | PASS — `.js` extensions present on every import in the touched test |
| 6 | React/JSX | N/A — no `.tsx` in the diff |
| 7 | Async/Promise | N/A — nothing async added |
| 8 | Test quality | **FAIL** — `:693-694` and `:715-719` are symmetric/relative; see #15 |
| 9 | Build/config | PASS — `build-app.mjs joust` OK; `tsconfig`/`vitest` untouched |
| 10 | Security: type-level input validation | N/A — pure core, no external input |
| 11 | Error handling | PASS (unchanged) — `withBounced`'s `return p` fall-through is round-1's noted, non-filed observation; not touched here |
| 12 | Performance/bundle | PASS — one test added; no hot-path or bundle change (126.27 kB, unchanged shape) |
| 13 | Fix-introduced regressions (meta-check) | **FAIL** — the fix diff itself re-broke four line pointers and did not re-scan #15 across the sibling branch |
| 14 | Derived EDGES inside one branch | PASS — the thud cue is pushed at `demo.ts:933`, inside the single pair-loop body where BOTH arms of the outcome fork are visible; there is no second path that can produce a bounce |
| 15 | Source-text assertions / every guard mutation-tested | **FAIL on SNPTHD** (M17 = 0 reds from the law's own tests), **PASS on SNETHD** (M15 = 2 reds, M16 = 1 red, both re-measured by me, not taken from the Dev Assessment) |

### Mutation battery — round 2

Four mutations, each landing verified on disk with `git diff --stat` before the
run, each reverted with `git status --short` proving 0 dirty files after.

| # | mutation | reds | which tests |
|---|---|---|---|
| M15 | `demo.ts:922` `<=` → `<` (tie takes the wrong arm) | **2** | `an EXACT pixel tie…`, `the tie compares the WHOLE PIXEL…` |
| M16 | `demo.ts:922` `a.posY >> 8 <= b.posY >> 8` → `a.posY <= b.posY` | **1** | `the tie compares the WHOLE PIXEL…` |
| M17 | `demo.ts:926-927` swap the SNPTHD register roles | **3** | 2 fingerprints + 1 entityDigest — **none** of the two tests named for the law |
| M18 | `demo.ts:926-927` make the person tie geometry-DEPENDENT | **4** | 3 digests **+ `THE ANSWER — mirroring the geometry does NOT swap the roles`** |

M15 and M16 are the two that scored ZERO in round 1. Both now bite. M17 is the
new finding; M18 is its control, and the pair together is what makes the finding
precise rather than a blanket "the test is weak".

### Devil's Advocate

Argue this is broken. Start with the strongest attack: the whole story rests on
a mapping — that the port's `for (i)/for (j = i + 1)` is the ROM's U/X — and
that mapping is asserted from a linked-list walk in a 1982 process scheduler.
The ROM's `PLINK` order is whatever `PUTPRO`/`GETPRO` produced; this port's
`processes` array order is whatever `createWaveDemo` and every subsequent
`flatMap` produced. If those two orders ever disagree, "a IS U" is a
structural analogy, not an identity, and every claim now written in the
imperative ("this is a ROM fact, not a port decision") overstates. The honest
version is weaker: *earlier-in-scan* maps to U, and both scans happen to be
forward. That is still enough for the person-tie law, because the law is defined
in terms of scan position and nothing else — but it means a future reordering of
the process list is a silent behaviour change on the SNPTHD path, guarded by
nothing except the digests. Which is the same hole M17 found, arrived at from
the other end, and it is why I will not accept "three fingerprints redden" as
adequate cover.

Next attack: what does a confused reader do with this diff? They read
JT54-005, go to `:5048-5052` looking for the "no branch" it promises, find
`BEQ OSTXPT`, and now distrust the whole claims file — or worse, believe it and
port the ptero winner down the wrong continuation. They read
`audio-events.test.ts:355`, jump to `demo.ts:1219`, land on a blank line, and
conclude the gate was deleted. Four pointers, all correct one commit ago.

Next: what does a stressed run do? The frozen `toEqual` digests are exactly
right as regression guards and exactly wrong as documentation — when the
kill-egg story lands, five pins go red at once with no message saying "this is
expected, re-baseline me". Round 1 flagged two; freezing added two more; nobody
wrote the note. And the four findings that end "Needs a story filed" are still
unfiled, which means the one piece of knowledge that would explain those five
reds lives only in an archived session file.

What I could NOT break: the physics. I re-derived `OSTBMP`, `OSTUTP`, `OSTXTP`,
`OSTXUP`, `OSTXDN` and the `OSTBO` tie from the vendored source independently of
every comment in the tree, and the shipped code matches on every branch,
including the sign of the compare and the tie's inclusion. Four mutations, and
not one of them found a wrong number.

**Required to clear:**

| Severity | Issue | Location | Fix Required |
|---|---|---|---|
| [HIGH] | SNPTHD register-role law un-mutation-testable — M17 inverts the roles with both named tests green (`lang-review/typescript.md` #15, #13) | `plugins/joust/tests/audio-thud.test.ts:689-695`, `:711-719` | Assert ABSOLUTELY that `A` rises in BOTH stagings: `expect(riser(top)).toEqual([A])` and `expect(riser(bottom)).toEqual([A])` (measured on this tree: `A velY=-32`, `P1 velY=64`, both stagings). Keep the relative assertion as well — it is what M18 catches. Verify by re-running M17 and requiring red. |
| [MEDIUM] | `:5052` IS a branch (`BEQ OSTXPT`); the claim says there is none | `plugins/joust/docs/rom-study/claims/audio.json` (JT54-005) | Replace "with no branch in between" with the truth: the only branch in the range is `:5052 BEQ OSTXPT`, which diverts a PTERO winner; a non-ptero winner falls through |
| [MEDIUM] | Four `demo.ts` pointers shifted +7 by this rework's own comment growth | `audio-events.test.ts:353`, `:355`, `:575`, `:578` | Re-anchor: `1187`→`1194`, `1219-1222`→`1226-1229`, `1221`→`1228`. Re-check after any further comment edit |
| [MEDIUM] | Four "Needs a story filed" findings unfiled; `epic-jt5.yaml` still ends at `jt5-11` | `sprint/epic-jt5.yaml` | File them (`pf sprint story add`), or name the existing owner. The kill-egg one is load-bearing: it is what turns five re-baselined pins red |
| [LOW] | `demo.ts:1173` cited for the events log (PRE-EXISTING jt5-1 debt, not this story's) | `audio-events.test.ts:44`, `:499` | Opportunistic: the log is `demo.ts:1318` and the cap is `EVENT_LOG_CAP`, not `slice(-32)` |

**Handoff:** Back to Dev (Bicycle Repair Man). Every item is a test assertion, a
comment, a claims sentence or a sprint file — no production logic changes, and
M15/M16/M17/M18 all confirm `demo.ts:922` and `:926-927` are already correct.
## Dev Assessment (rework round 2)

**Implementation Complete:** Yes — all five Reviewer items addressed.
`git diff plugins/joust/src/core/` is **EMPTY**: no production line changed this
round, which is what the Reviewer predicted and what the mutation round-trips
below independently confirm.

**Files Changed:**
- `plugins/joust/tests/audio-thud.test.ts` — the HIGH item. `:689` gains two
  ABSOLUTE assertions (`velYOf(d, A)` is `UP_FROM_DESCENDING`, `velYOf(d, P1)` is
  `DESCENDING`) above the two count assertions, which are kept because they are
  what catches a bounce that separates NOBODY. `:697` gains
  `expect(riser(top)).toEqual([A])` and `expect(riser(bottom)).toEqual([A])`
  above the existing relative `toEqual(riser(top))`. Both comments now cite
  `:5106`/`:5108` for the register roles and `:4874`/`:4880`/`:4881` for why the
  port's `a`/`b` ARE U/X, and the first one records what the old symmetric
  assertion could not see.
- `plugins/joust/docs/rom-study/claims/audio.json` — JT54-005's
  "…from :5048-5052 **with no branch in between**" replaced with the truth: the
  only branch in that range is `:5052 BEQ OSTXPT`, which diverts a PTERODACTYL
  winner into `:5056 EXG X,U` / `:5057 JSR PTEBRD`, so a non-ptero winner is the
  case that falls through. Re-verified against the vendored tree line by line;
  re-parsed with `json.load` and the whole claims suite is green, so
  `source.line`/`verbatim` is untouched.
- `plugins/joust/tests/audio-events.test.ts` — six line pointers re-anchored.
  The four this rework broke: `:353`/`:575` `demo.ts:1187` → `:1194` (the
  self-clear hatch guard), `:355` `demo.ts:1219-1222` → `:1226-1229` (the
  wave-clear gate), `:578` `demo.ts:1221` → `:1228`. Plus the two pre-existing
  jt5-1 ones the Reviewer folded in: `:44` and `:499` cited `demo.ts:1173` and a
  literal `slice(-32)` for the append-and-cap events log, which is `demo.ts:1318`
  and reads `slice(-EVENT_LOG_CAP)` with the cap declared at `demo.ts:311`. Every
  target was re-resolved against the tree with `awk`, not inferred from the +7
  shift.
- `sprint/epic-jt5.yaml` — the four unfiled findings. **jt5-12** (3 pts) the
  kill-egg fidelity gap, carrying the measured NOT-a-soft-lock evidence and the
  five-pin blast radius; **jt5-13** (5 pts) porting `OSTLR`, the horizontal half,
  with all three blockers measured (no `velX` on `EntityState`, `toJoustEntity`
  hard-codes `velX: 0`/`bumpX: 0`, `drainBumpX` has no caller); **jt5-14** (3
  pts) the opposite-carry scan semantics, with the caution to confirm whether
  `BCS 20$` restarts the OUTER walk before implementing. The fourth,
  ptero-vs-ptero SNETHD, was appended to **jt5-10** as its existing owner per
  TEA's own suggestion. `git diff --stat sprint/` is +25/−1 — the single deletion
  is jt5-10's replaced description line; all fourteen story ids re-parse.

**Mutation round-trip — the HIGH item, verified by making it fail:**

| # | mutation | before | after | reverted |
|---|---|---|---|---|
| M17 | `demo.ts:926-927` swap the SNPTHD register roles (`bounceBottom(a)`/`bounceTop(b)` → `bounceTop(a)`/`bounceBottom(b)`) | round 2 review: **3 reds, none from the law's own tests** | **5 reds, including BOTH** `and the bounce lands on the same frame — the ROM sends X up and U down…` **and** `THE ANSWER — mirroring the geometry does NOT swap the roles` | yes — `git diff plugins/joust/src/core/demo.ts` empty |
| M18 | `demo.ts:926-927` make the person tie geometry-DEPENDENT | 4 reds (1 from the law's tests) | **5 reds, both named tests** | yes |

Both mutations were applied with a landing check (`git diff --stat` non-empty
before the run) and reverted from a pre-mutation copy with `git status --short`
proving `demo.ts` clean afterwards. The law that could not fail now fails twice,
for two different reasons.

**Tests:** joust **2026/2026** passing (net 0 — the two tests were strengthened,
not added to). `npm run test:orchestrator` 358/358. `npm run lint`
(`tsc --noEmit`) clean. `node scripts/build-app.mjs joust` succeeds. The "3
citation error(s)" line is the citation gate's own negative-path self-test
against a temp `jt1-9-empty-*` dir, as in both previous rounds.

**Branch:** `main` (trunk-based, no branch).

**Handoff:** To Reviewer (The Argument Professional).
## Subagent Results

Round 3. Toggles unchanged (`preflight: true`, eight `false`). The eight
disabled domains were covered directly again — five mutations this round, plus a
line-by-line re-open of every ROM and tree citation the rework introduced,
including the ones inside the four newly-filed story descriptions, which no gate
in this repo checks.

| subagent | enabled | received | result |
|---|---|---|---|
| reviewer-preflight | yes | Yes | joust 2026/2026, orchestrator 358/358, lint clean, build OK; tree clean, HEAD == origin/main |
| edge_hunter | no (config.local.yaml) | Yes | covered directly — M15/M17/M18/M19 re-run; `tie(true)`/`tie(false)` divergence measured per-assertion |
| silent_failure_hunter | no (config.local.yaml) | Yes | covered directly — M17 (role inversion) and M19 (nobody separates) both now caught by the law's own tests |
| test_analyzer | no (config.local.yaml) | Yes | covered directly — 1 finding: a comment that misstates which of the new assertions catches which defect |
| comment_analyzer | no (config.local.yaml) | Yes | covered directly — 1 confirmed false claim (above) + 1 LOW citation error carried into jt5-13 |
| type_design | no (config.local.yaml) | Yes | covered directly — no type surface touched; `tsc --noEmit` clean |
| security | no (config.local.yaml) | Yes | covered directly — zero production diff; nothing reaches shell, network or filesystem |
| simplifier | no (config.local.yaml) | Yes | covered directly — net 0 tests, assertions strengthened in place; no dead code |
| rule_checker | no (config.local.yaml) | Yes | covered directly — `lang-review/typescript.md` #15 now PASSES on both branches; #13 re-scanned, 1 fix-introduced defect found |

**All received:** Yes (1 ran, 8 covered directly)
**Total findings:** 2 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

All five required items are DONE and I verified each independently. One new
defect, and it is the same disease for the third time: a comment that states,
as fact, the opposite of what the mutation Dev ran actually measured — and the
false version would license deleting the assertions that work.

**Race probe:** `git fetch --prune` — HEAD == `origin/main`, 0/0. The only other
commit since my round-2 review is `375db1d review(cp5-2)`, a sibling; the joust
files in the range are jt5-4's own.

**[RULE] #15 now passes on BOTH branches — the HIGH item is cleared.** M17
(invert the SNPTHD register roles at `demo.ts:926-927`) went from 3 reds, none
from the law's own tests, to **5 reds including both** `and the bounce lands on
the same frame — the ROM sends X up and U down, never the reverse` and `THE
ANSWER — mirroring the geometry does NOT swap the roles`. M19 (both parties
bounce the same way, so nobody separates) reddens 4, both named tests among
them, which proves the count assertions Dev kept are load-bearing rather than
decorative. M15 re-run as a regression check on the file Dev edited: still 2
reds. Every mutation landed with `git diff --stat` non-empty and reverted with
`git status --short` at 0.

**[TEST] The new defect — a comment that inverts its own measurement.**
`audio-thud.test.ts:732-737` reads: *"The relative one is what catches a person
tie that consults GEOMETRY, which the absolute pair alone would not: a
height-dispatching implementation still sends A up in `tie(true)` and only
diverges in `tie(false)`."* Every clause of that is backwards. MEASURED — M18
applied, then `-t "the bounce lands on the same frame|THE ANSWER"`:

```
AssertionError: A is X (eligible[1]): OSTXTP sends REG.X UP, :5108
    expected 64 to be -32
AssertionError: staging A: OSTXTP sends REG.X (=A) up, :5108
    expected [ 1 ] to deeply equal [ 2561 ]
Tests  2 failed | 1 passed
```

Both failures are `tie(true)` — `staging A`. `riser(bottom)` (`staging B`) and
the relative `toEqual(riser(top))` did **not** fire at all. Derivable from the
fixture without running anything: in `tie(true)` P1 sits at pixel 92 and A at 94,
so a height dispatch computes `92 <= 94` → true → sends **P1** up, diverging from
the ROM; in `tie(false)` it computes `94 <= 92` → false → sends **A** up, which
AGREES with the ROM. So geometry-dispatch diverges in `tie(true)` and agrees in
`tie(false)`, the exact opposite of the sentence, and the ABSOLUTE pair on
staging A is the only thing in the file that catches it.

Dev's own Delivery Finding records the true version — *"the M18 control turned
out to redden the newly-absolute test as well as the relative one"* — so the
measurement was taken and then written up backwards forty lines away. The
consequence is not cosmetic: a reader trimming duplication would follow this
comment and delete the `tie(true)` absolute assertions as redundant, keeping the
relative one that demonstrably catches neither M17 nor M18.

**[DOC] A citation carried into a filed story.** jt5-13's description says
`toJoustEntity` hard-codes `velX: 0` and `bumpX: 0` at "`demo.ts:745`, `:748`,
`:761`, `:764`". `:748`/`:764` are the two `velX: 0` and are right; `:745`/`:761`
are `posX: e.posX` — `bumpX: 0` is at `:751` and `:767`. Inherited verbatim from
TEA's Delivery Finding, so Dev transcribed faithfully and the error is upstream,
but it is now the pointer a future Dev follows. LOW: six lines off, and obvious
on arrival.

**[EDGE] [SILENT] [SIMPLE] [TYPE] [SEC] Verified good.** Zero production diff —
`git diff a157a7a^..a157a7a -- plugins/joust/src/` is empty, so no branch, no
boundary and no error path moved; the five mutations confirm the physics is
where round 2 left it. Net 0 tests (assertions strengthened in place, nothing
added or removed), no new abstraction, no dead code. No type surface touched and
`tsc --noEmit` is clean. Comment-and-data change inside a pure core: no I/O, no
input parsing, no secrets, nothing reaching the shell.

**[DOC] Verified good — the rest of the prose.** JT54-005's replacement is now
TRUE: `:5052` is `BEQ OSTXPT`, `:5056` is `OSTXPT EXG X,U`, `:5057` is
`JSR PTEBRD`, all re-opened against the vendored tree. All five JT54
`source.line`/`verbatim` pairs still match byte-exact. All six re-anchored
pointers resolve correctly on the current tree (`:1194` the hatch guard, `:1226`
`const clearable =` through `:1229`, `:1228` the egg clause, `:1318` the
append-and-cap with `EVENT_LOG_CAP` declared at `:311`). The fresh ROM claims in
the new stories check out too: `:4947 HITEM1 ANDCC #$FE`, the `FLYX` table at
`:7150-7158`, `WRAPX :7270-7288` with `CLR PBUMPX,U` at `:7288`, and
`bounceHorizontal`/`drainBumpX` still have zero production callers.

**[SIMPLE] Verified good — the filing.** Four findings routed, none dropped:
jt5-12 (3), jt5-13 (5), jt5-14 (3) filed, ptero-vs-ptero appended to jt5-10 as
TEA proposed. `sprint/` diff +25/−1, all fourteen ids re-parse, descriptions
1.7k–2.6k chars, verified on `origin/main`. The judgement call Dev logged —
keeping the relative assertion though M18 also reddens the absolute one — is
correct and I would have made it; it is only the comment explaining it that is
wrong.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

Re-scanned all 15 against this round's diff. #1–#12 and #14: PASS or N/A,
unchanged from round 2 — no types, no async, no error paths, no production code.
**#15 (every guard mutation-tested): now PASS on both branches** — M17/M18/M19
all caught by the law's own tests, M15/M16 still caught on the SNETHD side.
**#13 (fix-introduced regressions, re-scan the fix diff): FAIL** — the fix
introduced the inverted comment above. This is the check's stated purpose and
the third consecutive round it has fired.

### Devil's Advocate

Argue this is broken. The strongest case is that I am now approving a suite whose
comments have been wrong in three successive rounds while its assertions were
right in two of them, and that the pattern says something about where the risk
lives. Every defect I have found in jt5-4 has been a CLAIM, never an arithmetic:
the physics was correct at round 1 and has not moved since. So what is actually
being reviewed is a documentation artefact whose falsehoods happen to be
load-bearing — because in a ROM-fidelity port the comment IS the specification,
and the next story's Dev will read it instead of the 1982 source. This round's
inverted sentence is the sharpest example yet: it does not merely mislead, it
names the wrong assertion as the important one, which is an instruction to
delete the working guard. That is worse than the round-1 comment that said a
determined law was a free choice, because that one only removed motivation to
test; this one supplies a reason to untest.

What would a confused reader do? Trim the "duplicate" absolute assertions,
re-run the suite, see 2026 green, and ship a tree where M17 and M18 both score
zero again — back to the round-2 state, arrived at by following a comment
written to prevent it.

What would a stressed run do? Nothing new: no production code changed, so every
seeded replay, every fingerprint and every digest is bit-identical to what round
2 measured, and I re-ran the whole suite to confirm.

What I could not break: the guards themselves. Five mutations this round —
inverting the roles, dispatching on geometry, collapsing both parties onto one
direction, flipping the enemy tie's comparison — and every one is now caught by
a test that names the law it protects. That is the thing the last two rounds were
for, and it is done. One sentence stands between this and approval.

**Required to clear:**

| Severity | Issue | Location | Fix Required |
|---|---|---|---|
| [MEDIUM] | Comment states the inverse of its own measurement: geometry-dispatch diverges in `tie(true)` (caught by the ABSOLUTE pair) and AGREES in `tie(false)`; the relative assertion catches neither M17 nor M18 | `plugins/joust/tests/audio-thud.test.ts:732-737` | Restate: the absolute pair on staging A catches BOTH a role inversion and a geometry dispatch; the relative assertion is kept because its failure message names the geometry exchange, not because it has unique coverage. Verify by re-running M18 and reading which assertions fire |
| [LOW] | `bumpX: 0` cited at `demo.ts:745`/`:761`; those are `posX: e.posX` — it is at `:751`/`:767` | `sprint/epic-jt5.yaml` (jt5-13 description) | Correct the two line numbers (upstream error inherited from TEA's Delivery Finding, not introduced here) |

**Handoff:** Back to Dev (Bicycle Repair Man). One comment and two line numbers;
no assertion, no production code and no filed story needs to change.
## Dev Assessment (rework round 3)

**Implementation Complete:** Yes — both items, and nothing else touched.

- `plugins/joust/tests/audio-thud.test.ts:732-743` — the inverted comment
  replaced with the measured truth: the ABSOLUTE pair carries the coverage and
  BOTH mutations (role inversion, geometry dispatch) redden `staging A`; the
  relative assertion fires for neither and is kept for its failure message
  alone. The `tie(true)` = pixel 92 vs 94 arithmetic is written out so the next
  reader can re-derive it without running anything, and the comment now ends
  with an explicit "do NOT trim `staging A` as a duplicate" — the exact deletion
  the old wording invited.
- `sprint/epic-jt5.yaml` (jt5-13) — `velX: 0 (demo.ts:748, :764)` and
  `bumpX: 0 (demo.ts:751, :767)`, split so each pair sits with the field it
  actually cites. Upstream error from TEA's Delivery Finding, corrected at the
  filed story where the next Dev will read it.

**Tests:** joust 2026/2026, orchestrator 358/358, lint clean, build OK. No
assertion changed, so no mutation re-verification was required — round 3's
review re-measured M15/M17/M18/M19 against these exact assertions.

**Branch:** `main` (trunk-based). **Handoff:** To Reviewer.
## Subagent Results

Round 4. Toggles unchanged (`preflight: true`, eight `false`); disabled domains
covered directly, as in every round of this story.

| subagent | enabled | received | result |
|---|---|---|---|
| reviewer-preflight | yes | Yes | joust 2026/2026, orchestrator 358/358, lint clean, build OK, tree clean |
| edge_hunter | no (config.local.yaml) | Yes | covered directly — M17 re-run against the edited file: still 5 reds |
| silent_failure_hunter | no (config.local.yaml) | Yes | covered directly — comment-only diff; no path, branch or error handler moved |
| test_analyzer | no (config.local.yaml) | Yes | covered directly — no assertion changed; the guards re-measured, not re-read |
| comment_analyzer | no (config.local.yaml) | Yes | covered directly — the corrected comment re-derived from the fixture arithmetic AND from the M18 run |
| type_design | no (config.local.yaml) | Yes | covered directly — no type surface; `tsc --noEmit` clean |
| security | no (config.local.yaml) | Yes | covered directly — comment + sprint YAML only |
| simplifier | no (config.local.yaml) | Yes | covered directly — net 0 tests, net 0 production lines |
| rule_checker | no (config.local.yaml) | Yes | covered directly — #13 re-scanned and now CLEAN; #15 passes on both branches |

**All received:** Yes (1 ran, 8 covered directly)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Both round-3 items are fixed and verified, and #13 — the fix-introduced-
regression check that fired in three consecutive rounds — is finally clean.

**[TEST] [DOC] The comment now matches the measurement.** `audio-thud.test.ts:732-743`
states what M17 and M18 actually do: the ABSOLUTE pair carries the coverage,
both mutations redden `staging A`, and the relative assertion fires for neither.
The `tie(true)` arithmetic (P1 at pixel 92, A at 94, so `92 <= 94` sends P1 up —
diverging; `tie(false)` computes `94 <= 92` and agrees) is written out so the
next reader re-derives it without running anything, and it closes with an
explicit instruction not to trim `staging A` as duplicate — the exact deletion
the old wording invited. Re-verified independently: **M17 still reddens 5**,
including both tests named for the law, against this edited file.

**[RULE] All 15 checks pass.** #15 (every guard mutation-tested) passes on both
branches — SNETHD via M15/M16, SNPTHD via M17/M18/M19. **#13 (re-scan the fix
diff) is CLEAN for the first time in this story**: round 1's fix broke four line
pointers, round 2's fix introduced an inverted comment, round 3's fix introduced
nothing. #1–#12 and #14 unchanged and PASS or N/A — no types, no async, no error
paths, no production code.

**[SIMPLE] [TYPE] [SEC] [EDGE] [SILENT] Verified good.** The whole story's
production diff is `demo.ts` + `events.ts` + `audio-dispatch.ts` from round 1's
GREEN and nothing since; rounds 2–4 changed comments, assertions and sprint
records only. Zero production lines this round. No type surface, no I/O, no
input parsing, nothing reaching the shell. The `bounced` map mirrors the existing
`caught` shape and drains in the same `.map()`, with `caught` applied first so an
egg catch and a bounce compose rather than race.

**[DOC] The citation is corrected at the right place.** jt5-13 now reads
`velX: 0 (demo.ts:748, :764)` and `bumpX: 0 (demo.ts:751, :767)` — verified line
by line against the tree. The upstream error in TEA's Delivery Finding stays
visible with the correction attached, per this repo's convention.

**Data flow (final):** player input → `stepFrame` → `collisionPass` pair loop →
`resolveContacts` → `bounce` → `bounceTop`/`bounceBottom` + `consumeBumpY` →
`bounced` map → `withBounced` writes `velY`/`posY` → `cues.push` → `stepDemo`
concatenates after `stepped.cues` → `GameState.events` → `audio-dispatch.cueFor`
→ `SOUNDS`/`CHANNELS`. Verified against `OSTBMP` (`:5042`), `OSTUTP`
(`:5097-5102`), `OSTXTP` (`:5104-5108`), `OSTXUP` (`:5163`), `OSTXDN` (`:5175`)
and the `OSTBO` tie (`:5010`) — correct on every branch including the sign of
the compare and the tie's inclusion.

### Devil's Advocate

The case against approving: this story took four review rounds, and a reasonable
reader could conclude the last two were the reviewer generating work. Rounds 1
and 2 found guards that could not fail — mutations changing real behaviour with
the suite green — which is the defect class this repo has burned stories on
before, so those earned their cycles. Round 3 found one wrong sentence in a test
comment and cost a full cycle for a two-line fix; that was disproportionate, and
the honest resolution was to correct it in place, which is what happened once the
cost was named. The lesson is not "the comment did not matter" — it named the
wrong assertion as load-bearing and would have licensed deleting the working
guard — but that severity should have been weighed against cycle cost the first
time, not the second.

What could still be wrong: the SNPTHD role law rests on `a`↔U being the same
relation as the ROM's PLINK walk. Both are forward scans, so the law holds as
stated; but a future reordering of `processes` is a silent behaviour change on
that path, and the guard is a staged fixture, not a property. jt5-14 (the
opposite-carry scan semantics) touches exactly that loop and should re-run M17
when it lands. Second: five pinned numbers go red when jt5-12 closes the kill-egg
gap, and one of them — `entityDigest(0x2468, 200)` — is itself a guard on this
law; jt5-12's description says so, which is the only reason that is safe.

What I could not break: eight mutations across four rounds against the physics,
and not one found a wrong number. The arithmetic has been correct since round 1.

**Handoff:** To SM (The Announcer) for finish-story.