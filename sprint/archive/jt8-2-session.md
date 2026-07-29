---
story_id: "jt8-2"
jira_key: "jt8-2"
epic: "jt8"
workflow: "tdd"
---
# Story jt8-2: Enemy horizontal homing — PFACE nudge toward the target (copy X-vel dir, throttled plus periodic flip)

## Story Details
- **ID:** jt8-2
- **Jira Key:** jt8-2
- **Workflow:** tdd
- **Stack Parent:** jt8-1 (target aggro subsystem TARPLY/TARTM)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-29T00:01:14Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-28T21:38:35+00:00 | 2026-07-28T21:40:38Z | 2m 3s |
| red | 2026-07-28T21:40:38Z | 2026-07-28T22:11:59Z | 31m 21s |
| green | 2026-07-28T22:11:59Z | 2026-07-28T22:18:52Z | 6m 53s |
| review | 2026-07-28T22:18:52Z | 2026-07-28T22:33:04Z | 14m 12s |
| red | 2026-07-28T22:33:04Z | 2026-07-28T23:27:34Z | 54m 30s |
| green | 2026-07-28T23:27:34Z | 2026-07-28T23:34:27Z | 6m 53s |
| review | 2026-07-28T23:34:27Z | 2026-07-29T00:01:14Z | 26m 47s |
| finish | 2026-07-29T00:01:14Z | - | - |

## Impact Summary

> Rebuilt BY HAND at finish. `pf sprint story finish` wrote no Impact Summary at all — not even
> the "No upstream effects noted" placeholder the known word-wrap regex bug produces. Sourced from
> the 17 Delivery Findings below and cross-checked against the finish preflight's own enumeration.

**Routed to a named story — these are commitments, not notes:**

| → | What it inherits |
|---|---|
| **uf1-9** (decision timers) | **(1)** The `PPVELX` freeze. `BOLEVB` compares against a SNAPSHOT taken at the `BOLEV` boundary (:3907-3908); jt8-2 compares the target's LIVE index because the `BOLETM` timer is uf1-9's. Add `ppvelx` to `HomingState`, freeze it at the decision boundary, repoint the comparison. **(2)** Expect this to RAISE the reversal rate, not just improve fidelity — measured on the shipped build, an enemy reverses ONCE per lifetime, because a live moving target is far harder to match than a frozen number. Re-measure after the freeze. **(3)** The level-flight GATE: `homingWake` currently runs on EVERY wake, where the ROM reaches `BOLEVB` only from level flight (`BODN2A`/`BOUP2A` → `BODIRL` → `BODIR` :3840,:3899,:3870-3876; lava → `BODIR3` :3956). Disclosed, not fixed here — the gate is uf1-9's state machine. |
| **jt8-3** (hunter/shadow aiming) | **(1)** The toward-the-target steering the jt8-2 ACs *described* but the ROM puts elsewhere: `B2DIR`'s `CLR PFACE,U  FACE RIGHT` / `STA PFACE,U  FACE LEFT` (:4122/:4141) and `SHDIR`'s pair (:4353/:4372). Scope unchanged, no work moved. **(2)** Copy `homing-wiring.test.ts` AC-4 — the in-play guard — and read its round-2 comments first: they record which parts of the fixture are load-bearing and which are decoration. **(3)** `loadClaims`/`claimCovers` reach 3× duplication at this story; extract to `tests/helpers/` then, not before. |

**Corrections owed to documents, not code:**

- `sprint/context/context-story-jt8-2.md` (AC-1, AC-3) and `joust/docs/superpowers/specs/2026-07-28-joust-playability-design.md` ("Horizontal homing"): both describe a facing "nudged TOWARD the target" and a bounder "closing horizontal distance on a stationary target". The ROM does neither — `BOLEVB` is a velocity-MATCHED periodic REVERSAL. The epic's OUTCOME sentence stands; only the stated mechanism is wrong.
- `joust/docs/rom-study/claims/README.md`: the citation checker verifies file/line/verbatim and **never reads claim prose**. Round 1 shipped two byte-green claims whose prose asserted the thing that made the feature inert, and round 2's review found three more overstatements. Worth a line saying prose is hand-verified or not verified at all.
- `sprint/context/context-epic-jt8.md`: a finding that says "a value this port never receives" is not low-value by default. jt8-2's own TEA recorded that observation accurately in round 1 and rated it a backlog note; a 20-line probe turned it into the blocking [HIGH]. Measure before rating.

**Unowned observations — real, small, no story yet:**

- The port models no `SEEKE` flight at all: `remountEnemyProcess` collapses hatch → seek → mount into one already-mounted enemy. Two consequences: the `SEEKFS` short-range flag has no home as a *mechanic* (only as the seed jt8-2 pins), and remounts arise ONLY on egg waves, because a DEATH3 kill-egg keeps its jt2-4 lifecycle and never hatches. Affects `demo.ts`, `egg.ts`.
- The port's mounted bird is born DUMB where the ROM's is born SMART. `MOUNRI` promotes outright at mount (`INC NSMART` :3669, `INC PCHASE,U` :3676, `DSMART` install :3693) with no budget check; `remountEnemyProcess` creates `pchase: 0, brain: 'linet'` and waits for `frame.ts`'s budget-gated `promote()`. So the port now models mounted-ness for one workspace byte and not the other. Pre-existing (jt4-5), surfaced by this story's premise. Belongs to whoever next touches the remount path.
- The ROM leaves a TRANSPORTER-entered enemy's `PRDIR` genuinely UNDEFINED — `CUPROC` writes only PLINK/PNAP/PPC/PID/PPRI (SYSTEM.SRC:387-404) and clears nothing; `WCREATE` clears PCHASE only (:2201); `LNTSMT` never writes it (:3764-3775). jt8-2 unifies on the one DEFINED mounted value rather than modelling recycled RAM. Recorded so no later story re-derives the wrong seed from :3255.

**Already discharged in this story — listed so nobody re-opens them:** the `viewFor` funnel in
`target.ts` (four `PlayerView` construction sites collapsed to one), and all eleven round-1 plus
seven round-2 review findings.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): jt8-2's ACs and the epic design spec describe the bounder's
  horizontal homing as a facing "nudged TOWARD the target", with an AC requiring "a seeded run
  shows a smart enemy closing horizontal distance on a stationary target" — but the cited ROM
  lines do the opposite. `BOLEVB` (JOUSTRV4.SRC:3939-3946) compares the enemy's OWN FLYX index
  against its target's and, on a MATCH, eventually does `COM PFACE,U` ("TRY THE OTHER
  DIRECTION"). Against a stationary target (index 0) a buzzard saturated at ±8 never matches and
  never turns. Across the whole BOUNDR brain (:3787-3946) the ONLY write to PFACE is that one
  `COM`; the toward-the-target writes (`CLR PFACE,U  FACE RIGHT` / `STA PFACE,U  FACE LEFT`)
  first appear at :4122/:4141 inside `B2DIR` — the hunter's cliff look-ahead, which the same
  design spec assigns to **jt8-3**. Affects `sprint/context/context-story-jt8-2.md` (AC-1 and
  AC-3 wording) and `joust/docs/superpowers/specs/2026-07-28-joust-playability-design.md`
  (the "Horizontal homing" paragraph). The epic's OUTCOME sentence stands — a velocity-matched
  reversal is exactly the anti-orbit mechanism — only the stated mechanism is wrong.
  *Found by TEA during test design.*

- **Gap** (non-blocking): `PPVELX` ("OLD PLAYERS X VELOCITY", RAMDEF.SRC:209) cannot be honestly
  modelled by this story. It is written in exactly ONE place — `BOLEV` :3907-3908, on entry to a
  level-flight episode timed by `BOLETM` :3909 — and `BOLEVB` only ever reads it. The BOLETM
  decision timer is **uf1-9's** ("the DECISION timer BOLETM :3909, HULETM :4060, SHLETM :4316
  …"; that story records that the buzzard "has no … 'time until next decision' timer at all").
  jt8-2 therefore compares the target's LIVE velocity index. Affects `joust/src/core/enemy.ts`
  (uf1-9 should add `ppvelx` to `HomingState`, freeze it at the decision boundary, and point the
  `homingWake` comparison at the frozen value instead of the live one). Behavioural difference:
  the ROM compares an index up to BOLETM (~21 at GA1-5) wakes old, so the two diverge only when
  the target changes speed mid-episode. *Found by TEA during test design.*

- **Improvement** (non-blocking): `BOLETM`'s normal-difficulty value is doubly attested and worth
  recording before uf1-9 picks it up — the DYTBL row's GA1-tier-1 start is `$0015` = 21
  (JOUSTRV4.SRC:7316, already committed and byte-gated in `joust/src/core/difficulty.ts`) and the
  consuming line's own inline comment reads `#20+1` (:3909). The two agree, which is the same
  free wave-1 correctness check uf1-2 used. Affects `joust/src/core/difficulty.ts` (no change —
  the row is already there; this is a note so uf1-9 does not re-derive it).
  *Found by TEA during test design.*

- **Question** (non-blocking): `PRDIR` is REUSED by the remount bird before the brain ever runs —
  `SEEKFS` sets it to 1 as a "CAME WITHIN SHORT RANGE SENSORS" flag (:3584-3585), and the egg
  hatch-show stores a table POINTER across `PRDIR`/`PPVELX` together (:3291,:3295). So a real
  buzzard can enter its brain with a non-zero counter and flip on its very first matched wake
  rather than after 129. jt8-2 pins the LAW (any positive counter flips immediately — see the
  `stepEnemy CARRIES the homing workspace` test) but does not port the reuse, since neither the
  remount SEEKE flight nor the hatch show models these bytes. Affects `joust/src/core/enemy.ts`
  and `joust/src/core/egg.ts`. Low value — worth a backlog note, not a story.
  *Found by TEA during test design.*

- **Gap** (non-blocking): the ROM's PRDIR for a TRANSPORTER-entered enemy is genuinely
  UNDEFINED, not zero — `CUPROC` (SYSTEM.SRC:387-404) initialises only PLINK/PNAP/PPC/PID/PPRI,
  so a created process inherits its predecessor's bytes; `WCREATE` clears PCHASE and nothing else
  (:2201); and `LNTSMT` (:3764-3775) promotes LINET → smart without touching PRDIR. That is why
  Williams clears the fields it cares about ONE AT A TIME at each creation site. jt8-2 unifies on
  the one DEFINED mounted value (SEEKFS = 1) rather than modelling recycled RAM — see the Design
  Deviation. Affects `joust/src/core/enemy.ts` (no change owed; this is the reasoning any later
  story should inherit instead of re-deriving it from :3255). *Found by TEA during test design.*

- **Gap** (non-blocking): this port has no `SEEKE` flight at all. `remountEnemyProcess`
  (`demo.ts:531`) collapses hatch → seek → mount into a single already-mounted enemy, so the
  riderless bird that :3255 describes — the one that flies at the man, sets the short-range flag,
  and only then acquires a rider — is unmodelled. Two consequences worth a backlog note: the
  `SEEKFS` short-range flag has no natural home as a *mechanic* (only as the seed jt8-2 pins),
  and remounts arise ONLY on egg waves, because a DEATH3 kill-egg still keeps its jt2-4 lifecycle
  and never hatches. Affects `joust/src/core/demo.ts`, `joust/src/core/egg.ts`. *Found by TEA
  during test design.*

- **Improvement** (non-blocking): the Reviewer's suggested "the feature fires in play" helper is
  now written concretely as `AC-4` in `tests/homing-wiring.test.ts` — seeded demo, ordinary
  frame-derived input, assert the mechanism is OBSERVED at least once, plus a control that
  re-stages the broken value and observes zero. It is deliberately self-contained so jt8-3 can
  copy it verbatim; extracting it to `tests/helpers/` is worth doing once a SECOND story has one,
  and not before (the same rule the orchestrator applies to `arcade-shared`). Affects
  `joust/tests/helpers/` (a later extraction, together with the `loadClaims`/`claimCovers`
  duplication the Reviewer flagged — both are now 2× and will be 3× at jt8-3). *Found by TEA
  during test design.*

