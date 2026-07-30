---
story_id: "jt8-4"
jira_key: "jt8-4"
epic: "jt8"
workflow: "tdd"
---
# Story jt8-4: Egg collection — the player-vs-egg catch pass (PLYEGG/EGGSCR), ladder plus 500 mid-air, cancel remount

## Story Details
- **ID:** jt8-4
- **Jira Key:** jt8-4
- **Workflow:** tdd
- **Points:** 2
- **Priority:** p1
- **Repos:** joust
- **Type:** bug
- **Branch:** `feat/jt8-4-egg-collection` (joust, cut from `develop`)
- **Context:** `sprint/context/context-story-jt8-4.md`
- **Stack Parent:** none (independent of jt8-1 → jt8-2 → jt8-3 enemy chain)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-30T00:30:02Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-29T23:36:33Z | 2026-07-29T23:41:00Z | 4m 27s |
| red | 2026-07-29T23:41:00Z | 2026-07-30T00:07:39Z | 26m 39s |
| green | 2026-07-30T00:07:39Z | 2026-07-30T00:13:36Z | 5m 57s |
| review | 2026-07-30T00:13:36Z | 2026-07-30T00:30:02Z | 16m 26s |
| finish | 2026-07-30T00:30:02Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### SM (setup)

- **Conflict** (non-blocking for jt8-4, blocking for sw8-8) — **sw8-8 is owned by checkout a-2 and
  is in Reviewer round 2; it was requested for this session and refused.** Every pf signal said the
  story was free: `NEW_WORK_STATE`, `pf sprint backlog` listed it, `status: backlog` both locally
  and on `origin/main`, clean merge gate, no open PRs. a-2 had nonetheless been on it ~13 hours
  (`setup` 10:32 → red → green 3h19m → review → green 7h55m → review re-entered 22:26Z) with three
  commits pushed to `origin/feat/sw8-8-incoming-fire-reaction-window`, latest
  `fix(sw8-8): rework round 1 — un-hollow the sibling guard, release the over-reach`. The claim was
  invisible because a-2 never pushed its sprint stamp and `.session/` files are not committed.
  Nothing was set up here for sw8-8 — no session, branch, or context — so there is nothing to
  unwind. Affects the New Work Flow generally; recorded in `.pennyfarthing/sidecars/sm/gotchas.md`
  as a correction to the cp2-15 entry's "no prevention available at setup". *Found by SM during
  story selection.*
- **Improvement** (non-blocking) — **star-wars fire-gate stories are contended ground until a-2's
  sw8-8 merges.** `uf1-14` (C_PV ±45° pyramid), `uf1-15` (C_AS invented cone) and `sw8-16`
  (C$T9/A$GLW gate coverage) all touch the `sim.ts` / `tie-status.ts` / `gameRules.ts` fire path
  a-2 is actively reworking. Two of the three are p1 and will look attractive to the next
  `/pf-work`. Hold them until sw8-8 is merged. Affects sprint sequencing. *Found by SM during
  story selection.*
- **Question** (non-blocking, for TEA) — **the 1787-green joust baseline in the context file is
  `sm-setup`'s number, not SM-verified.** SM does not run suites directly, and the RED phase
  establishes the baseline by definition. TEA: confirm the pre-change green count as your first
  RED act and correct `sprint/context/context-story-jt8-4.md` §"Current Test Baseline" if it
  differs — the Reviewer's non-vacuity delta depends on it. Affects
  `sprint/context/context-story-jt8-4.md`. *Found by SM during setup verification.*
- **Improvement** (non-blocking, for TEA/Dev) — **two inherited scope carve-outs to be aware of,
  neither belonging to jt8-4.** They are logged here only so nobody folds them in by reflex: the
  sw7-24 review LOWs (tie-fire-visibility equality-boundary assertion, `tie-status.ts` "6 bits"
  docstring) were assigned to **sw8-8**, which now owns them in a-2's branch. jt8-4 touches neither
  file. *Found by SM during story selection.*

### TEA (test design)