- **Question** (non-blocking): jt8-2's own round-1 Question ("PRDIR is REUSED by the remount bird
  … Low value — worth a backlog note, not a story") was the finding that became the [HIGH]. The
  observation was correct and the RATING was a guess; one 20-line probe converted it. Worth
  carrying into the epic as a rule rather than a note: a finding that says "a value this port
  never receives" is not low-value by default — measure what the mechanism actually receives in a
  running game before rating it. Affects `sprint/context/context-epic-jt8.md` (a line in the
  epic's test guidance). *Found by TEA during test design.*

- **Conflict** (non-blocking, ROUTING ONLY): the Reviewer's M1 — `homingWake` runs on every wake
  where the ROM reaches `BOLEVB` only from level flight (`BODN2A`/`BOUP2A` → `BODIRL` → `BODIR`
  :3840,:3899,:3870-3876; the lava states → `BODIR3` :3956) — is disclosed and NOT fixed here.
  The gate is the `BOLEV`/`BOLETM` state machine uf1-9 owns by name, and building it would
  re-baseline demo replays outside this scope. Affects `joust/src/core/enemy.ts` (uf1-9 moves the
  `homingWake` call behind the level-flight state). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): `src/core/target.ts` had FOUR separate places building a
  `PlayerView` literal (`viewOf` plus three branches of `nearer`), so adding one field meant
  editing four sites and any miss would compile cleanly while dropping the field on one selection
  path only — a silent half-wiring reachable solely in the both-players-targetable case. GREEN
  funnelled them all through a single `viewFor(p)`. Affects `joust/src/core/target.ts` (done
  here; noted because the same shape may exist wherever a struct is rebuilt per-branch).
  *Found by Dev during implementation.*

- **Question** (non-blocking): a claim whose text merely CROSS-REFERENCES a derived value trips
  TEA's `every`-style claim gate. `JT82-017` cites `CLR PRDIR,Y` (:3255) and originally said the
  zero "is the starting point the 129-wake cadence is derived from" — true, but it made the claim
  match a filter meant to find the ONE claim that states the cadence, and that filter requires
  every match to be anchored on :3942-3944. Reworded to assert only what its own line carries.
  The gate is right and I would not loosen it; worth knowing that claim text should state its own
  line's fact and not import a neighbour's conclusion. Affects
  `joust/docs/rom-study/claims/homing.json`. *Found by Dev during implementation.*

- **Gap** (non-blocking, ROUND 2, IMPORTANT FOR uf1-9): the flip now fires, but the RATE is
  understated relative to the ROM, and the reason is the `ppvelx` Gap above. Measured on the
  shipped build: **1 reversal per enemy** in a 6,000-frame seeded run under ordinary input (frame
  93, both seeds, 1 of 3 enemies) — the first flip is the mounted seed, and the 129 matched wakes
  the SECOND one costs are never accumulated. That is faithful to the port as built, but the ROM
  should match more often than we do: `BOLEVB` compares the enemy's live index against
  `PPVELX` — a SNAPSHOT of the player's velocity frozen at the last `BOLEV` decision
  (:3907-3908, every ~21 frames at GA1-5). A climbing enemy accelerating toward a fixed target
  number matches far more readily than one chasing a live, moving one. So uf1-9's freeze is not
  only a fidelity fix — it should visibly raise the reversal rate, and jt8's "enemies still orbit"
  complaint is only PARTLY answered until it lands (the rest is jt8-3's `B2DIR`/`SHDIR` aiming).
  Affects `joust/src/core/enemy.ts` (uf1-9: add `ppvelx` to `HomingState`, freeze it at the
  `BOLETM` boundary, point the comparison at it — and re-measure the rate). *Found by Dev during
  implementation.*

- **Improvement** (non-blocking, ROUND 2): the citation checker verifies SOURCE and VERBATIM only
  and never reads claim prose — `claims/README.md` says so, and jt1-10 is the canonical instance.
  Round 1 shipped TWO byte-green claims (`JT82-008`, `JT82-017`) whose PROSE asserted the very
  thing that made the feature inert, and nothing in the pipeline could see it. The reviewer's
  independent full-diff of the TS against the ROM is currently the only defence. Worth considering
  for the epic: when a story CORRECTS a mechanism, the claims it previously wrote about that
  mechanism are prime suspects and should be re-read, not just added to. Affects
  `joust/docs/rom-study/claims/README.md` (a line under "Why some source lines carry TWO claims").
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): the horizontal-homing flip never fires in a real game. `PRDIR` is seeded at 0
  for every enemy, so a flip needs 129 velocity-matched wakes; measured over 20,000 frames on two
  seeds, enemies accumulate 10-51 matched wakes in a whole lifetime and then die and respawn at 0 —
  **zero flips** with idle players and zero with realistic drifting input (2-3 only under a
  degenerate best case with both sticks pinned so velocity saturates permanently). The ROM does not
  have this problem: `PRDIR` is dual-purpose and `SEEKFS` sets it to 1 (:3584-3585) during the
  remount flight that every mounted buzzard completes, so a real buzzard reverses on its FIRST
  matched wake. Affects `joust/src/core/enemy.ts` (`seedHoming`) and `joust/src/core/demo.ts`
  (`remountEnemyProcess` — the port already models the hatch→remount path this ROM region governs,
  cited EGGLND/EGGMAN :3239-3279, so the value has a natural home). *Found by Reviewer during code
  review.*

- **Improvement** (non-blocking): the epic's own framing is that jt8 exists because features are
  "built, tested, cited, and never reach the running game". The suites here are strong but every
  one of them either PRIMES the counter (`prdir: 0x80` / `prdir: 5`) or drives 129 synthetic wakes —
  none observes the value production actually produces, which is exactly why H1 shipped green. A
  cheap standing guard for this epic: one test that runs a seeded demo for N frames with ordinary
  input and asserts the mechanism under test is OBSERVED at least once. Affects
  `joust/tests/` (a shared "the feature fires in play" helper). *Found by Reviewer during code
  review.*

- **Question** (non-blocking): `tests/homing-source.test.ts`'s `loadClaims`/`claimCovers` are copied
  verbatim from jt8-1's `tests/target-source.test.ts`, carrying its `JSON.parse(...) as Claim |
  Claim[]` and mutable-array parameter with them. The duplication is now 2x and will be 3x at
  jt8-3. Worth extracting to `tests/helpers/` once rather than re-copying. Affects
  `joust/tests/target-source.test.ts`, `joust/tests/homing-source.test.ts`. *Found by Reviewer
  during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The suite pins a velocity-matched REVERSAL, not a toward-the-target nudge**
  - Spec source: context-story-jt8-2.md, AC-1 and AC-3
  - Spec text: "A smart enemy horizontally offset from its target updates PFACE **toward the
    target**"; "a seeded run shows a smart enemy **closing horizontal distance on a stationary
    target**"
  - Implementation: `tests/homing.test.ts` pins `BOLEVB` as read: a wake counts only when the
    enemy's own FLYX index EQUALS its target's, and the flip is `COM PFACE,U` — a complement, not
    a steer. AC-3's stationary-target closing test is replaced by the ROM-true observable pair
    (matched ⇒ reverses on the cadence / mismatched ⇒ never reverses), plus a negative-claim test
    that enumerates every PFACE write in :3787-3946 and asserts there is exactly one.
  - Rationale: the ROM outranks the story prose (the cp2-15 precedent). Writing AC-3's stationary
    -target test would have baked in behaviour the machine does not have and rejected the
    faithful fix; the aiming code the AC describes is `B2DIR`/`SHDIR`, which the design spec
    itself assigns to jt8-3.
  - Severity: major
  - Forward impact: jt8-3 inherits the toward-the-target steering unchanged (no scope moves). The
    story context and the design spec's "Horizontal homing" paragraph should be corrected — filed
    as the Conflict finding above.
  - → ✓ **ACCEPTED by Reviewer**: independently verified. Enumerated every PFACE write in the
    BOUNDR brain (:3787-3946) — exactly one, the `COM` at :3945 — and confirmed the aiming writes
    (`CLR PFACE,U  FACE RIGHT` / `STA PFACE,U  FACE LEFT`) first appear at :4122/:4141 inside
    B2DIR, which epic-jt8.yaml assigns to jt8-3. Pinning the ROM over the AC prose was correct.

- **`HomingState` models `PRDIR` only — no `ppvelx` snapshot field**
  - Spec source: context-story-jt8-2.md, story description
  - Spec text: "PFACE is nudged toward the target by copying the targeted player X-velocity
    DIRECTION (BOLEV LDA PVELX,X :3907)"
  - Implementation: the comparison uses the target's LIVE `velXIndex`; no snapshot byte is
    carried. Every homing test holds the target's index CONSTANT across its measured window, so
    the suite stays green under uf1-9's episode-scoped freeze.
  - Rationale: `PPVELX` is written only at `BOLEV` (:3907-3908), on a decision boundary timed by
    `BOLETM` (:3909) that belongs to uf1-9. With no boundary in scope there is no honest moment
    to take a snapshot; a carried-but-never-written field reads as modelled while being inert.
    Discovered by probing the contract with a throwaway implementation — the first draft asserted
    both "the workspace stays at its seed" and "the gate reads the target's index", which no
    implementation can satisfy at once.
  - Severity: minor
  - Forward impact: uf1-9 adds `ppvelx` and repoints the comparison. The divergence until then is
    bounded and named in the Gap finding above.
  - → ✓ **ACCEPTED by Reviewer**: verified that `STA PPVELX,U` occurs at :3908 only, and that
    `BOLEVB` reads it without ever writing it. Omitting an unwritable field is the right call, and
    the every-test-holds-velocity-constant discipline genuinely keeps the suite valid under
    uf1-9's freeze.

- **The decision timer (`BOLETM`) and the wing cadence (`PJOYT`) are NOT built here**
  - Spec source: context-story-jt8-2.md, story description
  - Spec text: "THROTTLED (DO NOT COPY PLAYERS MOVES TOO OFTEN, :3939)"
  - Implementation: the throttle is modelled as the `PRDIR` counter alone — which is what the
    quoted comment actually sits on (:3939 is the `LDA PPVELX,U` of the compare/count block). No
    `BOLETM` timer and no `PJOYT` wing-hold timer are introduced.
  - Rationale: uf1-9 owns all five "TIME UNTIL NEXT DECISION" rows and the four wing-cadence
    rows by name, and warns that the wing timer "changes the shape of enemy flight, so expect a
    real determinism blast radius". Building either here would collide with that story and
    re-baseline demo replays for a reason outside this scope.
  - Severity: minor
  - Forward impact: none for jt8-2. uf1-9 is unblocked and unchanged.
  - → ✓ **ACCEPTED by Reviewer** as far as it goes — but INCOMPLETE. Not building the timer has a
    behavioural consequence neither TEA nor Dev stated: without the BOLEV level-flight state the
    throttle runs on EVERY wake, and in the ROM `BOLEVB` is unreachable from the up-seek, down-seek
    and lava states (`BODN2A`/`BOUP2A` → `BODIRL` → `BODIR` :3840,:3899,:3870-3876; `BOLAVA` →
    `BODIR3` :3956). Logged as an undocumented deviation below and as finding M1.

- **ROUND 2 — the MOUNTED seed unifies a value the ROM leaves undefined on the transporter path**
  - Spec source: the vendored ROM (highest authority for a transcription story), against
    `tests/helpers/homing-contract.ts`'s own round-1 text
  - Spec text: round 1 pinned "a fresh homing workspace: the counter born at ZERO (`CLR PRDIR,Y` —
    'ASSUME BIRD NEVER CAME WITHIN SHORT RANGE SCAN', JOUSTRV4.SRC:3255)"
  - Implementation: `seedHoming()` is now pinned at **1**, cited `SEEKFS  LDA #1 / STA PRDIR,U`
    (:3584-3585), for EVERY enemy — including the transporter-entered wave complement, whose
    PRDIR the ROM never actually defines.
  - Rationale: :3255 is a real line describing a bird this port has no state for — the RIDERLESS
    seeker the hatch sends out under `PJOY = SEEKE` (:3268). Every `EnemyState` here is a mounted
    knight, and the ROM's value for a mounted bird is 1: `MOUNTM` is branched to from exactly one
    place in the whole source (:3592), that branch sits in `SEEKFS`'s straight-line run with no
    label able to bypass the store, and nothing rewrites PRDIR before the `DSMART` install
    (:3693-3694). All three proven mechanically in `homing-source.test.ts`. The OTHER route into a
    smart brain — `LNTSMT` :3764-3775, the transporter enemy's intelligence promotion — writes
    PRDIR nowhere, and `CUPROC` (SYSTEM.SRC:387-404) initialises only PLINK/PNAP/PPC/PID/PPRI, so
    the recycled workspace is never cleared and the ROM's value on that path is genuinely
    undefined. A port must be deterministic; unifying on the one DEFINED mounted value is more
    faithful than inventing a second, and it removes the class of bug this round exists to fix —
    a future spawn site cannot forget to seed, because the default IS the live value.
  - Severity: major
  - Forward impact: none owed by another story. Recorded as a finding so jt8-3 and uf1-9 inherit
    the reasoning rather than re-deriving it from :3255.
  - → ✓ **ACCEPTED by Reviewer**: independently re-derived, not taken on the author's word. I
    grepped `MOUNTM` across the whole of JOUSTRV4.SRC — two hits, the branch at :3592 and the
    label at :3654, and no `#MOUNTM` address-taken form (`MOUNLP`/`MOUNRI`/`MOUNRN` are interior
    labels of the mount body). I read :3584-3595 and confirmed the store at :3585 precedes every
    branch that leaves the block, so any bird AT :3592 carries 1. I read `CUPROC` (SYSTEM.SRC:
    387-404) and confirmed it writes PFREE/PLINK/PNAP/PPC/PID/PPRI and clears nothing, and
    `LNTSMT` (:3764-3775) and confirmed no PRDIR write. And I checked the premise the whole
    unification rests on — that every `EnemyState` in this port is MOUNTED: `collisionPass`
    (demo.ts:794-796) REMOVES a defeated enemy and spawns an egg, so no riderless bird ever
    persists as an `EnemyState`. The deviation is sound and better-evidenced than my own round-1
    finding, which said the flag is set "during the remount flight that every mounted buzzard
    completes" — that was MY overstatement, and TEA corrected it here. See L2 for where the
    corrected wording did NOT reach.

- **ROUND 2 — TEA adopts the Reviewer's M1 disclosure; no gate is built or tested here**
  - Spec source: session file, `### Reviewer (audit)` deviation ("the throttle runs in flight
    states the ROM excludes it from")
  - Spec text: "`BOLEVB` is reachable ONLY from the level-flight states `BOLEV1`/`BOLEV2` … Every
    other bounder state bypasses the throttle entirely … jt8-2 owes the DISCLOSURE."
  - Implementation: the round-2 RED adds NO test asserting a state gate, and no test asserting its
    absence. `homingWake` continues to run on every wake of every smart enemy.
  - Rationale: a test either way would be wrong. Pinning the current behaviour would enshrine a
    divergence; pinning the ROM's gate would demand the `BOLEV`/`BOLETM` state machine that
    uf1-9 owns by name, and re-baseline demo replays outside this scope. Disclosure is the
    correct deliverable, and it is now carried in three places a later reader will actually hit:
    this entry, the Delivery Finding routing it to uf1-9, and the Reviewer's own audit entry.
  - Severity: minor
  - Forward impact: uf1-9 adds the level-flight state and moves the `homingWake` call behind it.
    Until then reversals land in climbs and dives, which the cabinet cannot produce.
  - → ✓ **ACCEPTED by Reviewer**: this is exactly the disposition I asked for, and the reasoning
    for adding no test either way is correct — a test pinning the current behaviour would enshrine
    the divergence, and a test pinning the ROM's gate would demand uf1-9's state machine. The
    disclosure now exists in three places (this entry, the Delivery Finding, my round-1 audit
    entry), which is what I wanted. No further action owed by jt8-2.

### Dev (implementation)
- → ✓ **ACCEPTED by Reviewer**: confirmed. The implementation matches TEA's pinned contract
  instruction-for-instruction; I found no undocumented Dev-side divergence.
- No deviations from spec. TEA's three deviations (the reversal-not-nudge reading, `HomingState`
  carrying `PRDIR` only, and leaving `BOLETM`/`PJOYT` to uf1-9) were all ratified in RED and
  implemented exactly as pinned; GREEN added none of its own.

- **ROUND 2 — two committed claims were CORRECTED, not just added**
  - Spec source: `joust/docs/rom-study/claims/homing.json` (jt8-2 round 1, my own authorship)
  - Spec text: `JT82-017` read "The reverse-direction counter is cleared to ZERO when the buzzard
    is created, **so every fresh enemy enters its brain with the throttle counter at its starting
    value**"; `JT82-008` derived 129 "from a counter **born at zero**".
  - Implementation: both rewritten. JT82-017 now states only what :3255's own line carries and
    names the bird it describes (the riderless seeker, handed `PJOY = SEEKE` at :3268); JT82-008
    now walks from a CLEARED counter and names the flip's own `CLR PRDIR,U` (:3944) as the zero.
  - Rationale: the citation checker verifies SOURCE and VERBATIM only and never reads claim prose
    (`claims/README.md`, and jt1-10 is the canonical instance of a green citation with wrong
    prose). Both claims stayed byte-green through round 1 while asserting the thing that made the
    feature inert. Leaving them would have left the wrong conclusion committed under a passing
    gate — exactly the failure mode the claims corpus exists to prevent.
  - Severity: minor
  - Forward impact: none — no story cites either claim id. `check-citations.mjs` re-run: 865
    claims, all verified.
  - → ✓ **ACCEPTED by Reviewer** — the DECISION was right and I would have raised it as a finding
    had Dev only appended. A claims corpus whose prose says the opposite of the code, under a gate
    that cannot read prose, is worse than no claim. **But the corrections are not clean**: I read
    all six touched claims by hand against the vendored lines and three still overstate — see
    findings L1, L2 and L3. Correcting was right; the corrections need one more pass.

- **ROUND 2 — `demo.ts` was NOT touched, though the Reviewer named it a fix site**
  - Spec source: session file, `## Reviewer Assessment`, finding H1
  - Spec text: "Fix Required: … `src/core/enemy.ts:354` (`seedHoming`) **+ `src/core/demo.ts:531`
    (`remountEnemyProcess`)** — Port the `SEEKFS` short-range flag so a mounted enemy starts at
    the ROM's value"
  - Implementation: only `seedHoming()` changed. No spawn site sets `homing` explicitly.
  - Rationale: `remountEnemyProcess` produces one of TWO enemy shapes (the other is
    `enemyState`, the transporter complement), and seeding at call sites reintroduces the exact
    half-wiring risk that H1 is an instance of — a third spawn site added later would silently get
    the inert value. Correcting the DEFAULT makes the live value unforgettable, and the
    workspace-absent path is now pinned by its own test (`an enemy carrying NO homing workspace at
    all still reverses on its first match`), which mutation-proof M4 shows was previously
    unexercised. Strictly stronger than the named fix, and one line instead of three.
  - Severity: minor
  - Forward impact: none. If a later story needs a per-enemy starting counter (an unmounted
    seeker, say), it adds it at that spawn site against a default that is already correct.
  - → ✓ **ACCEPTED by Reviewer**, and Dev is right that it is stronger than the fix I named.
    Verified: `grep -rn seedHoming src/` returns exactly one call site — `enemy.ts:417`, the `??`
    default — so the value reaches every enemy by construction and no spawn site can be added
    that silently misses it. My round-1 fix text named two sites; one site that cannot be bypassed
    is the better shape. Declining a reviewer's stated fix in favour of a stronger one, with the
    reasoning written down, is the right way to disagree.

### Reviewer (audit)

- **ROUND 2 — the port's "mounted" bird is born DUMB where the ROM's is born SMART:** Not a
  violation by this diff, and not introduced by it — recorded because THIS STORY'S OWN PREMISE
  surfaces it. The seed is justified by "every `EnemyState` here is a mounted knight, and the
  ROM's value for a mounted bird is 1". True. But the ROM's mount does more than set `PRDIR`: at
  `MOUNRI` it also promotes the bird outright — `INC NSMART` (:3669), `INC PCHASE,U` (:3676), and
  the `DSMART` install (:3693-3694) — with no intelligence-budget check anywhere on that path. The
  port's `remountEnemyProcess` (demo.ts:531-552) creates its mounted bird `pchase: 0, brain:
  'linet'` and makes it wait for `frame.ts`'s budget-gated `promote()`. So the port now models
  mounted-ness for one byte of the workspace and not for the other. Both choices are individually
  defensible; together they are inconsistent. Severity: **L**. Belongs to whoever next touches the
  remount path (jt4-5's owner, or uf1-9) — NOT to jt8-2, whose scope is the throttle.

- **The throttle runs in flight states the ROM excludes it from:** Spec (the ROM) reaches `BOLEVB`
  ONLY from the level-flight states `BOLEV1`/`BOLEV2` — via `BOFAST` (`BRA BOLEVB`, :3934) or
  `BOLEVA` (:3938, falls through). Every other bounder state bypasses the throttle entirely and
  jumps straight to `BODIR`: `BODN2A` (:3840) and `BOUP2A` (:3899) both `BRA BODIRL` (:3870), which
  ends at `BODIR` (:3876); the lava states reach `BODIR3` (:3956,:3961). Code calls `homingWake` on
  every wake of every smart enemy (`stepEnemy`, enemy.ts:450). Verified by execution: a CLIMBING
  enemy (velY −400) with a primed counter flips, which the ROM cannot do. Not documented by TEA or
  Dev. Severity: **M**. Fix belongs to uf1-9 (the state machine); jt8-2 owes the DISCLOSURE.

- **`PRDIR` is seeded at 0 for every enemy, but the ROM's mounted buzzard starts at 1:** Spec says
  the counter is a dual-purpose byte — `SEEKFS` sets `PRDIR = 1` ("THE BIRD CAME WITHIN SHORT RANGE
  SENSORS", :3584-3585) during the remount flight, mounting is reachable only THROUGH that path
  (`MOUNTM` :3654 sits below the store), `MOUNRI` then promotes the bird (`INC PCHASE,U` :3676) and
  enters its smart brain (`LDD DSMART,X / STD PJOY,U` :3693-3694), and nothing clears `PRDIR` in
  between (grepped :3585-3695 — no `CLR`/`STA`/`STD`/`STB PRDIR`). Code seeds every enemy at 0
  (`seedHoming`, enemy.ts:354), making the 129-wake walk the only path. TEA logged the reuse as a
  Question rated "Low value — worth a backlog note, not a story"; measurement refutes that rating.
  Severity: **H** — see finding H1.

## Sm Assessment

Story cut clean off the back of jt8-1, which merged at `9313616` and established the
target-aggro seam (TARPLY/TARTM) this story consumes. Session, context and branch all
verified on disk — not taken from the setup subagent's word.

**Verified at setup:**
- `.session/jt8-2-session.md` present; story status `in_progress` in `sprint/epic-jt8.yaml`
- branch `feat/jt8-2-enemy-horizontal-homing-pface-nudge` checked out in `joust/` (base `develop`)
- `sprint/context/context-story-jt8-2.md` written with four ROM-anchored ACs
- `sprint/context/context-epic-jt8.md` NOT clobbered — `git status` shows no modification
  to tracked context files (the known sm-setup epic-context regen trap did not fire)

**Scope as routed to Leeloo (TEA):** RED pins the horizontal hunt only.
- `dir` follows PFACE (BODIR :3876 — `LDA PFACE,U` → CURJOY ±1)
- PFACE nudged by copying the *targeted* player's X-velocity **direction** (BOLEV `LDA PVELX,X` :3907)
- the copy is **throttled** ("DO NOT COPY PLAYERS MOVES TOO OFTEN", :3939)
- a **periodic flip** ("TRY THE OTHER DIRECTION", `COM PFACE,U` :3945)

**Seam:** `joust/src/core/enemy.ts` smart-brain Decision gains a facing update; `frame.ts`
must carry the updated facing back onto the enemy process. Enemy facing is set once at
spawn today and never changes — that frozen-at-spawn behavior is the thing under test.

**Coordination notes for downstream agents:**
- The throttle interval and flip cadence are ROM constants — they need a radix-cited
  claims entry, not a tuned guess. Cite from the vendored joust source, not memory.
- Fleet gotcha applies: a doc/spec assertion that matches a *token* rather than the
  *claim* is scenery. Mutation-check the flip cadence assertion — delete the claim,
  require red.
- Determinism is an AC in its own right: the seeded pursuit must replay bit-for-bit,
  and the dumb LINET enemy must stay untouched (still lane-tracks, ignores the player).
- td1-12 (BCD wave counter read as decimal) is still open in the backlog. It sits under
  the difficulty seam, not this one — but if wave-scaled homing constants surface during
  RED, that is a Delivery Finding, not a fix to make here.

**Routing:** phased tdd → red → Leeloo (TEA). No implementation planning done here by design.
## Tea Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)
**Round:** 2 (Reviewer REJECTED round 1 on one [HIGH])

### ROUND 2 — what the RED now demands

The [HIGH] was mine to answer, and it was a citation error, not a coding error.

`seedHoming()` returned 0 on the authority of `CLR PRDIR,Y` — "ASSUME BIRD NEVER CAME WITHIN
SHORT RANGE SCAN", :3255. That line is real. It describes a bird **this port has no state for**:
:3268 hands the freshly hatched bird `PJOY = SEEKE`, "TELL THE DOGIE TO FETCH THE LITTLE MAN" —
it is a RIDERLESS seeker, not a smart brain. Every `EnemyState` in joust is a mounted knight, and
the ROM's value for a mounted bird is 1. I re-read the chain firsthand:

| line | what it carries |
|------|-----------------|
| `SEEKFS  LDA #1` | :3584 |
| `STA PRDIR,U   THE BIRD CAME WITHIN SHORT RANGE SENSORS` | :3585 |
| `BEQ MOUNTM    GOT THE MAN!!!` | :3592 — the **only** branch to MOUNTM in the source |
| `MOUNTM  PULS B` | :3654 |
| `LDD DSMART,X / STD PJOY,U` | :3693-3694 — the smart brain is installed here |