- **Answered** (SM's Question, non-blocking): **the 1787-green joust baseline is CORRECT.**
  `npx vitest run --exclude "**/demo-jt8-4*"` reports exactly `1787 passed (1787)`, so
  `sprint/context/context-story-jt8-4.md` §"Current Test Baseline" needed no correction. With this
  story's 41 new tests the tree reads 23 failing / 1805 passing / 1828 total. Affects nothing —
  recorded so the Reviewer has a sourced number. *Found by TEA during test design.*
- **Conflict** (non-blocking, resolved in the contract): **the story's REUSE-FIRST premise is right
  about the ladder TABLE and wrong about the ladder COUNTER, and taking it literally would have
  shipped a permanently-250 ladder.** EGGSCR reaches the egg-hit count through the CATCHING PLAYER
  — `LDY PDECSN,U` (U documented at :3025 as "THE PLAYER'S (VICTOR) WORKSPACE THAT HIT THE EGG") →
  `LDY DEGGS,Y` → `LDB ,Y` → capped bump → `EGGSMN STB ,Y` (:3033-3053) — and `DEGGS RMB 2 EGG
  KILLED COUNTER` is declared in the `* DECISION BLOCK *` at `ORG $0` (:101-113). It is per-player,
  persistent, and EGGSCR never resets it. Our port put `hitCount` on the EGG (`egg.ts:53`) where
  BOTH producers hard-code 0 (`spawnEgg` egg.ts:142, `settledWaveEgg` demo.ts:498) and nothing
  writes it back, so `eggScoreEvents` can only ever compute `eggValue(bumpEggHits(0))` = 250.
  Pinned as seam-agnostic observables over successive catches instead. Affects
  `joust/src/core/demo.ts` (the counter's new home) and `joust/src/core/egg.ts` (`eggScoreEvents`
  is the aggregate that cannot serve this seam). *Found by TEA during test design.*
- **Gap** (non-blocking): **the 500/750/1000 rungs of EGGVAL have been unreachable in the running
  game since jt2-4 — this is a latent shipped bug, not just a missing feature.** `egg.ts`'s ladder,
  cap and air bonus are all correct and unit-tested, but with no producer of a nonzero `hitCount`
  the only rung any consumer could ever observe is the first. jt8-4 is what makes rungs 2-4 live.
  Worth calling out because the unit suite is green and says nothing about it. Affects
  `joust/src/core/egg.ts` + `joust/tests/egg.test.ts` (the pure pins at :314-316 exercise
  hand-made eggs, which is why the hole survived). *Found by TEA during test design.*
- **Gap** (non-blocking, for a follow-up story): **our port has no in-transit riderless remount
  buzzard, so the ROM's literal AUTOFF cancel is unreachable.** EGGSCR reads `PDIST,X` off the egg
  — a pointer to a bird ALREADY flying toward the little man — and on a catch decrements `NENEMY`
  and writes `AUTOFF` into that bird's `PJOY` (:3078-3087). Our `stepDemo` matures a settled wave
  egg *straight into* a remount enemy in one frame (`demo.ts:988-992`), so egg and bird never
  coexist and there is nothing to redirect. AC-3 is therefore pinned as the reachable ordering
  property (a caught egg must not also hatch) plus an anchor proving an UNcaught egg still does.
  Modelling the in-transit bird is a real, separate story. Affects `joust/src/core/demo.ts`
  (the hatch flatMap). *Found by TEA during test design.*
- **Gap** (non-blocking, for a render/feedback story): **the caught egg's floating SCORE DISPLAY is
  claimed but unmodelled.** The ROM does not delete a collected egg: EGGWAK re-points its `PPC` to
  `EGGHIT` (:3329), naps it 4, and clears the PID collide bit (`ANDA #$7F`, :3088-3094), having
  stashed the colour in `PPVELX` and the rung index in `PRDIR` (:3036/:3054 — already claimed as
  JT24-035/036) so the value floats where the egg was. Our catch pass removes the process, which is
  behaviourally right for scoring and silent for feedback. Affects `joust/src/shell/render.ts` +
  `joust/src/core/demo.ts`. *Found by TEA during test design.*
- **Question** (non-blocking, for whoever next touches the ladder): **the DEGGS reset scope is
  unresolved.** EGGSCR only bumps and pegs (proved negatively in the source suite: across
  :3030-3095 the single write to the counter is `STB ,Y`), but I did not chase where the decision
  block's counter is CLEARED — per wave, per life, or per game. Every ladder pin in this story
  therefore stays inside one wave, which is sound under all three readings. If a later story needs
  the cross-wave behaviour it must dig the decision-block initialiser first. Affects
  `joust/src/core/demo.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): **`tests/helpers/demo-contract.ts` had drifted BEHIND `src`.** It
  was missing `waveEgg` (added to the process by jt4-5) and `player` on the score event (added by
  jt4-1) — so a test could not stage a wave egg or read attribution through the contract at all.
  Both mirrored in by this story. Future stories in this repo should expect the contract to lag
  and check it before assuming a field is untestable. Affects
  `joust/tests/helpers/demo-contract.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): **the ROM's `NRIDER` / `NENEMY` censuses are unmodelled.** A
  catch does `DEC NRIDER` unconditionally (:3071) and `DEC NENEMY` when a bird was inbound (:3080).
  Our port has no rider/enemy census — wave-clear is derived by scanning the process list
  (`demo.ts:1007`, `:1018-1021`), which is a different mechanism that happens to agree. Out of
  scope here; relevant to anyone porting the ROM's wave-end arithmetic. Affects
  `joust/src/core/demo.ts`. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): **the counter survives frames only because every process rebuild
  in this repo already spreads.** `DemoProcess.eggHits` is optional, and the known failure mode for
  a new optional process field is a per-frame rebuild that drops it (a literal `{ id, cls, ... }`
  return), which stays green in spawn-frame assertions and reads `undefined` a frame later. I
  checked every rebuild site before relying on it: `frame.ts:263/291/296/302/307/359` and
  `demo.ts:891` are all spread-plus-override, so nothing strips it. The five-catch ladder walk is
  the guard that would catch a regression here. Anyone adding a rebuild site must keep the spread.
  Affects `joust/src/core/frame.ts` + `joust/src/core/demo.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking, for the jt5 score-display epic): **a collected egg now vanishes with
  no on-screen acknowledgement.** The ledger moves and `main.ts:137` redraws the digits, but the
  ROM's own feedback is the egg's own process turning INTO the floating score value (EGGWAK repoints
  `PPC` at `EGGHIT`, stashing colour in `PPVELX` and the rung in `PRDIR`, :3036/:3054/:3088-3094).
  With rungs now escalating 250→1000, "which rung did I just get?" is information the player can no
  longer see anywhere. Worth folding into whichever story owns score presentation. Affects
  `joust/src/shell/render.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **TEA's sibling re-seat was COMPLETE for once — no additional
  fixtures needed moving.** The standing hazard in this repo is that a RED re-seat misses spots
  because RED runs new tests against old code; here the contract was probed against a throwaway
  under the FULL suite during RED, which surfaced the single collateral (`game.test.ts`'s dedupe
  window) before implementation. The GREEN full run is 1828/1828 with zero further re-seats, which
  is the empirical confirmation. Recorded because the probe-during-RED practice is what made the
  difference. Affects nothing. *Found by Dev during implementation.*


### Reviewer (code review)

- **Gap** (non-blocking, R-1): **the egg ladder silently resets to rung 1 on every death, where the
  ROM's DEGGS persists.** `respawnPlayerProcess` (`demo.ts:333`) builds a fresh process from
  `playerProcess(...)`, and `eggHits` has exactly three sites in all of `src/` — the declaration
  (`demo.ts:167`), the read (`:904`), the write (`:905`). Nothing carries it across, and `game.ts:439`
  appends the fresh process while the ledger it consults carries only lives/score. Reproduced: a
  player with 3 prior hits scores **1000**; after a respawn the identical staging scores **250**. The
  ROM disagrees — `DEGGS` is declared in the DECISION BLOCK (`ORG $0`) alongside `DSCORE` "SCORE RAM
  LOCATION" (:106) and `DCRE` "DECISION TO BE RECREATED BY WHOM" (:111); a score survives its
  player's death, so the block does, so the counter does. Fixing it means homing the count where it
  outlives a process but stays readable by the sim at emit time — a per-player record on `DemoSim`
  (jt8-1's `targets` precedent). Affects `joust/src/core/demo.ts` + `joust/src/core/game.ts`.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking, R-2): **the catch is box-only — the egg's transcribed collision mask is
  never consulted, so `CEGGUP` joins the unwired-asset pile.** The joust pass in the same function
  does `broadPhase` → `narrowPhase(masks)` (`demo.ts:783-788`); the egg pass stops at `broadPhase`
  (`:902`). `collisionMaskFor` (`:687`) returns null for `kind === 'egg'`, yet `CEGGUP`, `CEGGLF`,
  `CEGGRT` and `CEGGMN` are all transcribed with real spans and `JOUSTI.SRC` anchors
  (`pictures.ts:1799-1806`), and `ENTITY_RECORDS.EGGI` (`:1699`) explicitly names `CEGGUP` as the
  egg's mask. Consequence: the catch's vertical reach is the 16-px `ENTITY_BOX_H` rather than
  `CEGGUP`'s 7 real scanlines — roughly a bird's height of over-generosity, so an egg can be
  collected from visibly clear of it. Doing this right needs the mask VARIANT question answered
  (the ROM has four egg masks for its orientation/hatching frames and `EggState` carries no frame
  field), which is why it is a follow-up and not a patch. Affects `joust/src/core/demo.ts`
  (`collisionMaskFor` + the egg pass) and `joust/src/core/egg.ts` (an orientation field).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking, R-3): **`{posX, posY}` → box is now written three times.**
  `collisionBox` (`demo.ts:732`), `entityBox` (`:737`) and the new `eggBox` (`:742`) have identical
  bodies and differ only in parameter type; all three read only `posX`/`posY`. One
  `boxOf(e: {posX: number; posY: number})` replaces all three with no loss of type safety. jt8-4
  extended a pre-existing 2-way duplicate into a 3-way one rather than creating the problem.
  Affects `joust/src/core/demo.ts`. *Found by Reviewer during code review (corroborated by
  reviewer-rule-checker, its sole violation).*