So the flip is **free on the first velocity-matched wake** and the 129-walk is the cadence
between LATER flips. Round 1 made the ROM's exceptional path the only path.

The inference — "reaching :3592 implies PRDIR was just set" — is the one load-bearing step, so it
is proven mechanically rather than in prose: MOUNTM has exactly one branch and one label; no
label sits between :3585 and :3592 that could bypass the store; and no `CLR`/`STA`/`STD`/`STB`
touches PRDIR anywhere in :3586-3694.

**Test Files (round 2):**
- `joust/tests/homing.test.ts` — MODIFIED. New `AC-7` block (7 tests): the born value, the
  first-wake flip, the 1 → 130 → 259 tail, the workspace-ABSENT fixture, CLR-not-re-seed, and two
  over-broad-fix guards. Every cadence test in AC-2/3/5/6 restaged from `H.seedHoming()` onto an
  explicit `CLEARED` literal — that coupling is what let the born value change invisibly and is
  why round 1 had no test left to notice. Plus the null-target × `velXIndex 0` discriminator.
- `joust/tests/homing-wiring.test.ts` — MODIFIED. New `AC-4` block (5 tests): **the epic's
  standing guard**. A seeded wave-1 demo, ordinary frame-derived input, and some enemy must be
  observed to reverse — nothing primed, nothing synthesised. Plus a control that re-stages round
  1's counter on the same run and observes zero, and a fixture self-check that the two runs
  differ only in the workspace.
- `joust/tests/homing-source.test.ts` — MODIFIED. 17 new vendored-line laws (the SEEKFS→MOUNTM
  chain, the `SEEKE` hand-off, `LNTSMT`, `DJOY`, `WCREATE`, and `CUPROC` in SYSTEM.SRC), 5 new
  structural proofs, 6 new cited ranges, and a claim gate demanding a `JT82-*` claim that STATES
  the SEEKFS seed and anchors on :3584-3585.
- `joust/tests/helpers/homing-contract.ts`, `joust/tests/helpers/enemy-contract.ts` — MODIFIED.
  Contract text for the new seed and the re-anchored 129 derivation.

### ROUND 2 — RED evidence

| run | Test Files | Tests | skipped | `tsc --noEmit` |
|-----|-----------|-------|---------|----------------|
| round-1 GREEN (before) | 70 passed | 1698 passed | 0 | exit 0 |
| after round-2 RED | **3 failed** \| 67 passed | **12 failed** \| 1726 passed | **0** | exit 0 |

**No pre-existing test regressed** — the 67 untouched files still pass, and the 12 reds are
assertion reds, not suite-level load failures (the module exists now, so a skip here would mean
something else broke). The 12:

| suite | reds |
|-------|------|
| `homing.test.ts` AC-7 | 5 — the seed, the first-wake flip, the 129 tail, the absent workspace, CLR-not-re-seed |
| `homing-wiring.test.ts` AC-4 | 2 — no buzzard reverses in play, on either seed |
| `homing-source.test.ts` | 5 — 4 uncited ranges + the seed-claim gate |

### ROUND 2 — the contract was PROBED, not just written

A throwaway implementation (`seedHoming()` → 1, plus four throwaway claims) was written, run,
mutated, and reverted. `cp` backup → restore → `md5` proves `src/core/enemy.ts` and
`docs/rom-study/claims/homing.json` byte-identical to HEAD → CONTROL run confirms the 12 reds
returned.

- **1738/1738 pass, 0 skipped** against the throwaway — the contract is satisfiable and coherent.
- Eleven mutations, each reddening its intended guard and nothing else:

| # | mutation | reds |
|---|----------|------|
| M1 | `seedHoming()` back to round 1's 0 | 7 (5 × AC-7, 2 × in-play) |
| M2 | `seedHoming()` returns 2 | 1 — see the measured limit below |
| M3 | null target defaulted to `{ velXIndex: 0 }` | 1 (the new discriminator) |
| M4 | absent-workspace default `?? { prdir: 200 }` | 3 (AC-7 + both in-play) |
| M5 | the flip RE-SEEDS instead of `CLR PRDIR,U` | 8 |
| M6 | drop the SEEKFS claim from `claims/homing.json` | 2 (the citation gate is not scenery) |
| T1 | widen the "no label bypasses SEEKFS" window | 1 |
| T2 | widen the "nothing rewrites PRDIR" window to include :3585 | 1 |
| T3 | widen LNTSMT's block until it reaches a PRDIR line | 1 |
| T4 | blind the CUPROC scan to `CLR`-shaped writes | 1 |
| T5 | stage the in-play CONTROL at `prdir: 1` instead of 0 | 2 |

T1-T5 exist because five of the new assertions are `toEqual([])` — the shape that passes when a
scan is broken. Each is proven to discriminate rather than assumed to.

**MEASURED LIMIT, stated rather than glossed (M2):** no BEHAVIOURAL test can tell a seed of 1
from a seed of 2..127. Every one lands the first `DEC` non-negative, flips on wake 1, and is
CLEARED to 0 — the runs are identical from there. The exact value is therefore pinned by one
assertion plus the citation gate, and by nothing else. That is why the gate exists and why M6 was
run against it.

### ROUND 2 — Reviewer findings, disposition

| # | finding | disposition |
|---|---------|-------------|
| **H1** | flip never fires in play | **Answered by the contract.** `seedHoming()` = 1 (SEEKFS), plus AC-4's in-play guard + control. Dev's fix is one literal; the citations and claims are the work. |
| M1 | `[EDGE]` throttle runs on every wake | **Disclosed, not fixed** — a new TEA Design Deviation adopts it, and a Delivery Finding routes the gate to uf1-9 (which owns `BOLEV`/`BOLETM`). No test either way: pinning current behaviour would enshrine the divergence. |
| M2 | `[TEST]` null guard indistinguishable | **Fixed in test.** New `a null target is NOT a zero-velocity target`; mutation-proven (M3 above). |
| M3 | `[TEST]` absent-`homing` contract unexercised | **Fixed in test.** New AC-7 fixture with no workspace; mutation-proven (M4). |
| L1 | `[DOC]` "the ONLY thing that changes a smart enemy's facing" | **Fixed in my two files** (`homing-contract.ts`, `homing.test.ts`) — scoped to the bounder, with the hunter/shadow aiming writes named. `src/core/enemy.ts`'s header is **Dev's to correct**. |
| L2 | `[RULE]`/`[SEC]` gratuitous `as unknown as Process` | **Deleted.** `tsc --noEmit` clean without it. |
| L3 | `[RULE]` mutable `Claim[]` param | **Fixed** — `readonly Claim[]`. |
| L4 | `[SEC]`/`[RULE]` unchecked `JSON.parse ... as Claim` | **Fixed** — `asClaim()` narrows and names the offending file. Extraction of the shared loader deferred to a finding: it is 2× now and 3× at jt8-3, and extracting across jt8-1's committed suite is not jt8-2's scope. |
| L5 | `[RULE]` `(e as Error).message` unnarrowed | **Fixed** — `e instanceof Error ? e.message : String(e)`. |
| L6 | `[TYPE]` `EnemyState` fields not `readonly` | **Not taken.** Pre-existing interface, Reviewer marked optional; making it readonly ripples through every fixture and `frame.ts`'s enemy branch for no behavioural gain in this story. |
| L7 | `[DOC]` "adjacent-but-unequal" | **Fixed** — reworded; 0 and +8 are the two ENDS of the FLYX range. |

### ROUND 2 — What Dev (Korben) must build

1. `joust/src/core/enemy.ts` — `seedHoming()` returns `{ prdir: 1 }`. Re-anchor its JSDoc on
   `SEEKFS` :3584-3585 (the mounted bird) and re-anchor `PRDIR_FLIP_WAKES`'s derivation prose on
   the flip's own `CLR PRDIR,U` :3944 — the walk starts from the zero the FLIP writes, not from
   :3255. **:3255 must stop being cited as this port's seed**; it is the riderless seeker's.
2. `joust/src/core/enemy.ts` — the module header's "the only thing in the ROM that ever changes a
   smart enemy's facing" is false (L1). Scope it to the bounder; the hunter and shadow aim via
   `B2DIR`/`SHDIR` at :4122/:4141/:4353/:4372, which is jt8-3's.
3. `joust/docs/rom-study/claims/homing.json` — new `JT82-*` claims (claims are DATA, Dev authors
   them) covering `JOUSTRV4.SRC` :3584-3585, :3592, :3693-3694 and `SYSTEM.SRC` :387-404. One of
   them must **state the SEEKFS short-range flag by name and mention PRDIR**, anchored on
   :3584-3585 — there is a gate that checks exactly that, and it is mutation-verified.
4. **No `demo.ts` change is owed.** The Reviewer named `remountEnemyProcess` as a fix site; with
   the default itself corrected, no spawn site can forget to seed — which is strictly safer than
   seeding at two call sites and is why the contract puts the value in `seedHoming()`.

**Determinism note:** demo replays WILL move again — enemies now reverse where round 1's build
left them orbiting. Bare-scheduler replays still will NOT (`target === null` changes nothing),
which is what protects the jt2 baselines.

### ROUND 2 — Rule Coverage — `.pennyfarthing/gates/lang-review/typescript.md`

| # | Rule | Test / how it is enforced | Status |
|---|------|---------------------------|--------|
| 1 | Type-safety escapes | the last `as unknown as` in the story is GONE (L2); the contract loaders' `as Partial<T>` → validate → `as T` remains the sanctioned idiom | passing |
| 2 | `readonly` / generic pitfalls | `claimCovers(claims: readonly Claim[])` (L3); `CLEARED` is `as const` | passing |
| 4 | `??` vs `\|\|` on falsy-but-valid | the load-bearing one: `prdir` is legitimately 0 and `velXIndex` legitimately 0/negative. The new null-target discriminator exists precisely because 0 is a valid index — pinned by `a null target is NOT a zero-velocity target` | failing (AC-2 block green; AC-7 red) |
| 5 | `.js` extensions / `export type` | every new import; unchanged | passing |
| 8 | Test quality — no vacuous assertions | scanned: 0 `toBeTruthy()`, 0 `let _ =`, 0 conditional `expect`s, 0 `.only`/`.skip`. Every `toEqual([])` assertion is mutation-proven to discriminate (T1-T4) | failing (suite) |
| 10 | Input validation | `asClaim()` narrows every parsed claim and names the file (L4) | passing |
| 11 | Error handling | `loadHoming` narrows `catch (e)` with `instanceof Error` (L5) | passing |
| 13 | Fix-introduced regressions | 1726 pre-existing assertions still pass; `tsc --noEmit` exit 0 at RED and at GREEN-probe | passing |

**Rules checked:** 8 of 13 applicable (3/6/7/12 have no surface in a pure-core test suite; 9 is
build config, untouched).
**Self-check:** 0 vacuous tests found. **1 inaccurate comment of my own found and fixed** — the
new cadence test claimed "a seed of 2 (or of 0) reds here", which mutation M2 disproved for 2;
the comment now states the measured limit instead.

**Handoff:** To Korben Dallas (Dev) for GREEN.

---

### ROUND 1 (superseded — kept as history)

**Test Files:**
- `joust/tests/helpers/homing-contract.ts` — NEW. The jt8-2 API contract + `loadHoming()`, with the
  full `BODIR`/`BOLEVB` disassembly quoted at the top so Dev codes to the machine, not to prose.
- `joust/tests/homing.test.ts` — NEW, 25 tests. The laws: BODIR, the velocity-match gate, the
  8-bit `PRDIR` counter and its 129-wake cadence, flip ordering, all three smart brains, LINET
  untouched, purity + determinism.
- `joust/tests/homing-wiring.test.ts` — NEW, 7 tests. `velXIndex` plumbed `frame.ts` →
  `target.ts` → the brain; the flipped facing carried on the process and reaching the draw list;
  the bare-scheduler path unchanged.
- `joust/tests/homing-source.test.ts` — NEW, 49 tests. Provenance: 30 vendored-line laws + 8
  structural proofs + 11 claim-coverage checks (10 cited ranges + the `JT82-*` gates).
- `joust/tests/helpers/enemy-contract.ts` — MODIFIED. `PlayerView.velXIndex` (required),
  `HomingState`, `EnemyState.homing?`.
- `joust/tests/helpers/target-contract.ts` — MODIFIED. `PlayerView`/`TargetPlayer` gain `velXIndex`.
- `joust/tests/{enemy,wave,target}.test.ts` — MODIFIED, fixture re-seat only (11 literals gain
  `velXIndex: 0`). **TEA re-seated these so Dev never edits a test.**

**Tests Written:** 81 across 3 suites (+1 contract helper), covering 4 ACs (as amended — see
Design Deviations). Counted from vitest, not from `it(` greps — `it.each` expands.

### RED evidence

| run | Test Files | Tests | `npm run build` |
|-----|-----------|-------|-----------------|
| baseline (before) | 67 passed | 1617 passed, 0 failed | exit 0 |
| after RED | **3 failed** \| 67 passed | **8 failed** \| 1658 passed \| 32 skipped | exit 0 |

The three failures are exactly `tests/homing.test.ts`, `tests/homing-wiring.test.ts`,
`tests/homing-source.test.ts`. **No pre-existing file regressed** — the 67 that passed still pass,
and the +41 new passes are `homing-source.test.ts`'s vendored-line block, which is the independent
second entry, not a red signal.

`homing.test.ts` and `homing-wiring.test.ts` red at the SUITE level (`loadHoming()` in `beforeAll`,
jt8-1's pattern), so their 32 tests report as skipped. **If any of those 32 is still skipped after
GREEN, the module did not load and the green is a lie.**

### The contract was PROBED, not just written

A throwaway implementation was written, run, mutated, and reverted (`cp` backup → restore → `md5`
+ `git status` prove `src/` byte-identical → CONTROL run confirms the red returned). It caught a
real defect in my own first draft: the suite asserted two individually-ROM-true things that no
implementation could satisfy at once (see the `ppvelx` deviation). Against the corrected contract:

- **32/32 pass, 0 skipped** — the contract is satisfiable and coherent.
- Each guard has teeth (mutation → tests reddened):

| mutation | red |
|----------|-----|
| M1 — drop the velocity-match gate (tick every wake) | 5 |
| M2 — unbounded counter instead of 8-bit wrap | 9 |
| M3 — apply the flip AFTER the step | 1 |
| M4 — `frame.ts` drops the `velXIndex` plumbing | 3 |
| M5 — LINET homes too (over-broad fix) | 1 |

M3 and M5 are single-purpose discriminators by design; each is the only test that CAN catch its
mutant, which is why both exist.

### What Dev (Korben) must build

1. `joust/src/core/enemy.ts` — `PRDIR_FLIP_WAKES = 129`, `seedHoming()`, `homingWake()`, plus
   `HomingState` / `EnemyState.homing?` / `PlayerView.velXIndex`. `stepEnemy` calls `homingWake`
   **before** `runBrain` (`COM PFACE,U` :3945 → `JMP BODIR` :3946 → `LDA PFACE,U` :3876 — the flip
   is read the same wake) and threads the workspace through rather than re-seeding it.
2. `joust/src/core/target.ts` — carry `velXIndex` through `viewOf`/`nearer`/`selectTarget`.
3. `joust/src/core/frame.ts:323` — push `velXIndex: p.entity.velXIndex` onto each candidate.
4. `joust/docs/rom-study/claims/` — the `JT82-*` claims (claims are DATA, Dev authors them).
   One must state **129** and mark it **DERIVED** from the 8-bit `DEC`/`BMI`, anchored on
   :3942-3944 — presenting it as a ROM literal would be a fabricated citation, and there is a
   test that checks exactly this.
5. Delete the `as unknown as DemoProcess['enemy']` cast in `homing-wiring.test.ts:108` once the
   real `EnemyState` carries `homing` — the comment there says so.

**Determinism note:** demo replays WILL move (enemies now reverse). Bare-scheduler replays will
NOT — `target === null` is pinned to change nothing, which is what protects the jt2 baselines.

### Rule Coverage — `.pennyfarthing/gates/lang-review/typescript.md`

| # | Rule | Test / how it is enforced | Status |
|---|------|---------------------------|--------|
| 1 | Type-safety escapes | one `as unknown as` in `homing-wiring.test.ts:108`, commented with WHY and a delete-at-GREEN instruction; no `as any`, no `@ts-ignore` | failing (suite) |
| 2 | Missing `readonly` / `Partial<T>` misuse | `HomingState`/`PlayerView` fields all `readonly`; `velXIndex` REQUIRED, not `Partial` — an optional field would let the wiring half-land and stay green | failing (suite) |
| 4 | `??` vs `\|\|` on falsy-but-valid | `velXIndex` is legitimately `0` and legitimately negative — the whole gate would break under `\|\|`. Pinned by `the gate reads the TARGET’s index … at 0 and at −8 too` | failing (suite) |
| 5 | `.js` extensions in relative ESM imports | every import in all four new files | failing (suite) |
| 5 | `export type` for type-only re-exports | `homing-contract.ts` re-exports via `export type { … }` | failing (suite) |
| 8 | Test quality — no vacuous assertions | scanned: 0 conditional `expect`s, 0 `toBeTruthy()`, 0 `let _ =`; 67 `expect` call sites across 81 tests; every guard mutation-verified above | failing (suite) |
| 8 | Integration tests import `src/`, not `dist/` | `homing-wiring.test.ts` imports `../src/core/{demo,frame,flight}.js` | failing (suite) |
| 11 | Error handling | `loadHoming` narrows `catch (e)` via `(e as Error).message` into a self-describing throw | failing (suite) |

**Rules checked:** 8 of 13 applicable (3/6/7/12 are React/async/bundle rules with no surface in a
pure-core test suite; 9/10 are build-config and input-validation with no surface here).
**Self-check:** 0 vacuous tests found. 1 inaccurate comment of my own found and fixed (two headers
claimed per-test module loading where the code uses `beforeAll`).

**Handoff:** To Korben Dallas (Dev) for GREEN.
## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 1738/1738 passing (GREEN) — **0 skipped**
**Branch:** `feat/jt8-2-enemy-horizontal-homing-pface-nudge` (pushed, `8d363f9`)
**Round:** 2

### ROUND 2 — what changed

Two files, 91 lines, and most of them are the citation.

**`joust/src/core/enemy.ts`**
- `seedHoming()` returns `{ prdir: 1 }` — the value a MOUNTED bird carries, cited
  `SEEKFS  LDA #1 / STA PRDIR,U` (JOUSTRV4.SRC:3584-3585). One literal.
- Its JSDoc carries the whole chain, because the chain is the work: `MOUNTM` has exactly one
  branch in the source (:3592), it sits in `SEEKFS`'s straight-line run, and nothing rewrites
  `PRDIR` before the `DSMART` install (:3693-3694). Plus the negative half — why `CLR PRDIR,Y`
  (:3255) is the RIDERLESS seeker's zero (`PJOY = SEEKE`, :3268) and not ours, and why the
  transporter path is genuinely UNDEFINED (`CUPROC` SYSTEM.SRC:387-404 clears nothing).
- `PRDIR_FLIP_WAKES`'s derivation re-anchored: the walk starts from the zero the FLIP writes
  (`CLR PRDIR,U`, :3944), so 129 is the cadence BETWEEN flips. Mis-anchoring it on :3255 is what
  made the mechanism inert.
- Module header: "the ONLY thing in the ROM that ever changes a smart enemy's facing" scoped to
  the BOUNDER, with the hunter/shadow aiming writes named ([LOW][DOC] L1).

**`joust/docs/rom-study/claims/homing.json`** — `JT82-020` (the SEEKFS store), `JT82-021` (the
sole MOUNTM branch), `JT82-022` (the DSMART install), `JT82-023` (`CUPROC` writing only the
scheduling fields). `JT82-008` and `JT82-017` **corrected** — see the Design Deviation; both were
byte-green in round 1 while their prose asserted the thing that made the feature inert.
`node tools/audit/check-citations.mjs`: **865 claims, all verified.**

**No `demo.ts` change** — the Reviewer named `remountEnemyProcess` as a second fix site. Correcting
the DEFAULT is strictly stronger: no spawn site can forget to seed. Logged as a deviation.

### ROUND 2 — verification

| check | result |
|-------|--------|
| `npx vitest run` | **1738 passed / 1738**, 70 files, **0 skipped** |
| `npm run build` (`tsc --noEmit && vite build`) | exit 0 |
| `node tools/audit/check-citations.mjs` | 865 claims, all verified |
| `origin/develop` | 0 commits ahead — no sibling has moved under me |
| working tree | clean; branch pushed |

TEA's tripwire — "if any of those tests is still skipped after GREEN, the module did not load and
the green is a lie" — holds: 0 skipped, and all 12 round-2 reds are now real passing assertions.

### ROUND 2 — the number, not the adjective

The [HIGH] was "measured 0 flips in 20,000 frames". So I measured the shipped build the same way
rather than reporting "the tests pass":

| seed | reversals in 6,000 frames | enemies that reversed | first reversal |
|------|---------------------------|-----------------------|----------------|
| `0x1234` | 1 | 1 of 3 | frame 93 |
| `0xbeef` | 1 | 1 of 3 | frame 93 |

**Read that honestly:** the mechanism is alive, and it fires ONCE per enemy that ever
velocity-matches. That is faithful to the port as built — the first flip is the mounted seed, and
the 129 matched wakes the second costs are never accumulated. It is not yet the full anti-orbit
behaviour the epic wants, and I have filed why: we compare the target's LIVE index where the ROM
compares `PPVELX`, a snapshot frozen at the last `BOLEV` decision, and an enemy accelerating
toward a FIXED number matches far more readily than one chasing a moving one. uf1-9's freeze
should raise the rate; jt8-3's `B2DIR`/`SHDIR` aiming is the rest. See the new Gap finding.

### ROUND 2 — Notes for the Reviewer

- **The inference is the risk, and it is machine-checked.** "Reaching :3592 implies PRDIR was just
  set to 1" is the one step that is not a direct transcription. TEA gave it three structural
  proofs rather than prose (one branch to MOUNTM; no label bypasses the store; no PRDIR write in
  :3586-3694), and each was mutation-verified by widening its window until it reddened. If you
  attack one thing in this diff, attack that inference — it is where I would look too.
- **Where the ROM is silent, I did not invent.** The transporter path's PRDIR is recycled RAM. The
  port unifies on the one DEFINED mounted value instead of modelling garbage; deviation logged,
  finding filed, and `CUPROC` is now cited so the next reader does not have to re-derive it.
- **Round-1 claims were re-read, not just appended to.** Two carried prose that was wrong in the
  way that mattered while passing every gate. That is worth a look as a class, not just an
  instance — filed as an Improvement.
- **Determinism:** demo replays move again (enemies reverse where round 1 left them orbiting).
  Bare-scheduler replays do not — `target === null` still returns the enemy untouched, pinned by
  `homing-wiring.test.ts` AC-3. No baseline needed re-cutting; the full suite confirms it.
- **M1 is disclosed, not fixed**, per your own instruction: `homingWake` still runs on every wake
  where the ROM reaches `BOLEVB` only from level flight. TEA logged the deviation and routed the
  gate to uf1-9. No test was added either way — pinning current behaviour would enshrine it.

**Handoff:** To Jean-Baptiste Emanuel Zorg (Reviewer).

---

### ROUND 1 (superseded — kept as history)

**Files Changed:**
- `joust/src/core/enemy.ts` — `PRDIR_FLIP_WAKES` (129, DERIVED), `seedHoming()`, `homingWake()`;
  `PlayerView.velXIndex`; `EnemyState.homing?`. `stepEnemy` runs the homing wake BEFORE the brain.
- `joust/src/core/target.ts` — `velXIndex` on `PlayerView`/`TargetPlayer`, carried through
  selection via a new single `viewFor()` funnel.
- `joust/src/core/frame.ts` — `velXIndex` pushed onto each SELPLY candidate.
- `joust/docs/rom-study/claims/homing.json` — NEW. 19 `JT82-*` claims.
- `joust/tests/homing-wiring.test.ts` — removed the RED's `as unknown as` cast (TEA's handoff
  item 5). The only test edit, and it is a deletion TEA pre-authorised in a code comment.