- **Improvement** (non-blocking, R-4): **unreachable defensive code.** `caught.get(pl.id) ?? pl`
  (`demo.ts:897`) can only ever yield `pl`: `livePlayers` holds one entry per unique process id and
  `caught` starts empty on every `collisionPass` call, so the map is always empty entering the outer
  loop body. Harmless, but it implies a re-entrancy that does not exist and invites a reader to
  preserve it. Affects `joust/src/core/demo.ts`. *Found by Reviewer during code review (corroborated
  by reviewer-rule-checker item 19).*
- **Improvement** (non-blocking, R-5): **the shipped suite tests per-player independence only across
  sequential frames, never within one frame.** `reviewer-rule-checker` probed the same-frame case (two
  players each collecting their own separated egg in one `stepDemo`) and it behaves correctly —
  `[[250,1],[250,2]]` — but nothing in `tests/` pins it, so a future refactor of the `caught` map
  could regress it silently. Worth one assertion whenever this file is next opened. Affects
  `joust/tests/demo-jt8-4.test.ts`. *Found by Reviewer during code review.*


## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The ladder pins are seam-AGNOSTIC about where the hit counter lives**
  - Spec source: context-story-jt8-4.md AC-2 + the story description's "REUSE-FIRST … emit the egg
    score events via the EXISTING egg.ts core (eggScoreEvents = the EGGVAL ladder … by hit count)"
  - Spec text: "the ladder value follows the hit count (250/500/750/1000 capped)"
  - Implementation: the suite pins the ladder as an OBSERVABLE over successive catches (rungs climb
    per player, peg at the cap, and one player's rungs never advance the other's) and deliberately
    does NOT require `eggScoreEvents(egg)` specifically, nor name a field. Dev may home the counter
    on the player process or beside `budget`/`targets` on `DemoSim` (jt8-1's precedent).
  - Rationale: `eggScoreEvents` reads `egg.hitCount`, which every producer hard-codes to 0 and
    nobody writes back, so the AC is literally unsatisfiable through that aggregate — the ROM keeps
    the counter in the PLAYER's decision block (`DEGGS`, :113 / :3033-3053). Naming the seam would
    over-specify; naming the aggregate would specify something that cannot work.
  - Severity: minor
  - Forward impact: Dev picks the counter's home and must route the bump through egg.ts's
    `bumpEggHits` (enforced by the REUSE block, which is the only guard that sees an uncapped bump).

- **AC-3's AUTOFF remount cancel is pinned as an ORDERING property, not as a redirected bird**
  - Spec source: context-story-jt8-4.md AC-3
  - Spec text: "an incoming remount bird for that egg is cancelled (AUTOFF, :3078-3087)"
  - Implementation: pinned as "a caught wave egg must not ALSO mature into a remount enemy this
    frame", plus a companion anchor proving an UNcaught settled wave egg still hatches.
  - Rationale: the ROM's `PDIST,X` points at a bird already in flight toward a still-collectable
    egg; our port matures a settled wave egg straight into the remount enemy in a single
    `stepDemo` (`demo.ts:988-992`), so that coexistence — and therefore the literal cancel — is
    unreachable. The reachable analogue is the ordering of the catch against the hatch, which IS a
    real bug surface: a catch that only marks the egg non-colliding leaves it visible to the hatch
    flatMap and pays the player a score AND a fresh enemy.
  - Severity: minor
  - Forward impact: the companion anchor stops "cancel the remount" being implemented as "never
    hatch", which would re-lock every egg wave and silently undo jt4-5. Modelling the in-transit
    riderless bird is filed as a Delivery Finding for a separate story.

- **A sibling suite was RE-SEATED: game.test.ts's P2-kill dedupe window**
  - Spec source: tests/game.test.ts (jt4-1 AC-3 integration), not a jt8-4 AC
  - Spec text: "the kill credits EXACTLY once — no re-credit from the rolling log" — asserted as
    `after.players[1].score === banked`, baselined AT the kill frame
  - Implementation: re-baselined two frames later, after the egg credit settles; the exact-equality
    assertion over the following 60 frames is unchanged.
  - Rationale: the kill leaves an egg at the victim's position and P2, still flying into that spot,
    collects it on the NEXT frame (f145 kill 500 → f146 egg 250+500 at that seed). That is
    authentic — the +500 air-catch bonus exists for exactly the egg you take off your own kill — so
    the old assertion was stale, not violated. The re-seat is deliberately NEUTRAL: verified green
    both on pristine `src` and under the throwaway probe. The positive claim (the egg off the kill
    really is credited end-to-end) moved into this story's own suite.
  - Severity: minor
  - Forward impact: the dedupe mutation it exists to kill still dies — a dropped `!prior.has(e)`
    re-credits on all 60 frames regardless of the baseline. Dev must not "fix" this file.

- **AC-4's purity guard and citations gate get no bespoke test**
  - Spec source: context-story-jt8-4.md AC-4
  - Spec text: "purity guard plus citations plus npm test green"
  - Implementation: carried by the EXISTING gates (`tests/helpers/purity-scanner.ts` sweeps
    `src/core`, and the claims/citation suites already run repo-wide). This story adds the
    determinism pin and the claim-coverage pins, not a second purity scanner.
  - Rationale: duplicating a repo-wide gate inside a story suite adds a second thing to keep in
    step with no new coverage; jt2-4/jt8-1 set the same precedent.
  - Severity: minor
  - Forward impact: Dev must keep `demo.ts` clock/entropy-free (the catch pass is a pure function
    of the process list) or the existing purity suite reds.

### Dev (implementation)

- **The hit counter is homed on the player PROCESS, not on `DemoSim`**
  - Spec source: session Design Deviations (TEA) — "Dev may home the counter on the player process
    or beside `budget`/`targets` on `DemoSim` (jt8-1's precedent)"
  - Spec text: TEA left the seam open: "the suite … deliberately does NOT require
    `eggScoreEvents(egg)` specifically, nor name a field"
  - Implementation: added optional `eggHits?: number` to the player `DemoProcess`; the catch pass
    reads `self.eggHits ?? 0`, bumps through `bumpEggHits`, and writes the bumped process back.
  - Rationale: the ROM's `DEGGS` is a field of the PLAYER's decision block, so the player process is
    the structurally faithful home; it also needs no new plumbing through `stepDemo`/`createWaveDemo`
    the way a `DemoSim` record would, and it dies with the player exactly as the decision area does.
  - Severity: minor
  - Forward impact: a future story wanting a cross-wave or cross-life ladder must first resolve
    TEA's open DEGGS-reset question — a per-process counter resets when a player process is replaced,
    which is a real semantic choice this story did not have the source to settle.

- **A collected egg is REMOVED rather than kept as a non-colliding score display**
  - Spec source: context-story-jt8-4.md AC-1
  - Spec text: "REMOVES the egg"
  - Implementation: `removed.add(ep.id)` — the process leaves the list, matching the AC.
  - Rationale: the AC says remove, and removal is what makes the catch unrepeatable. The ROM does
    something strictly larger — clears the PID collide bit and repoints the process at `EGGHIT` to
    float the score value (:3088-3094) — so removal is a faithful SUBSET of ROM behaviour for
    everything scoring-visible, and the missing part is presentation. Logged as a Delivery Finding
    rather than silently implemented, since inventing a score-display entity is another story's job.
  - Severity: minor
  - Forward impact: the floating rung value is absent on screen; whoever owns score presentation
    inherits it (see the Dev Delivery Finding).


### Reviewer (audit)

All six logged deviations audited — four TEA, two Dev. Every one stamped; nothing left implicit.

- **TEA: the ladder pins are seam-AGNOSTIC about where the hit counter lives** → ✓ **ACCEPTED.**
  Not naming the seam was correct, and the reason is stronger than TEA's own rationale: the
  observable TEA chose (rungs climb per player, peg at the cap, one player's rungs never advance the
  other's) is satisfied by both candidate homes, and it is what caught the naive reading. The
  rule-checker proved the pins non-vacuous by breaking `frame.ts:373`'s spread and reddening 5 of 12.
  A suite that had named the field would have passed that mutation.
- **TEA: AC-3's AUTOFF cancel pinned as an ORDERING property, not a redirected bird** → ✓
  **ACCEPTED.** Verified the premise firsthand: `demo.ts:988-992` replaces a settled wave egg with
  the remount enemy in one `flatMap`, so egg and inbound bird provably never coexist and `PDIST,X`
  has no analogue to write `AUTOFF` into. The companion anchor ("an UNcaught settled wave egg still
  hatches") is what makes this honest rather than convenient — without it, "cancel the remount" could
  ship as "never hatch" and silently undo jt4-5's egg-wave self-clear. Good instinct.
- **TEA: a sibling suite was RE-SEATED (game.test.ts's P2-kill dedupe window)** → ✓ **ACCEPTED, and
  I verified the guard did not weaken.** I did not take "deliberately neutral" on trust: I dropped
  the `!prior.has(e)` dedupe in `game.ts` and re-ran — the re-seated test still fails (1 failed / 15
  passed), so the mutation it exists to kill still dies. Restored, md5-identical, tree clean. The
  re-seat's premise is also correct: f145 kill → f146 egg is authentic play, not a leak, since the
  +500 air-catch exists precisely for the egg taken off your own kill.
- **TEA: AC-4's purity guard and citations gate get no bespoke test** → ✓ **ACCEPTED.** Confirmed the
  existing gates genuinely cover this code rather than merely existing: the purity scanner sweeps
  `src/core/` (45 purity tests pass with these hunks in place; the rule-checker independently ran
  35/35), and `check-citations.mjs` re-opened all 876 claims against the vendored bytes. Duplicating
  a repo-wide gate inside a story suite would add drift risk for no coverage.
- **Dev: the hit counter is homed on the player PROCESS, not on `DemoSim`** → ⚠ **ACCEPTED WITH A
  FLAG.** Accepted for this story: it is structurally faithful to the decision block, needs no new
  plumbing, and satisfies every AC. But Dev's own hedge — "it resets when a player process is
  replaced" — is not a hypothetical, and its forward-impact line defers to a question I have now
  answered. The process is the wrong lifetime: `respawnPlayerProcess` (`demo.ts:333`) builds a fresh
  process, and the ROM's `DEGGS` shares a block with `DSCORE`, which survives a death. Recorded as
  finding **R-1** with a reproduction, not left as a preference. Non-blocking because relocating the
  counter crosses the core/session seam and is strictly larger than this 2-point story.
- **Dev: a collected egg is REMOVED rather than kept as a non-colliding score display** → ✓
  **ACCEPTED.** Removal is what AC-1 asks for, it makes the catch unrepeatable (I confirmed by probe
  that two players on one egg yield exactly one award to one payee), and it is a faithful subset of
  `EGGWAK` for everything scoring-visible. Disclosing the missing presentation as a finding instead
  of inventing a score-display entity was the correct call for a 2-point story.


## Sm Assessment

*Written at the close of the setup phase.* · **Story:** jt8-4 (2pt, p1, joust, tdd) · **Branch:**
`feat/jt8-4-egg-collection`

### Story selection

`/pf-work sw8-8` was the request. It was **refused** — a-2 owns sw8-8 and is in Reviewer round 2
(see the SM Delivery Finding above for the full evidence chain). The user chose jt8-4 from the
alternatives offered. jt8-4 is the smallest p1 on the board, sits in an uncontended repo, and the
epic marks it explicitly INDEPENDENT of the jt8-1 → jt8-3 enemy chain, so it carries no dependency
risk while the star-wars fire path is frozen under a-2.

### Ground verified before setup

| Check | Result |
|---|---|
| `git branch -r \| grep jt8` in joust | **no** remote `jt8*` branches — nobody owns jt8-4 or jt8-3 |
| `gh pr list -R slabgorb/joust --state open` | empty |
| joust working tree | clean |
| joust `develop` vs `origin/develop` | was 13 behind → fast-forwarded to **0/0** before the branch was cut |
| sibling `.session/` sweep | a-1 = uf1-12 (since merged), a-2 = sw8-8. **jt8-4 held by nobody.** |

### Setup artifacts (independently verified, not taken from the subagent's report)

- `.session/jt8-4-session.md` — exists; phase pointer read `setup` on arrival (not left on `red`,
  the known `sm-setup` trap); Workflow Tracking sits above every assessment heading, which keeps
  `pf handoff` field inference working.
- `sprint/context/context-story-jt8-4.md` — 169 lines; all **4** acceptance criteria present
  verbatim with their ROM addresses intact; REUSE-FIRST framing at §14.
- `feat/jt8-4-egg-collection` — created and checked out in joust from a current `develop`.
- Story status — `sm-setup` left it at `backlog`; **SM stamped `in_progress`** and pushed the
  claim (`93e36f2` on `main`) so no sibling repeats the sw8-8 collision against me.

### The one thing that decides this story

It is **REUSE-FIRST**, and the story text is emphatic about it. The EGGVAL ladder
(250/500/750/1000 by hit count, capped, `:3097-3104`) and the +500 mid-air bonus (`PFEET==0`,
`:3063-3069`) **already exist and are already tested** in `egg.ts` (jt2-4). `game.ts` already
drains `reason:egg` to the correct player ledger (jt4-1). The only new code is: the player-vs-egg
catch pass in `collisionPass` (`demo.ts`), egg removal, and the AUTOFF remount cancel
(`:3078-3087`). **If the ladder or the air bonus gets re-implemented, the story has failed its own
premise** — that is the single most likely way this 2-pointer goes wrong.

ROM routines: PLYEGG `:3009`, EGGSCR `:3030-3095`. A radix-cited claims entry is required for both
(AC-4 also demands the purity guard + citations green) — follow the mechanism jt8-1/jt8-2 used.

### Handoff

**To TEA (Han Solo) for RED.** Design the failing tests for the catch pass — mid-air (ladder+500)
vs settled (ladder only), ledger attribution to the *catching* player not the partner, egg removal,
AUTOFF remount cancel, and the AC-4 seeded bit-for-bit score-event replay. AC-2 asks for
mutation-checking, so pin the ladder/bonus **through** `egg.ts`'s existing exports rather than
re-asserting their values. Confirm the joust green baseline as your first act and correct the
context file if 1787 is wrong (see my Question finding).
## Tea Assessment

**Tests Required:** Yes
**Story:** jt8-4 (2pt, p1, joust) · **Branch:** `feat/jt8-4-egg-collection` · RED complete

**Test Files:**
- `tests/demo-jt8-4.test.ts` — the behaviour suite: the catch pass, the ladder, the air bonus,
  attribution, the remount ordering, determinism, and one end-to-end run driven by a real seed and
  a held input. **12 tests.**
- `tests/demo-jt8-4-source.test.ts` — the provenance companion (double-entry): 12 vendored-source
  law re-derivations, 4 hand-written source assertions, 8 claim-coverage pins, 2 claim-quality
  pins, and the 4-test REUSE-FIRST block. **29 tests.**
- `tests/helpers/demo-contract.ts` — mirrored in `waveEgg` (jt4-5) and the score event's `player`
  (jt4-1); the contract had drifted behind `src`.
- `tests/game.test.ts` — one re-seat, deliberately neutral (see Design Deviations).

**Counts:** 41 tests added. **23 failing, 18 passing** (the 18 are green anchors, not accidents:
15 source-law re-derivations + 1 "no ladder literals" + 2 behavioural anchors).
**Verified baseline: 1787** — `--exclude "**/demo-jt8-4*"` gives exactly `1787 passed`, so SM's
open Question is answered and the context file needed no correction. Tree now 1828 total.
`npx tsc --noEmit` clean.

### The one thing Dev must not miss

The story says REUSE `eggScoreEvents`. **Don't** — not as the aggregate. It reads `egg.hitCount`,
which `spawnEgg` (egg.ts:142) and `settledWaveEgg` (demo.ts:498) both hard-code to 0 and nothing
writes back, so it can only ever pay 250. The ROM keeps the counter on the **catching player**:
`LDY PDECSN,U` → `LDY DEGGS,Y` → capped bump → `EGGSMN STB ,Y` (:3033-3053), with
`DEGGS RMB 2 EGG KILLED COUNTER` declared in the DECISION BLOCK at `ORG $0` (:101-113). Reuse the
PRIMITIVES (`bumpEggHits`, `eggValue`, `airCatchBonus`) and give the count a per-player home. The
ladder rungs 500/750/1000 have been dead code since jt2-4; this story is what brings them alive.

### Satisfiability probe (the jt8-2 lesson)

A red suite proves nothing about whether it CAN pass, so the contract was probed against a
throwaway ~30-line catch pass before handoff: **12/12 behaviour green, full suite 1814 passing**,
with only the claim-coverage pins outstanding (they need Dev's `JT84-*` entries — a deliverable,
not a defect). The contract pins one coherent machine.

Safety: `src/core/{demo,egg}.ts` copied to the scratchpad first, RED committed before probing
(`6ea320f`), restored from the copy (not `git checkout`), and verified md5-identical with
`git status src/` empty. Control run afterwards: 23 failing / 1805 passing — the red is back.

### Mutation table (AC-2 asks for mutation-checked; here it is)

Each mutation applied to the throwaway, one at a time, then reverted.

| # | Mutation | Reds |
|---|----------|------|
| M1 | counter read off the EGG (`ep.egg.hitCount`) — the naive REUSE reading | **3** (ladder climb, per-player independence, determinism) |
| M2 | always pay the air bonus (`airCatchBonus(0)`) | **4** (settled-only, ladder climb, per-player, determinism) |
| M3 | never pay the air bonus | **2** (mid-air, end-to-end) |
| M4 | score it but leave the egg in the process list | **3** (egg removed, scored-once, remount ordering) |
| M5 | emit the award with no `player` | **3** (per-player, P2 ledger, end-to-end) |
| M6 | uncapped bump (`n + 1` instead of `bumpEggHits(n)`) | **1** — and **zero** in the behaviour suite |
| M7 | ignore geometry, collect every egg on the board | **5** (distant-egg anchor, per-player, P2 ledger, uncaught-hatch anchor, end-to-end) |

**M6 is the interesting one.** It survived all 12 behaviour pins, because `eggValue` *also* clamps
its index (`Math.min(hitCount, LADDER.length)`, egg.ts:250) — so an uncapped counter drifts to
5, 6, 7… while every score it produces stays correct at 1000. The ROM writes the **pegged** value
back, so that is genuine divergence in stored state, invisible through today's only consumer. It is
the sidecar's own "is the out-of-range return distinguishable from a legitimate one?" trap. Closed
with the REUSE-FIRST block, which is the only instrument that can see it.

### Rule Coverage

| Rule / house law | Test(s) | Status |
|------------------|---------|--------|
| Every cited ROM range carries a committed claim | 8 × `a claim covers …` | failing (needs `JT84-*`) |
| Claims quote their line verbatim, re-checked against the vendored bytes | 2 × claim-quality | failing |
| Double entry: laws re-derive from the source independently of the port | 12 × `$file:$n carries …` + 4 hand-written | **passing** (the independent second entry) |
| Radix: JOUSTRV4.SRC is bare decimal, `$` hex | asserted in-suite (`#$7F` read as 127) | passing |
| `src/core` stays pure (no clock/entropy) | existing `purity-scanner` sweep | passing |
| REUSE-FIRST: no re-implemented ladder | 4 × REUSE block | failing (3) / passing (1) |
| No vacuous assertions | self-check below | — |

**Self-check:** every test carries a real `expect`; no `let _ =`, no bare `is_some`-style pins.
Two deliberate green anchors are documented as such. The determinism pin does **not** rest on
self-equality alone — a seeded PRNG makes that free, so it also asserts the sequence against
egg.ts's ladder, which a frozen sim that catches nothing would fail. One bug found and fixed in my
own suite during the probe: the counter-write regex was anchored `^\s*`, which matches nothing
against a 6809 label in column 1 — it would have passed while counting zero writes.

**Handoff:** To Dev (Yoda) for GREEN. Add the player-vs-egg pass to `collisionPass`, home the
DEGGS counter per player, route bump/rung/bonus through `egg.ts`, remove the caught egg (before the
hatch flatMap — the ordering is pinned), set `player` on the events, and commit the `JT84-*` claims
for :3009, :3021, :3033, :3037, :3053, :113, :3086-3087, :3092-3093 with verbatim source lines.
Do **not** touch `tests/game.test.ts` — its re-seat is intentional and neutral.
## Dev Assessment

**Implementation Complete:** Yes
**Story:** jt8-4 (2pt, p1, joust) · **Branch:** `feat/jt8-4-egg-collection` (pushed, `5b4c1d7`)

**Files Changed:**
- `joust/src/core/demo.ts` (+70/−2) — the player↔egg catch pass in `collisionPass`; `eggHits` on
  the player process (the `DEGGS` analogue); an `eggBox` broad-phase helper beside `entityBox`;
  three new imports from `egg.js`.
- `joust/docs/rom-study/claims/egg-catch.json` (new) — claims `JT84-001`..`010`.

**Tests:** **1828/1828 passing (GREEN)** — 73/73 files. That is the verified 1787 baseline plus this
story's 41, with **zero** collateral and no further sibling re-seats needed beyond TEA's one.
`npx tsc --noEmit` clean · `npm run build` clean · `node tools/audit/check-citations.mjs` →
"checked 876 claim(s) / all claims verified".

### What the pass does

A player overlapping an egg banks the EGGVAL rung for **its own** bumped count, plus the 500 mid-air
bonus while the egg has not yet bounced, both events naming the catcher so jt4-1's drain credits the
right ledger — as the ROM scores into `PDECSN,U` (:3060, and :3069 "IN PLAYERS WORKSPACE"). The egg
is removed.

**The counter rides the player, and that is the whole story.** `PDECSN,U → DEGGS,Y →` capped bump
`→ STB ,Y` (:3033-3053), with `DEGGS RMB 2 EGG KILLED COUNTER` declared in the DECISION BLOCK
(:113). `EggState.hitCount` could not serve: `spawnEgg` and `settledWaveEgg` both hard-code it to 0
and nothing writes back, so a ladder read off the egg pays 250 forever. **Rungs 500/750/1000 are
reachable in the running game for the first time since jt2-4.**

Every value still comes from `egg.ts` — `bumpEggHits` (the cap), `eggValue` (the rung),
`airCatchBonus` (the PFEET gate). No ladder literal enters `demo.ts`; the REUSE-FIRST block enforces
that mechanically, and it is the only guard that can see an uncapped bump (because `eggValue` clamps
its index too, so a runaway counter still scores 1000).

### Verified, not assumed

- **Wired end to end.** `main.ts:184` drives `stepGame` → `stepDemo` → `collisionPass`, and
  `main.ts:137` renders the digits. The integration test proves it with nothing but a seed and a held
  input: f145 the kill banks the DVALUE, f146 the egg banks rung + 500.
- **The optional field survives frames.** Checked every process rebuild site before relying on it —
  `frame.ts:263/291/296/302/307/359` and `demo.ts:891` are all spread-plus-override. This is the
  documented way a new optional process field silently dies; it does not die here, and the five-catch
  ladder walk is the standing guard.
- **Ordering.** The catch runs inside `collisionPass` (`stepDemo:974`), which precedes the wave-egg
  hatch (`:988-992`), so a collected rider gets no remount bird — this port's reachable form of
  AUTOFF. The companion anchor confirms an UNcaught settled wave egg still hatches, so jt4-5's
  self-clear is intact.
- **Claims cannot drift.** `egg-catch.json` was generated by reading the cited lines out of
  `JOUSTRV4.SRC`, because the gate compares verbatims byte-exactly including tabs.

Two deviations logged (counter homed on the process rather than `DemoSim`; removal rather than the
ROM's non-colliding score-display egg) and three Delivery Findings, the substantive one being that a
collected egg now vanishes with no on-screen acknowledgement of which rung was scored — which
matters more now that the rungs actually escalate.

**Handoff:** To Reviewer (Obi-Wan). Worth your attention: the counter's placement is the one
judgement call here — it is faithful to the decision block but it resets when a player process is
replaced, and TEA's open question about the ROM's own DEGGS reset scope is unresolved and out of
scope. Do **not** "fix" `tests/game.test.ts`; its re-seat is intentional and neutral.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; all Dev numbers reproduced exactly | N/A — corroborates |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 violation / 22 rules / 61 instances | confirmed 1, dismissed 0, deferred 0, **challenged 1 non-finding** |

**All received:** Yes (2 enabled returned, 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed (2 MEDIUM, 2 LOW), 0 dismissed, 0 deferred, 1 subagent *non*-finding challenged and upgraded.

### Preflight — every Dev number reproduced independently

| Claim | Dev said | Preflight measured |
|---|---|---|
| pre-story baseline | 1787 | **1787** (71 files) |
| full suite | 1828/1828, 73 files | **1828/1828, 73 files** |
| new tests | 41 | **41** (2 files in isolation) |
| `tsc --noEmit` | clean | clean, exit 0 |
| `npm run build` | clean | clean, exit 0 |
| claims | 876 verified | **876, all verified** |
| debug leftovers | none | 0 console.log / debugger / TODO / `.only` / `.skip` |

It also confirmed the run SCOPE (`find tests -name '*.test.ts'` → 73, matching vitest's file count), so the "no collateral" claim covers the whole suite, and that the `skipIf(!vendoredAvailable)` blocks actually RAN here — the byte-level citation checks genuinely executed rather than silently skipping.

### Challenged: the rule-checker downgraded my respawn finding to "open question" — I disagree, with evidence

The rule-checker's item 18 note reads: *"the vendored source gives no visible evidence either way about whether the ROM's DEGGS should survive a respawn, so it's flagged as an open provenance question rather than a defect."* Its method was sound (grep `DEGGS` → 2 hits: the declaration and the EGGSCR read/write) but the inference is not: **absence of a clear-on-respawn instruction is evidence the counter is NOT cleared, not evidence of ignorance.**

And there is positive evidence it did not weigh — the contents of the block `DEGGS` lives in (JOUSTRV4.SRC:101-116):

```
	DECISION BLOCK
	ORG	$0
DSCORE	RMB	2	SCORE RAM LOCATION      <- :106
DCRE	RMB	2	DECISION TO BE RECREATED BY WHOM   <- :111
DEGGS	RMB	2	EGG KILLED COUNTER      <- :113
```

`DSCORE` — the player's score pointer — is in the **same block**. A player's score plainly survives their own death; nobody loses their score for losing a life. So the block survives a death. And `DCRE`, "DECISION TO BE RECREATED BY WHOM", is the block carrying its own re-creation wiring, which makes it the persistent per-player identity rather than per-life scratch. `DEGGS` therefore survives a mount death in the ROM. Ours does not.

**Ruling: upgraded from "open provenance question" to a confirmed MEDIUM divergence** (finding R-1). This also closes the question TEA logged as unresolved — in the death direction. The *wave*/game-reset direction remains genuinely open; I did not chase the decision-block initialiser.

## Reviewer Assessment

**Verdict:** APPROVED
**Story:** jt8-4 (2pt, p1, joust) · **Branch:** `feat/jt8-4-egg-collection` (`5b4c1d7`)
**Suite:** 1828/1828, 73/73 files · `tsc` clean · `vite build` clean · 876 claims byte-verified
**Findings:** 2 MEDIUM, 3 LOW/Improvement — **no Critical, no High**

**Data flow traced:** keyboard `dir/flap` (`main.ts:184`) → `stepGame(inputs)` → `stepDemo` →
`collisionPass` (`demo.ts:895-912`) → `{kind:'score', reason:'egg', player}` → `stepGame`'s
freshness diff (`game.ts:379-384`, identity-based, my events are fresh literals so each counts once)
→ `creditScoreEvents` → `players[ledgerIndex(player)]` → digits at `main.ts:137`. Safe because the
award names its payee explicitly; the `?? PLAYER1_ID` fallback at `game.ts:383` is never reached by
this path, which is what makes P2's catch land on P2's ledger. Verified end-to-end by a seeded run,
not by reading.

**Pattern observed:** the egg pass mirrors the ptero pass directly above it (`demo.ts:853-875`) —
same list-filter/`removed`-set/`events`-push shape — which is why it reads as belonging to the file.
The one place it diverges from its neighbours is the missing narrow phase (finding R-2).

**Error handling:** no error surface introduced — no I/O, no parsing, no async, no `try/catch`. The
defensive paths that matter are guards, and all are present: `!ep.egg` (`:899`) skips a malformed egg
process, `!catcher` (`:901`) skips a player with no entity, `removed.has` guards both sides
(`:896`, `:899`), and `livePlayers` excludes a materialising player (`collisionEnabled !== false`,
`:847-849`) so an invulnerable knight cannot vacuum eggs — faithful, since PID bit 7 is clear during
the window.

### Rule Compliance

Enumerated against `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) plus this project's
own laws. Every function/type/field added by the diff, not one exemplar per rule.

| Rule | Instances judged | Verdict |
|------|------------------|---------|
| #1 type-safety escapes | `eggBox`, the egg block, both new test files | compliant — no `as any`, no `as unknown as`, no `@ts-ignore`, no new `!`. Tests narrow with `Extract<…>` type predicates rather than casts. (`demo.ts:859`'s `pt.entity!` is pre-existing jt3-4 code, untouched.) |
| #2 generic/interface | `eggBox(e: EggState)`, `player?: number` on the event union | compliant — specific types; the optional field is a precise addition, not a `Partial<T>` loosening |
| #3 enums | none added; `kind` remains the pre-existing `string` discriminant | not applicable |
| #4 null/undefined | `self.eggHits ?? 0` (`:904`), `caught.get(…) ?? pl` (`:897`), `caught.get(…) ?? p` (`:918`), `s.player ?? PLAYER1_ID` (`game.ts:383`) | compliant — `??` throughout, which is *required* here: `eggHits === 0` is a legitimate value that `||` would have silently re-bumped |
| #5 module/declaration | 9 relative imports added across 3 files | compliant — every one carries `.js`; type-only imports use the inline `type` modifier |
| #6 React/JSX | no `.tsx` in this repo | not applicable |
| #7 async | `collisionPass`/`eggBox` synchronous; test bodies await the established contract loaders | not applicable / compliant |
| #8 test quality | both new suites | compliant — no `as any`, no `dist/` imports, no `.only`/`.skip`; the two `skipIf(!vendoredAvailable)` gates are the jt1-3 degradation pattern and confirmed *non*-skipping here |
| #9 build/config | no config touched | not applicable |
| #10 input validation | `JSON.parse(...) as Claim \| Claim[]` in the source suite | compliant by precedent — reads a repo-committed dossier, not user input, and the same shape appears in ~15 existing `*-source.test.ts` files; every field is runtime-asserted in the same file |
| #11 error handling | no `try/catch`, no `Result` | not applicable |
| #12 performance | egg loop is O(players × processes), same order as its neighbours | compliant |
| #13 fix regressions | greenfield, not a fix diff | not applicable |
| **core/shell purity** | `demo.ts` new hunks | compliant — no clock, no entropy, no browser surface, no `src/shell` import; the AST scanner sweeps `src/core/` and passes with these hunks in place |
| **determinism / no mutation** | the egg block | compliant — `{ ...self, eggHits }` rebuilds; `pl`, `processes` and its elements are never mutated; `events`/`removed`/`caught` are locals |
| **no invented constants** | 10 `JT84-*` claims; zero new numerics in `demo.ts` | compliant — every verbatim byte-exact (tabs included) against the vendored source, ids unique across all 876 |
| **optional-field survival** | 9 rebuild sites in `frame.ts` + `demo.ts` | compliant — all spread-plus-override; proven by mutation (breaking `frame.ts:373` reddens 5/12) |

### Observations

1. `[MEDIUM]` **R-1 — the ladder resets on death** at `src/core/demo.ts:333` + `:904`. Reproduced
   1000 → 250 across a respawn. The ROM's `DEGGS` shares its block with `DSCORE`, which survives a
   death. Upgraded from the rule-checker's "open question" on block-layout evidence.
2. `[MEDIUM]` **R-2 — the catch skips the narrow phase** at `src/core/demo.ts:902`. `CEGGUP` and its
   three siblings are transcribed, anchored and named by `ENTITY_RECORDS.EGGI`, but
   `collisionMaskFor` returns null for eggs, so vertical reach is 16 px vs the mask's 7 scanlines.
3. `[RULE]` `[LOW]` **R-3 — three identical box builders** at `src/core/demo.ts:732/737/742`. The
   rule-checker's sole violation across 22 rules / 61 instances; jt8-4 extended a 2-way duplicate to
   3-way.
4. `[LOW]` **R-4 — unreachable defensiveness** at `src/core/demo.ts:897`: `caught.get(pl.id) ?? pl`
   can only yield `pl`, since ids are unique and the map starts empty each call.
5. `[LOW]` **R-5 — same-frame per-player independence is unpinned.** It works (probed), but only the
   sequential-frame case is in `tests/`.
6. `[VERIFIED]` **No double-collection is possible.** `removed.add(ep.id)` fires on catch (`:910`)
   and every later visit is guarded by `removed.has(ep.id)` (`:899`). Executed: two players on one
   egg → exactly one award `[[250,1]]`, one payee. Deterministic by process-id order.
7. `[VERIFIED]` **Two catches in one frame accumulate correctly.** `self` persists across the inner
   loop rather than being re-fetched, so the second catch sees the first bump. Executed: `[250,500]`.
8. `[VERIFIED]` **The re-seated sibling guard still bites.** I dropped `!prior.has(e)` in `game.ts`
   and the re-seated dedupe test failed (1/16); restored md5-identical. The re-seat removed staleness,
   not teeth.
9. `[VERIFIED]` **Every Dev number is real.** Preflight reproduced 1787 / 1828 / 73 files / 41 new /
   876 claims independently, and confirmed the run scope was the full suite rather than a subset.
10. `[VERIFIED]` **An egg created this frame cannot be collected this frame.** The pass iterates
    `processes`, not `spawned`, so a kill-egg becomes collectable next frame — matching the ROM's
    nap-before-first-step process model, and exactly what the f145/f146 integration test shows.

### Devil's Advocate

Suppose this is broken. The strongest attack is on the `caught` map, because it is the one piece of
mutable bookkeeping in an otherwise pure function, and it is read twice — once per outer iteration and
once in the final `map`. If the map ever held a stale player, the final `map` would reinstate a
process whose `eggHits` had been rolled back, silently un-bumping a rung the player was already paid
for. Walk it: `self` is reassigned before every `caught.set`, so the map always holds the latest; the
final `map` runs after both loops complete; and because `livePlayers` has one entry per unique id, no
outer iteration can overwrite another's entry. I probed the two-egg case and got `250,500` — the
second catch saw the first bump. So the aliasing holds, and the rule-checker reached the same
conclusion independently.

Second attack: ordering. `livePlayers` is computed *before* the joust and ptero loops run, so it is a
stale snapshot by the time the egg pass reads it. Could a corpse collect an egg? The guard is
`removed.has(pl.id)`, and `removed` is the shared mutable set both earlier phases write into
synchronously — so a player killed by a bounder or a ptero this frame is excluded. Single-threaded
execution guarantees the ordering. But note what the snapshot *does* let through: it cannot see a
player *added* mid-frame, which is fine, because respawns are appended later in `game.ts`.

Third: a confused player. With R-2, an egg can be collected from up to a bird's height away — the
player will read that as the egg leaping into their hand, and in a clone whose whole premise is
faithfulness that is a real (if bounded) wrongness. With R-1, a player who dies mid-wave quietly
loses their ladder progress and the next egg pays 250 instead of 750; nothing on screen explains it,
and Dev's own finding notes there is no rung feedback at all now. Neither corrupts state, but both are
felt.

Fourth: hostile input. There is none — no strings, no parsing, no network, no filesystem in this
path; the only inputs are `dir`/`flap` booleans. `posY >> 8` is 32-bit-truncating, so an absurd
`posY` would misbehave, but every egg originates from `spawnEgg` (a victim's position) or
`settledWaveEgg` (a pad), both bounded, and `entityBox` has used the identical shift since jt2-7. No
new escape.

What survives the interrogation is R-1 and R-2 — both real, both bounded, neither a correctness break
in scoring, attribution, cap, bonus, ordering, purity or determinism.

### Why APPROVED and not REJECTED

No Critical or High, and both MEDIUMs fail the "fix it here" test for the same reason: each needs a
change strictly larger than the story that surfaced it. R-1 requires relocating the counter across the
core/session seam so it outlives a process while staying readable at emit time. R-2 requires modelling
egg orientation before a mask variant can honestly be chosen — the ROM has four, `EggState` has no
frame field, and hardcoding `CEGGUP` would trade one unfaithfulness for another. Blocking a 2-point
story to force either would produce a worse partial fix, so both are filed with their evidence and
provenance so the follow-ups are trivially spec'd. Every AC as written is met, and the mechanism is
correct everywhere it was specified.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story. Recommend filing R-1 and R-2 as jt8
backlog stories — R-1 carries a resolved ROM ruling and a reproduction, R-2 carries the mask-variant
question that must be answered first. Do not merge on my behalf; PR creation and merge are yours.