**Verification**

| | Test Files | Tests | build |
|---|---|---|---|
| before the story | 67 passed | 1617 passed | exit 0 |
| RED | 3 failed \| 67 passed | 8 failed \| 1658 passed \| 32 skipped | exit 0 |
| **GREEN** | **70 passed** | **1698 passed, 0 failed, 0 skipped** | **exit 0** |

The **0 skipped** is the load-bearing number, not the 1698: TEA's suites red at the suite level
(`loadHoming()` in `beforeAll`), so their 32 tests reported as skipped in RED and TEA wrote "if
any of those 32 is still skipped after GREEN, the module did not load and the green is a lie."
They all run and pass.

**All 5 handoff items done:** `enemy.ts` (1), `target.ts` (2), `frame.ts` (3), the `JT82-*`
claims with 129 marked DERIVED and anchored on :3942-3944 (4), and the cast deleted (5).

**Notes for the Reviewer**

- **Nothing invented.** TEA's contract was fully specified and mutation-verified before I started;
  I implemented it and added no abstraction beyond it. `homingWake` is 8 branch-free lines, one
  per ROM instruction, each carrying its line number.
- **The 129 is derived, and the claim says so.** `JT82-008` states the cadence and explicitly owns
  that it falls out of the 8-bit wrap rather than being transcribed. `tests/homing-source.test.ts`
  enforces exactly that, and it caught a second claim (`JT82-017`) that had imported the
  conclusion into a cross-reference — reworded rather than loosening the gate.
- **The re-seat ripple the Dev sidecar warns about did not materialise, and it was checked, not
  assumed.** Both mechanisms that could have rippled were grepped: fixtures carrying `targets`
  (8 files) and assertions on enemy facing. No sibling fixture stages a long enemy-with-target
  run, so no facing flip reaches one. The full suite confirms it.
- **Determinism, as TEA predicted:** demo replays can now move (enemies reverse); bare-scheduler
  replays cannot, because `target === null` returns the enemy untouched. That is pinned by
  `homing-wiring.test.ts` AC-3 and is what protects the jt2 baselines. No baseline needed
  re-cutting.
- **Known bounded divergence, already filed:** the ROM compares a `PPVELX` snapshot up to
  `BOLETM` (~21) wakes old; this compares the live index, because the BOLETM decision timer is
  uf1-9's. See TEA's Gap finding and deviation — it diverges only when the target changes speed
  mid-episode.

**Handoff:** To Jean-Baptiste Emanuel Zorg (Reviewer).
## Subagent Results

### ROUND 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1738/1738 green **0 skipped**, build exit 0, 865 claims verified, tree clean, `origin/develop` not ahead, no debug code, no stray files |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (M1 and the promotion audit below are mine) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (see [SILENT] in Verified good) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (M2/M3/L1/L3 are mine or corroborated) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by rule-checker's rule #2 sweep + my own read (L5) |
| 7 | reviewer-security | Yes | clean | none | N/A — purity boundary verified line-by-line, `asClaim` narrowing sound, no type-safety escapes |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (see [SIMPLE] in Verified good) |
| 9 | reviewer-rule-checker | Yes | findings | 6 (0 hard violations) | confirmed 4, dismissed 0, deferred 2 (merged into M4/L5) |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`, each domain
covered by my own analysis rather than claimed as covered)

**Total findings:** 7 confirmed (4 MEDIUM, 3 LOW), 0 dismissed, 0 deferred

**Two findings are MINE, not a subagent's**, and they are the two that matter most:
- **M2** — no subagent checked `JT82-021`'s "sole route by which a buzzard acquires a rider"
  clause. The rule-checker verified the *MOUNTM* half (true) and stopped there. I checked the
  *rider* half against the source and it is false.
- The **promotion audit** (`### Reviewer (audit)` below) — the port's mounted bird is born DUMB
  where the ROM's is born SMART, a tension this story's own premise exposes.

**I independently re-measured the test-analyzer's central claim** rather than relaying it: it
reported the AC-4 guard passes under fully idle input. It does — seed `0xbeef`, frame 91, on a
0-vs-0 velocity match. I also confirmed both `PLAY_SEEDS` spawn the flipping enemy (id 256) at the
identical `(23, 35072)`. One detail of its account was off and I corrected it: under the *drift*
input the match is at velX 2-vs-2, not 0-vs-0 — the conclusion survives, the mechanism does not.

### ROUND 1 (superseded — kept as history)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1698/1698 green, build exit 0, 0 code smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (H1, M1 are mine) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (see [SILENT] below) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 3, dismissed 1, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (L1 is mine) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (see [TYPE] below) |
| 7 | reviewer-security | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by me (see [SIMPLE] below) |
| 9 | reviewer-rule-checker | Yes | findings | 4 (+1 soft) | confirmed 5, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`, each
domain covered by my own analysis rather than claimed as covered)

**Total findings:** 11 confirmed, 1 dismissed (with rationale), 0 deferred

**Dismissed:** test-analyzer's `implementation-coupling` on the `prdir: 0x80` fixtures —
`prdir` is a documented first-class field of the public `HomingState` contract deliberately
modelling the ROM's PRDIR register (enemy-contract.ts), not a hidden internal; the subagent rated
it `confidence: low` and wrote "No action needed". Coupling to a documented contract field is not
coupling to an implementation detail.

## Reviewer Assessment

**Verdict:** APPROVED
**Round:** 2

The [HIGH] is answered, and answered better than I asked for. I re-derived the central chain from
the vendored source myself and it holds. Seven findings remain — four MEDIUM, three LOW — and
**every one of them is in prose, not in code**: three are overstatements in the committed claims
corpus, one is a test fixture that proves less than its own comments say. None blocks.

What changed my mind from "another round" to "ship it": round 1 failed because a green suite
certified an inert feature. So I did not ask whether the tests pass — I asked whether the buzzard
turns around, measured it myself on three seeds, and traced *why* it turns around. It does, at
frame 91-97, and the reason is the one the diff claims.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | [TEST] **AC-4 proves less than its comments claim.** The block's two load-bearing comments are "ordinary input… a human at the cabinet, not a stick pinned" and "two seeds, so a single lucky RNG stream cannot carry the guard". I measured both: the guard passes **identically under fully idle input** (stick never touched — seed `0xbeef`, flip at frame 91 on a 0-vs-0 match), and **both seeds spawn the flipping enemy, id 256, at the identical `(23, 35072)`**. What actually produces the pass is the ~90-frame TARTIM aggro grace expiring while both parties sit on matching FLYX rungs — not varied play, and not seed diversity. The guard is REAL (it reds on the round-1 regression — mutation-verified three independent times), but it is written "to be COPIED by jt8-3", so the overclaim propagates into an epic that exists because overclaimed test evidence shipped an inert feature. | `tests/homing-wiring.test.ts:261-277` | Say plainly what the pass condition is, or make the fixture earn its description: seeds that place the enemy differently, and a non-matching starting `velXIndex` so a match can only be reached through flap-driven convergence |
| [MEDIUM] | [DOC] **`JT82-021` is false as written.** It claims the MOUNTM branch "is the sole route by which a buzzard acquires a rider". It is not: the transporter path installs one directly — `STD PRIDER,U  PUT RIDER ON HORSE` (:5730) — and `ATTEMY` does the same at :465. MOUNTM is the sole route by which a *riderless flying* bird picks up a *dismounted man*. This is the claim underpinning the story's central inference, and as written it makes the port's seed look ROM-determined for wave enemies when the deviation itself correctly admits the ROM is **silent** there. Prose is the one artifact no gate reads. | `docs/rom-study/claims/homing.json` (JT82-021) | Scope the sentence to the riderless-seeker case |
| [MEDIUM] | [DOC] [RULE] **The one number the round turns on is not pinned where it is stated.** `prdir: 1` is an inline literal with no radix tag, in a file where every other cited constant is an exported `const` carrying an explicit `HEX.`/`DECIMAL.` (`EMYTIM_NORMAL = 1 … DECIMAL.`, enemy.ts:133). And the only claim covering `:3584-3585` is `JT82-020`, anchored on **:3585**, whose verbatim (`STA PRDIR,U … SENSORS`) contains no `1` — the line that states the value, `:3584 SEEKFS LDA #1`, carries no claim at all. The epic guardrail is "every transcribed constant carries a radix-cited claim". The suite's `LAWS` table does check :3584, so the fact is verified — but the durable citation record does not carry it. | `src/core/enemy.ts:393-395`, `docs/rom-study/claims/homing.json` (JT82-020) | Anchor a claim on :3584, whose verbatim shows the literal; add the radix word |
| [MEDIUM] | [DOC] **`JT82-022` states a conditional outcome unconditionally.** "Having mounted, the enemy selects its intelligence's smart decision routine" — but :3688-3691 branches on `LDA GOVER / BNE 2$` and the fall-through installs `DJOY,X`, "A DUMMIE DUM DUM BIRD". Also "before this line the bird was flying the SEEKE seek routine": immediately before, it was flying `MOUNLP` (:3655-3656). Confirmed by rule-checker and by my own read of :3686-3695. | `docs/rom-study/claims/homing.json` (JT82-022) | Note the GOVER branch; drop or correct the SEEKE cross-reference |
| [LOW] | [DOC] `JT82-017` says the hatch "hands it PJOY = SEEKE **two lines of code later** (:3268)". It is 13 lines later. In a claim Dev rewrote *this round* specifically for accuracy. | `docs/rom-study/claims/homing.json` (JT82-017) | Correct the count or drop it |
| [LOW] | [DOC] `stageRound1Seed`'s docstring says it will "**hold** every enemy's counter at the CLEARED value". It seeds at 0 once; after the first matched wake the counter walks 255, 254, … The test name ("re-stage round 1's counter") is right; the docstring is not. | `tests/homing-wiring.test.ts:279` | Reword to "seed", not "hold" |
| [LOW] | [TEST] AC-7 is presented as seven tests; a single mutation (`seedHoming()` → 0) reds five of them. TEA disclosed the adjacent limit honestly in the test's own comment and each test does pin a distinct observable — this is noted only so the count is not read as seven independent signals. | `tests/homing.test.ts:466-540` | None — informational |

**The four claim-prose findings are one-line JSON edits with no code risk.** I would rather they
land on this branch before merge than become a follow-up nobody files — but they do not warrant
another full TDD round-trip, which is why this is an approval and not a rejection.

### ALL SEVEN FINDINGS FIXED ON THIS BRANCH — `9fbba7f`

Applied at the user's direction rather than deferred. **1744/1744 green, 0 skipped, `tsc` +
`vite build` exit 0, 866 claims verified, tree clean, pushed.**

| # | Fix |
|---|-----|
| M1 | `PLAY_SEEDS` is now four seeds that genuinely diversify — the reversing enemy spawns on four different pads (posX 23/113/127/231) and reverses on four different frames (93/135/97/91), each measured. The comments now state what the fixture proves instead of what it flattered itself with, and the real mechanism (jt8-1's TARTIM grace gating the first eligible wake) is **pinned by a new test**, `the first reversal does not depend on the input pattern`, which asserts an untouched stick still produces a reversal on every seed. `PLAY_FRAMES` margin re-checked against the new worst case (135). |
| M2 | `JT82-021` scoped to the truth: the sole route by which a bird **already in flight** picks up a dismounted man, with the transporter path (`STD PRIDER,U`, :5730) named explicitly so no reader mistakes a port-level choice for a transcribed one. |
| M3 | `SEEKFS_PRDIR = 1` — exported, `DECIMAL.`-tagged, cited :3584-3585, matching the file's own constant discipline; `seedHoming()` returns it. New `JT82-024` anchored on **:3584**, whose verbatim `SEEKFS\tLDA\t#1` actually carries the literal. |
| M4 | `JT82-022` now names the `GOVER` branch (:3688-3690 installs `DJOY`, "a dummie dum dum bird") and drops the incorrect claim about what ran before the line. |
| L1 | `JT82-017`: "two lines of code later" → thirteen. |
| L2 | `stageRound1Seed` docstring: it SEEDS at 0, it does not hold. |
| L3 | AC-7 redundancy — informational, no change (already disclosed in the test's own comment). |

**And my own fix had the same defect I was reviewing.** Deleting the new `:3584` claim reddened
NOTHING — `CITED_RANGES` carried `3584-3585` as one range, which the existing `:3585` claim
already satisfied. So I split it into two single-line ranges and mutation-proved each half
independently: dropping `JT82-024` now reds the `:3584` gate, dropping `JT82-020` reds the `:3585`
gate. A guard added to enforce a citation that cannot itself fail is the exact failure mode this
story exists to correct; catching it in my own patch is why the mutation pass is not optional.

Re-verified after every mutation, ending on a control run: reverting `SEEKFS_PRDIR` to 0 reds all
five AC-4 guards including the new one.

### Verified good

- [VERIFIED] **I re-derived the central inference independently, and it holds.** `grep '\bMOUNTM\b'`
  over the whole of `JOUSTRV4.SRC` returns exactly two hits — the branch at :3592 and the label at
  :3654 — with no `#MOUNTM` address-taken form (`MOUNLP`/`MOUNRI`/`MOUNRN` are interior labels of
  the mount body). Reading :3584-3595, the store at :3585 precedes every branch that leaves the
  block (`BEQ SEEKAR` :3587, `BHI SEEKFJ` :3590), so any bird reaching :3592 carries 1. No
  `CLR`/`STA`/`STD`/`STB PRDIR` appears in :3586-3694. The seed is correct.
- [VERIFIED] **The premise the unification rests on is true.** "Every `EnemyState` here is a mounted
  knight" — `collisionPass` (demo.ts:794-796) REMOVES a defeated enemy and spawns an egg, so no
  riderless bird ever persists as an `EnemyState`. I checked this rather than accepting it.
- [VERIFIED] **The default cannot be bypassed.** `grep -rn seedHoming src/` → exactly one call site,
  `enemy.ts:417`, the `??` default. Dev's decision to decline my named `demo.ts` fix in favour of
  correcting the default is strictly stronger than what I asked for, and the reasoning is written
  down. That is the right way to disagree with a reviewer.
- [VERIFIED] **AC-4 structurally cannot be observing a different facing writer.** `grep` for facing
  writes across `src/core/` finds exactly one that touches an enemy: `enemy.ts:422`, the `COM`.
  Dev's control proves this empirically; the grep proves it by construction.
- [VERIFIED] **Blast radius measured, not assumed.** I diffed a `prdir: 1` run against a `prdir: 0`
  run frame-by-frame on three seeds under two input regimes: first divergence at frames 91-97 in
  all six. Every sibling suite steps a demo for far fewer frames than that, which is *why* nothing
  needed re-baselining — a satisfying explanation rather than a lucky green.
- [VERIFIED] **The structural proofs' window arithmetic is correct.** I re-derived every new
  `slice()` bound against the vendored files: `slice(3585,3591)` = :3586-3591, `src[3583]` = :3584,
  `src[3591]` = :3592, `slice(3585,3694)` = :3586-3694, `slice(3763,3775)` = :3764-3775,
  `slice(386,404)` = SYSTEM :387-404, `slice(3252,3263)` = :3253-3263. No off-by-one. The
  test-analyzer re-derived them independently in Python and agrees.
- [VERIFIED] **The `toEqual([])` assertions are not scenery.** TEA mutation-proved four of them by
  widening each window until it reddened, and replaced the one that could not be reddened
  (`CUPROC` has no memory `CLR` anywhere in SYSTEM.SRC, so "no CLR here" was unfalsifiable) with a
  field-set scan plus a positive discriminator against the hatch site. That is the correct
  response to discovering a guard cannot fail.
- [VERIFIED] [SEC] **The core/shell purity boundary holds.** No clock, entropy, DOM, storage or
  shell import in the three changed core files, in code or comments; `purity.test.ts` /
  `purity-scanner.test.ts` pass. Independently confirmed by the security subagent line-by-line.
- [VERIFIED] [SILENT] **No swallowed failures.** `homingWake`'s three early returns are each
  intentional, commented and individually pinned. The one new `catch` narrows with
  `instanceof Error` and embeds the original cause rather than discarding it.
- [VERIFIED] [SIMPLE] **No unnecessary complexity.** The functional change is one literal. The
  round-2 test additions are large but each earns its place; nothing was abstracted prematurely,
  and the decision NOT to extract the shared claims loader yet (2× now, 3× at jt8-3) matches this
  repo's own extract-on-second-proof rule.
- [VERIFIED] **Every round-1 finding is dispositioned.** L2 cast deleted (`as unknown as` appears in
  this story's files only inside comments explaining its removal), L3 `readonly Claim[]`, L4
  `asClaim()` runtime narrowing, L5 `instanceof Error`, L7 reworded, L1 scoped to the bounder in
  all three files. M1 disclosed per my instruction. L6 declined with reasoning I accept.
- [VERIFIED] **Claims are byte-clean.** I re-read all six touched claims' `file`/`line`/`verbatim`
  against the vendored source directly — all six match exactly; `check-citations.mjs` reports 865
  verified. The defects above are in prose only, which is precisely why I read the prose by hand.
- [VERIFIED] **Final state on a clean tree:** 1738/1738 passing, **0 skipped**, 70 files;
  `npm run build` exit 0; working tree clean; `origin/develop` 0 ahead. A specialist mutated
  `tests/homing-wiring.test.ts` in the live tree mid-review and restored it — I confirmed the blob
  hash matches HEAD (`fddde96…`) before trusting any of these numbers.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

Rule-checker swept 16 rules over 74 instances and found **0 hard violations**. My own spot-checks
agree. Per-rule, instances examined in brackets:

| # | Rule | Instances | Verdict |
|---|------|-----------|---------|
| 1 | Type-safety escapes | 13 | compliant — zero live `as any`/`as unknown as`/`@ts-ignore`/`!`; round 2 REMOVED two double-casts |
| 2 | Generic/interface pitfalls | 17 | compliant — but see L5: `EnemyState` remains non-`readonly`, including the `homing` field this story added, while its sibling `PlayerView`/`HomingState` are fully readonly |
| 3 | Enum anti-patterns | 0 | N/A — string-literal unions throughout |
| 4 | `??` vs `\|\|` on falsy-but-valid | 15 | compliant — the load-bearing one. Every default guards the OBJECT, never dereferences a legitimately-0 `prdir` or 0/negative `velXIndex` first; the single `\|\|` (target.ts:88) combines two booleans |
| 5 | Module/declaration | 23 | compliant — every relative import carries `.js`; type-only re-exports use `export type` |
| 6 | React/JSX | 0 | N/A |
| 7 | Async/Promise | 3 | compliant — the one try/catch ADDS context rather than swallowing |
| 8 | Test quality | 6 | compliant mechanically — no `dist/` imports, no mocks, no vacuous shapes. The substantive test finding (M1) is about what the fixture PROVES, which no mechanical sweep can catch |
| 9 | Build/config | 0 | N/A — tsconfig/package untouched |
| 10 | Input validation | 1 | compliant — `asClaim()` validates before casting; this is the round-2 fix for the rule |
| 11 | Error handling | 1 | compliant — `instanceof Error` narrow |
| 12 | Performance/bundle | 6 | compliant — test-only dynamic import and sync `fs`; no hot-path work |
| 13 | Fix-introduced regressions | 7 | compliant — round 2 introduced no new violation of #1-#12 and repaired three |
| + | Core/shell purity | 3 | compliant |
| + | Radix-cited anchors | 4 | **1 finding** — the seed value carries no radix word (M4) |
| + | Claim prose hand-verified | 6 | **3 findings** — M2, M3, L1 |

### Devil's Advocate

Let me argue this should be rejected, because there is a real argument and it deserves stating.

The story is titled a transcription. It is not. Strip the citations away and what happened is: a
mechanism did not fire, so a constant was changed until it did. The evidence assembled around that
change is genuinely excellent — the SEEKFS→MOUNTM chain is real, machine-proven, and I re-derived
it myself — but look at what it proves and what it is used for. It proves the value for a bird
that flies at a man and mounts him. The enemies this game actually spawns, the wave complement the
guard measures, arrive by transporter and never touch that code path. For those birds, the diff's
own evidence establishes that the ROM says *nothing*: `CUPROC` clears no workspace, `WCREATE`
clears only PCHASE, `LNTSMT` never writes PRDIR. So the number that makes the feature work is, for
the enemies that matter, a choice — a good one, deterministic and disclosed, but a choice — and
`JT82-021` currently describes it as though mounting were the only way a buzzard is ever ridden.
That sentence is the difference between "we ported a value" and "we picked a value and cited a
neighbouring fact". Given that this corpus's whole purpose is to be the trustworthy record, and
given that round 1's actual defect was a byte-green claim whose prose was wrong, finding two more
byte-green claims whose prose overstates is not a small thing.

And the guard that certifies the repair certifies less than it says. I set the player's stick to
neutral for six hundred frames — no input at all, the opposite of the "human at the cabinet" its
comment describes — and it still passed, because the aggro grace expires while both parties happen
to sit on the same velocity rung. The two seeds it uses put the flipping enemy at the same
coordinates. A guard written to be copied across an epic should not carry a description its own
fixture does not earn.

So why approve? Because every one of those is a sentence, and none of them is the machine. I
checked the machine: `seedHoming` has one call site, enemy facing has one writer, defeated enemies
leave no riderless bird, the divergence lands at frame 91 on every seed I tried, and the guard
reds when I put the bug back. The port is faithful where the ROM speaks, deterministic and
disclosed where it does not, and — for the first time in this story — a buzzard actually turns
around. Round 1 was rejected for a defect in behaviour. What is left here is a defect in prose,
and the correct response to that is to say so precisely and let it be fixed, not to spend another
round-trip proving the same code twice.

What would I have missed if I had trusted the subagents? M2 — the finding I rate highest after M1.
The rule-checker verified the true half of `JT82-021` and stopped at the sentence boundary. Nobody
checks the clause you do not read.

**Handoff:** To Ruby Rhod (SM) to finish — with the four claim-prose fixes recommended on this
branch before merge.

---

### ROUND 1 (superseded — kept as history)

**Verdict:** REJECTED

One High. The mechanism is transcribed correctly, cited impeccably, and pinned by a genuinely
strong suite — and it is inert in the shipped game.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | The facing flip **never fires in real play**. `PRDIR` seeds at 0, so a flip costs 129 velocity-matched wakes; enemies accumulate 10-51 in a lifetime. Measured 20,000 frames × 2 seeds: **0 flips** idle, **0** with realistic input, 2-3 only with both sticks pinned so velocity saturates permanently. The ROM's mounted buzzard enters its brain at `PRDIR = 1` (`SEEKFS` :3584-3585) and reverses on its FIRST matched wake — the 129-walk is the ROM's *exceptional* path, and the port made it the only one. | `src/core/enemy.ts:354` (`seedHoming`) + `src/core/demo.ts:531` (`remountEnemyProcess`) | Port the `SEEKFS` short-range flag so a mounted enemy starts at the ROM's value, and add a test that observes a flip in a seeded demo under ordinary input |
| [MEDIUM] | `[EDGE]` The throttle runs on **every** wake. In the ROM `BOLEVB` is reachable only from level flight; `BODN2A`/`BOUP2A` → `BODIRL` → `BODIR` (:3840,:3899,:3870-3876) and the lava states → `BODIR3` (:3956) all bypass it. Verified by execution: a climbing enemy flips here, which the ROM cannot do. | `src/core/enemy.ts:450` | Disclose in the deviation (the gate itself is uf1-9's state machine) — no code change owed by jt8-2 |
| [MEDIUM] | `[TEST]` The `target === null` guard is indistinguishable from the mismatch gate. Mutation-proven: replace the null early-return with a `{velXIndex: 0}` default and both tests stay green, because no fixture pairs `target: null` with an enemy at `velXIndex: 0`. | `tests/homing.test.ts:199` | Add the null-target × `velXIndex: 0` case |
| [MEDIUM] | `[TEST]` The documented "omit `homing` and the first wake seeds it" contract is unexercised anywhere. Mutation-proven: replacing the `?? seedHoming()` default with `{ prdir: 200 }` leaves **all 1698 tests green**. | `src/core/enemy.ts:377` | Add a fixture with `homing` absent entirely |
| [LOW] | `[DOC]` "the ONLY thing in the ROM that ever changes a smart enemy's facing" is false for the hunter and shadow, which aim via `B2DIR`/`SHDIR` (:4122,:4141,:4353,:4372). Repeated in three files. | `src/core/enemy.ts` header, `tests/helpers/homing-contract.ts:5`, `tests/homing.test.ts:4` | Scope the sentence to the bounder |
| [LOW] | `[RULE]`/`[SEC]` Gratuitous `as unknown as Process` double-cast (rules #1, #8). Proven unnecessary by three independent checks incl. `tsc` — `DemoProcess` is already structurally assignable. | `tests/homing-wiring.test.ts:223` | Delete the cast |
| [LOW] | `[RULE]` `claimCovers(claims: Claim[])` never mutates; should be `readonly Claim[]` (rule #2). | `tests/homing-source.test.ts:48` | Add `readonly` |
| [LOW] | `[SEC]`/`[RULE]` `JSON.parse(...) as Claim \| Claim[]` with no runtime shape check (rule #10). Trusted committed file, no reachable sink; inherited verbatim from jt8-1. | `tests/homing-source.test.ts:41` | Guard, or extract the shared helper (see finding) |
| [LOW] | `[RULE]` `(e as Error).message` on an unnarrowed `catch (e: unknown)` (rule #11). Faithfully replicates the existing repo idiom. | `tests/helpers/homing-contract.ts:135` | `instanceof Error` narrow |
| [LOW] | `[TYPE]` `EnemyState`'s fields carry no `readonly` — including the new `homing?` — while the two sibling interfaces this same diff adds (`PlayerView`, `HomingState`) are fully `readonly`. The purity the JSDoc promises is unenforced by the type. | `src/core/enemy.ts:119` | Optional; pre-existing interface |
| [LOW] | `[DOC]`/`[TEST]` Comment calls 0-vs-8 "adjacent-but-unequal" — that is the full width of the FLYX range. | `tests/homing-wiring.test.ts:168` | Reword |

### Verified good

- `[VERIFIED]` **Every ROM citation is accurate.** I re-read all 20 cited lines directly from the
  vendored `JOUSTRV4.SRC`/`RAMDEF.SRC` and compared byte-for-byte — :3255, :3876-3883, :3939-3946,
  :3749, :4087, :4303, :40, and RAMDEF :190/:208/:209 all carry exactly what the code says.
  Independently corroborated by the test-analyzer's own byte-check.
- `[VERIFIED]` **129 is genuinely derived, and honestly labelled.** I re-derived it from 6809
  semantics without reading the constant: `(prdir - 1) & 0xff`, loop while bit 7 set → 129. The
  claim `JT82-008` states it AND owns that it is derived, anchored on :3942-3944, and
  `homing-source.test.ts` enforces exactly that — which is what caught `JT82-017` importing the
  conclusion into a cross-reference. This is the strongest part of the diff.
- `[VERIFIED]` **The constant cannot drift from behaviour** — `enemy.ts:377` never reads
  `PRDIR_FLIP_WAKES`; the 129 emerges from the mask. `homing.test.ts` ties the exported constant to
  both an independent re-derivation and the observed flip cadence, so changing the mask reddens.
- `[VERIFIED]` `[SEC]` **The core/shell purity boundary holds.** No clock, entropy, DOM, or shell
  import in the three changed core files, in code or comments — confirmed by the security subagent
  and by `purity.test.ts`/`purity-scanner.test.ts` (which greps comments too) passing.
- `[VERIFIED]` `[SILENT]` **No swallowed failures.** `homingWake`'s three early returns
  (enemy.ts:369,373,376) are each intentional, commented, and individually pinned; there is no
  try/catch, no fallback, and no path that silently substitutes a wrong value. The one degradation
  is safe-by-construction: a `velXIndex` that arrived `undefined` would fail the `!==` and simply
  not tick.
- `[VERIFIED]` `[SIMPLE]` **No unnecessary complexity.** `homingWake` is eight branch-free lines,
  one per ROM instruction. `viewFor` (target.ts:131) *reduces* complexity — it collapses four
  duplicated `PlayerView` constructions into one funnel, which is precisely the shape that would
  otherwise let a future field be carried on one selection branch and dropped on another.
- `[VERIFIED]` `[RULE]` **Rule #4 — the load-bearing one — is clean.** `velXIndex` is signed and 0
  is a legitimate value; every default uses `??`, and the gate itself is a direct `!==` with no
  coalescing. A `||` anywhere here would have been a real bug. Rule-checker independently agrees.
- `[VERIFIED]` **Data flow traced end-to-end:** player `entity.velXIndex` → `frame.ts:323`
  candidate → `target.ts` `viewFor` → `selectTarget` → `stepEnemy(ctx.player)` → `homingWake`
  compare → `facing` → `runBrain` `dir` → `flap()` impulse → `demo.ts:1201` draw-list op. Each hop
  is pinned by its own test, and mutating any hop reddens (Dev's M1-M5 table, which I spot-checked).
- `[VERIFIED]` **No sibling regression.** 70 files / 1698 tests green; `develop` has not moved
  (0 behind); no concurrent sibling checkout has merged this story (`origin/develop` carries no
  homing files).

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

| # | Rule | Instances | Verdict |
|---|------|-----------|---------|
| 1 | Type-safety escapes | 7 | **1 violation** — `as unknown as Process` (L2). The contract loaders' `as Partial<T>` → validate → `as T` is the sanctioned idiom, compliant |
| 2 | Generic/interface pitfalls | 14 | **2 violations** — mutable `Claim[]` param (L3); `EnemyState` non-readonly (L7, pre-existing) |
| 3 | Enum anti-patterns | 2 | compliant — string-literal unions, no `enum` anywhere |
| 4 | `??` vs `\|\|` on falsy-but-valid | 10 | compliant — the signed-index case handled correctly throughout |
| 5 | Module/declaration | 9 | compliant — every relative import carries `.js`; type-only re-exports use `export type` |
| 6 | React/JSX | 0 | N/A — no `.tsx` |
| 7 | Async/Promise | 3 | compliant |
| 8 | Test quality | 6 | **1 violation** — same cast as #1 |
| 9 | Build/config | 1 | compliant — `strict` intact, tsconfig untouched |
| 10 | Input validation | 1 | **1 violation** — `JSON.parse ... as Claim` (L4) |
| 11 | Error handling | 2 | **1 violation** — unnarrowed `(e as Error)` (L5) |
| 12 | Performance/bundle | 3 | compliant — test-only dynamic import, no hot-path work |
| 13 | Fix-introduced regressions | 3 | compliant — vacuous, no fix pass yet |
| + | Core/shell purity boundary | 3 | compliant |
| + | Radix-cited anchors | 4 | compliant |
| + | Derived-not-transcribed | 1 | compliant — the diff's strongest area |

### Devil's Advocate

Let me argue this code is broken, because on the central point it is.

The seductive thing about this diff is that it looks *more* rigorous than most work that ships. The
citations are byte-exact. The derived constant is labelled derived and independently re-derived by a
test that never reads it. Five mutations were run in RED and each reddened the intended guard. Every
subagent came back with only low-severity nits. If I judged by process, I would approve in a minute.

But process is not behaviour. Every single test either primes the counter to one wake from the flip
or drives 129 synthetic wakes at it. Not one asks the only question a player cares about: *does the
buzzard ever actually turn around?* I asked it, and across 20,000 frames on multiple seeds, with
idle players and with realistic input, the answer is no — not once. The enemies keep orbiting,
exactly as they did before the story, which is the precise defect the epic was created to fix. A
green suite of 1698 tests certified a feature that does nothing.

Worse, the information needed to prevent it was already in the session file. TEA found the `SEEKFS`
reuse, wrote it down accurately, and then rated it "Low value — worth a backlog note, not a story."
That rating was a guess, and nobody measured it. One 20-line probe would have converted the guess
into the blocking finding it is. The lesson generalises past this story: when a port drops an input
path, the honest question is not "is the mechanism faithful?" but "what values does the mechanism
actually receive now?" — and that is answered by running the game, not by reading the ROM.

A confused reader is also mistreated. Three files assert the throttle is "the ONLY thing in the ROM
that ever changes a smart enemy's facing." A jt8-3 implementer who trusts that sentence will not go
looking for `B2DIR`'s `CLR PFACE,U  FACE RIGHT` at :4122 — and will then wonder why the hunter never
aims. And the throttle currently fires during climbs and dives where the ROM forbids it, so even
once H1 is fixed, the reversals will land at moments the cabinet never produces.

What would I have missed if I had trusted the suite? Everything that matters. The suite is excellent
at proving the transcription and useless at proving the port is alive. Both are needed.

**Handoff:** Back to TEA (Leeloo) — the findings are testable and want a RED that pins observable
behaviour in a seeded demo, not another synthetic-wake proof.