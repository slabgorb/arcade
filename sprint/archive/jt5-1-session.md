---
story_id: "jt5-1"
jira_key: "jt5-1"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-1: Joust audio seam — the core event channel and the dispatch, no samples yet (the shared-engine ruling is moot post-migration)

## Story Details
- **ID:** jt5-1
- **Jira Key:** jt5-1 (local tracking only — no Jira integration)
- **Epic:** jt5 — Joust audio — the sound subsystem joust shipped without
- **Workflow:** tdd
- **Points:** 3
- **Priority:** p2
- **Stack Parent:** none (no dependencies)

## Background

**MEASURED FACTS — 2026-07-31 (the epic YAML description predates the 2026-07-30 monorepo collapse and contains three refuted claims)**

1. **The "should joust adopt @shared?" question is now MOOT.** The epic YAML still frames this as an open decision, but the monorepo migration solved it by dissolving the question. `src/shared/` is now in-tree, reached as `@shared/audio` via aliases in `vite.config.ts`, `vitest.config.ts` and `tsconfig.json`. There is no package boundary, no version pin, no git-URL dependency, and no bump ceremony — adoption is the default and costs an import line. AC1 records this as MOOT and this story does not re-litigate it.

2. **The claim "every other game consumes between four and nine subpaths" is FALSE.** Actual distinct `@shared/<subpath>` imports across `**/*.ts` per game:
   - battlezone: 13
   - star-wars: 11
   - tempest: 10
   - asteroids: 10
   - red-baron: 8
   - centipede: 5
   - **joust: 0** ← genuinely unique

   The real range is 5–13. Joust's zero consumption is accurate and singular. ⚠ **Scope flag:** `plugins/joust/README.md:112-121` repeats both stale claims — update it when this story lands.

3. **Events are carried as a state field, not a step result tuple.** The epic YAML says events are "emitted as DATA on the step result," which could suggest `stepGame()` returns `{state, events}`. Measured: `plugins/joust/src/core/game.ts:374` returns a new `GameState`, not a tuple. Events must therefore be a **field on the returned state**, exactly as asteroids precedent shows. Do not change `stepGame`'s signature to match the stale wording.

**FACTS THAT CONFIRM THE STORY IS BUILDABLE**

- **The ROM quarry exists and is vendored:** `reference/williams-source/joust/` holds `JOUSTRV1.SRC` through `JOUSTRV4.SRC` plus ~47 files. AC5's citation requirement is satisfiable from this checkout.
- **joust has a live citation gate:** `plugins/joust/docs/rom-study/claims/` holds 28 claim files; the gate runs and will validate new audio cues. Mark cues as "invention pending source" if they lack a ROM citation (AC5).
- **The three target files do not exist:** `plugins/joust/src/core/events.ts`, `plugins/joust/src/shell/audio.ts`, `plugins/joust/src/shell/audio-dispatch.ts` are all absent. joust's shell is three modules only (`input.ts`, `render.ts`, `timebase.ts`).
- **No guard test asserts zero `@shared` imports.** `plugins/joust/tests/scaffold.test.ts:119` has a comment explaining a past migration decision, but nothing will redden when the first import lands (correct the comment's tense if convenient, not load-bearing).
- **Purity guards will run:** `plugins/joust/tests/purity.test.ts` and `purity-scanner.test.ts` scan source text including comments — do not name `window.`/`document.` even in prose.
- **jt2 determinism replays exist:** `plugins/joust/tests/demo-jt2-9*.test.ts` pin replay test shapes; AC3 requires the event channel to add no RNG draw and preserve test determinism.

**EXEMPLAR PATTERN** (AC4 never-guard shape): tempest, asteroids, battlezone, red-baron all have the complete three-file seam. **Avoid star-wars** — it dispatches inline in `main.ts` with no `audio-dispatch.ts`, so the map is not unit-testable without a canvas. battlezone's header at `plugins/battlezone/src/shell/audio-dispatch.ts:1-9` states the design choice explicitly.

Game's `shell/audio.ts` holds only joust's numbers — `SOUNDS` manifest, `CHANNELS` voice map, and `DEFAULT_BASE_URL`. The engine comes from `createAudioEngine()` in `@shared/audio`. joust's base URL convention: `https://arcade-assets.slabgorb.com/joust/sfx/`.

**CONCURRENCY NOTE:** A sibling checkout (a-2) is running cp5-1 (centipede audio seam) on branch `origin/feat/cp5-1-centipede-audio-seam`. No file collision (different plugins/), no `src/shared/` contention (cp5-1 adds imports only). Its context `sprint/context/context-story-cp5-1.md` is a useful cross-reference for the same problem one game over.

**SCOPE FENCE (AC6):** No `.wav` is committed. No R2 upload. No `just deploy-assets`. joust is still SILENT when this story closes. The deliverable is the seam.

## Workflow Tracking
**Repos:** arcade
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T05:03:14Z
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-31T22:39:44Z | 2026-07-31T22:43:36Z | 3m 52s |
| red | 2026-07-31T22:43:36Z | 2026-07-31T23:35:43Z | 52m 7s |
| green | 2026-07-31T23:35:43Z | 2026-08-01T00:18:52Z | 43m 9s |
| review | 2026-08-01T00:18:52Z | 2026-08-01T05:03:14Z | 4h 44m |
| finish | 2026-08-01T05:03:14Z | - | - |

## Acceptance Criteria (VERBATIM from sprint/epic-jt5.yaml)
- The shared-versus-standalone question this story was written to rule on is recorded as MOOT, not re-litigated: the 2026-07-30 monorepo collapse removed the package boundary, so the engine imports @shared/audio directly with no pin, no git-URL dependency and no version bump.
- core/events.ts defines the event union and the sim emits it as data; joust's purity scanner still passes and no DOM, clock or randomness entered the core.
- jt2's seeded determinism replays still reproduce bit-for-bit — the event channel adds no RNG draw and no ordering change, and a test pins that.
- shell/audio-dispatch.ts maps every event kind to a cue behind a never exhaustiveness guard, so adding a kind without a cue is a compile error.
- Each cue in the manifest either cites JOUSTRV4.SRC or the sound board, or is explicitly marked an invention pending source — no cue is silently fabricated as authentic.
- No .wav is committed and no R2 upload is claimed by this story; the story states plainly that joust is still silent when it closes.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
No upstream findings at setup.

### TEA (test design)

- **Gap** (non-blocking): the FLAP has no cue, and it is the sound joust is known for.
  It is a **two-edge** cue in the ROM — the press plays wing-DOWN (`GOFLAP` → `FLAST2`,
  `LDX DSNWD,X`, JOUSTRV4.SRC:6207-6218 → SNPLWD :8126 / SNELWD :8108) and the RELEASE plays
  wing-UP (`GOFLIP`, `LDX DSNWU,X`, :6182-6184 → SNPLWU :8125 / SNELWU :8107). Our core sees only
  the press edge (`input.flap`, consumed at `frame.ts:214` and `enemy.ts:496`); the release edge
  needs state nothing tracks today. Affects `plugins/joust/src/core/` (a `flapHeld` edge detector)
  and the seam's union/manifest/dispatch. Note the ROM's own comment at :6217 reads "GET WING UP
  SOUND" over the symbol `DSNWD` — a copy-paste error in the 1982 source; trust the symbol.
  *Found by TEA during test design.*
- **Gap** (non-blocking): the two THUD cues (SNPTHD :8124 "AT LEAST 1 PERSON THUD'ED", call site
  :5014 "PLAYERS COLIDE"; SNETHD :8106 "ENEMIES THUD", call site :5019 "ENEMIES COLIDE") are
  blocked on bounce physics that does not exist. `collisionPass` computes the bounce and discards
  it (`if (contact.outcome.kind !== 'kill') continue`, `demo.ts:837`), and `bounceTop`,
  `bounceBottom` and `bounceHorizontal` have **zero production callers**. Affects
  `plugins/joust/src/core/demo.ts` (apply the bounce before cueing it) — a cue for an unapplied
  outcome would be an audible lie. *Found by TEA during test design.*
- **Gap** (non-blocking): the LAVA TROLL grab cue (SNTROL :8097 "CAPTURED BY LAVA TROLL SOUND",
  `LT1GRP` :1646-1647) cannot fire — `troll.beginGrip` has zero production callers, which
  `plugins/joust/src/core/difficulty.ts:362-367` already records as `LAVGRA`/`no-consumer-yet`,
  owner `uf1-10` (and names `uf1-11` for the live grab). Affects that story; the cue should land
  with the mechanic, not before it. *Found by TEA during test design.*
- **Gap** (non-blocking): `@shared/audio` cannot express joust's sound arbitration. The machine has
  ONE voice chosen by PRIORITY — `CMPA SPRI  OK TO INTERUPT THIS PIRORITY SOUND? / BLO NOSND`
  (SYSTEM.SRC:767-768) refuses a lower-priority interruption — while the shared engine's channels
  always steal, last-write-wins. This story's channel-per-priority rule keeps the map from
  INVERTING the ROM, but a wing-flap can still cut a death cue whenever they land on one channel by
  a later edit. Affects `src/shared/audio.ts` (an optional priority per sound) or a joust-side
  wrapper. *Found by TEA during test design.*
- **Gap** (non-blocking): the sound board's own firmware is **not vendored**.
  `reference/williams-source/joust/JOUSTSND.DOC` is three lines and its whole content is
  `SEE [LIBRARY.SOUND]VSNDRM4.SRC`, which no revision carries. So AC5's "or the sound board"
  alternative is unavailable, and nothing in this epic can cite what a 6-bit sound CODE actually
  sounds like — every sample in a later jt5 story is a recording or a synthesis, never a bake from
  source (unlike tempest's POKEY route). Affects the epic's asset stories and
  `plugins/joust/README.md`'s reference-sources section. *Found by TEA during test design.*
- **Gap** (non-blocking): P2's transporter cue is a distinct ROM table this story collapses.
  SNPCR1 (:8116, `!N$12!+$80,30` then `!N$14!+$80,255`) and SNPCR2 (:8119, the same $12 opener at
  `30+13` then `!N$15!` instead of `$14`) are bound to P1DEC and P2DEC separately (:5552, :5556).
  jt5-1 maps both knights onto SNPCR1. Affects `plugins/joust/src/shell/audio.ts` — a later story
  splitting them needs a second sample, not just a second manifest row.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): joust's ROM has a WAVE-CLEAR silence worth stating out loud. The
  38-entry table (:8051-8131) contains no wave-clear cue, no egg-laid cue and no joust-won cue —
  three of the moments this story's description lists. A future story reaching for them will find
  nothing to cite and should mark them inventions explicitly (AC5's escape hatch) rather than
  hunting. Affects `sprint/epic-jt5.yaml`'s description. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the eleven kinds were each proven to FIRE from a real code path,
  and four of them do not appear in ordinary play at all. 3×12,000 frames of the suite's own seeded
  script surfaced only seven (`egg-collected`, `enemy-death`, `enemy-materialise`, `player-death`,
  `player-materialise`, `ptero-arrives`, `wave-bounty`). The other four needed staging to observe:
  `cliff-destroyed` at wave 6+ (forced advances), `extra-man` at a ledger crossing 20,000,
  `egg-hatched` on an egg wave stepped far enough to mature, `ptero-death` with a knight at
  lance-height ABOVE a glide-band ptero. All four fire; `cueFor` returned null for none of them.
  Affects nothing today — it is a note that AC2's "no deferred kinds" guard is satisfied by
  emitters that exist, not merely by names that typecheck — but the four staged setups are worth
  a permanent test if a later story touches those paths. *Found by Dev during implementation.*
- **Gap** (non-blocking): `sprint/epic-jt5.yaml`'s `description` is still the stale pre-migration
  text SM logged at setup, and it now contradicts a landed story rather than just its own AC — it
  says the adoption ruling is open, quotes the refuted "four and nine subpaths" range, and says
  events ride "the step result". `plugins/joust/README.md` was corrected by this story; the epic
  YAML was left alone deliberately, as SM's deviation records. Affects `sprint/epic-jt5.yaml`
  (rewrite the description, or delete it in favour of the ACs). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the README carried five measured counts this story moved and
  nothing checks any of them — the suite size (75 files / 1846 tests), the claim count (883, twice),
  and the whole `skipIf` reconciliation block (94 executable / 110 literal / 16 in comments / 108
  grep lines / 29 mentioning / 28 carrying). All were re-measured and updated (80 / 1932; 897;
  95 / 111 / 16 / 109 / 30 / 29). They will go stale again on the next story that adds a test file,
  and a prose count nothing guards is the "prose claims are the unguarded surface" shape. Affects
  `plugins/joust/README.md` — either a test that re-derives them or a note that they are indicative.
  *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
- **SM, setup — the epic YAML's `description` field is stale and was NOT used for Background.**
  What the spec said: the description frames the shared-vs-standalone adoption question as an open
  ruling this story must make ("Do not assume either"), states that "the usual pin-and-bump ceremony
  applies" if joust adopts, claims "every other game consumes between four and nine subpaths", and
  says events are "emitted as DATA on the step result."
  What was changed: Background was written from measured facts instead (recorded below). The six
  `acceptance_criteria` were copied **verbatim** and are unedited — all six were diffed against
  `sprint/epic-jt5.yaml` after `sm-setup` returned, and match exactly.
  Why: the description predates the 2026-07-30 monorepo collapse. AC1 already rules the question
  MOOT, so the description contradicts its own AC. Forward impact: **the epic YAML still carries the
  stale description** — it was deliberately left alone rather than rewritten, so this entry is the
  record of which came first.

### TEA (test design)

- **Three of the moments the story names are NOT wired — the union carries eleven, not everything.**
  - Spec source: `sprint/epic-jt5.yaml` description, rendered into `context-story-jt5-1.md` §Problem.
  - Spec text: "The sim already produces every moment worth a cue: the flap, a lance joust won or
    lost, a rider unhorsed, an egg laid, collected or hatching, the buzzard, the pterodactyl
    arriving, the lava troll's grab, the wave clearing, a life lost."
  - Implementation: the union is eleven kinds — `enemy-death`, `player-death`, `egg-collected`,
    `egg-hatched`, `ptero-arrives`, `ptero-death`, `player-materialise`, `enemy-materialise`,
    `extra-man`, `wave-bounty`, `cliff-destroyed` — and a test explicitly FORBIDS the deferred
    names so none can be added without its emitter.
  - Rationale: measured, not judged. The **flap** is a two-edge ROM cue and the core sees one edge;
    the **thuds** need bounce physics whose three functions have zero production callers; the
    **lava troll's grab** cannot fire at all (`difficulty.ts:362-367` already records
    `troll.beginGrip` as having zero production callers, owner `uf1-10`). Separately the machine
    has **no** wave-clear, egg-laid or joust-won sound in its 38-entry table, so those three
    moments have nothing to cite. A declared-but-unemittable kind passes the manifest and dispatch
    sweeps (they read the same tuple) and ships a cue that can never fire.
  - Severity: major
  - Forward impact: each deferred family is a Delivery Finding above with its ROM lines and, where
    known, its owner story. The epic YAML's description still lists them as available.
- **The stream is pinned on `GameState.events`, not on the sim's own state.**
  - Spec source: `context-story-jt5-1.md`, AC2.
  - Spec text: "core/events.ts defines the event union and **the sim** emits it as data".
  - Implementation: the tests pin the stream on the state `stepGame` returns, and do not look at
    whether `DemoState` also grows a field.
  - Rationale: two of the eleven moments (`extra-man`, `wave-bounty`) are resolved by the SESSION
    layer in `game.ts`, never by `stepDemo`, so a stream homed on `DemoState` could not carry them.
    `stepGame` is also the only seam the shell reads (`main.ts:184`). This matches the epic
    context's own ruling that events ride "a field on the returned state". Dev is free to thread a
    sim-level field underneath.
  - Severity: minor
  - Forward impact: none — `GameState.events` is the surface `audio-dispatch` consumes either way.
- **Sustained cues are pinned OUT: joust's dispatch may only call `play()`.**
  - Spec source: `context-epic-jt5.md` §Guardrails.
  - Spec text: "Sustained cues are a `startLoop`/`stopLoop` pair, never repeated one-shots."
  - Implementation: a test asserts no kind produces a `startLoop` or `stopLoop`.
  - Rationale: joust has no sustained cue to pair. Every one of the machine's 38 tables is a
    priority byte followed by bounded (code, duration) pairs, and the format header names the only
    three escapes (`!N$00` extends the timer, `!N$FF` kills the sound, `!N$xx` sends a sound —
    JOUSTRV4.SRC:8045-8049). The guardrail is satisfied vacuously; a loop here would be an
    invention. The nearest thing to a `stopLoop` is the `!N$FF` KILL table (SNPFAL, SNEFAL,
    SNPTREF), and all three belong to the skid/fall chain this story does not touch.
  - Severity: minor
  - Forward impact: a later story wiring the skid chain must relax this test deliberately, and
    should — that is when the KILL-table semantics arrive.
- **A ROM-priority rule was added to the channel map that no AC asked for.**
  - Spec source: `context-story-jt5-1.md`, AC4 (and the epic's house pattern).
  - Spec text: AC4 asks only that the dispatch "maps every event kind to a cue behind a never
    exhaustiveness guard"; nothing constrains `CHANNELS`.
  - Implementation: cues sharing a channel must carry the same ROM priority.
  - Rationale: `@shared/audio` steals a channel unconditionally, while the machine REFUSES a
    lower-priority interruption (`CMPA SPRI / BLO NOSND`, SYSTEM.SRC:767-768). Without the rule a
    priority-10 cue may silence a priority-80 death, which is the exact inversion the ROM branch
    exists to prevent — and nothing else in the suite would notice.
  - Severity: minor
  - Forward impact: this is an AC reading enforced beyond the literal text, so the Reviewer should
    get to rule on it rather than discover it. It does not close the arbitration gap (Delivery
    Finding above); it only stops the map inverting the ROM.

### Dev (implementation)

- **The cue stream is threaded on a NEW `DemoState.cues` field, not derived in `game.ts` by
  diffing process lists.**
  - Spec source: `context-story-jt5-1.md`, AC2; TEA's Design Deviation "the stream is pinned on
    `GameState.events`, not on the sim's own state" ("Dev is free to thread a sim-level field
    underneath").
  - Spec text: "core/events.ts defines the event union and the sim emits it as data".
  - Implementation: `DemoState` grew a required `cues: readonly GameEvent[]`, rebuilt by every
    `stepDemo`. `collisionPass` emits four kinds where the outcome is DECIDED and returns them;
    `stepDemo` adds five more. `GameState.events` is `[...sim.cues, ...sessionCues]`.
  - Rationale: the alternative — reconstructing the moments in `stepGame` from a before/after
    process diff — is derivable but leans on id-namespace tricks to tell a HATCHED egg
    (`0x40_0000 + id` appears as an enemy) from a COLLECTED one, and a killed ptero from a ptero
    that left some other way. Emitting at the decision point cannot mistake one removal for
    another. The cost is a required field on `DemoState`; every test constructs one by spreading
    an existing state, so nothing broke, and the frozen test contract
    (`tests/helpers/demo-contract.ts`) is already a subset — it never grew `baiterClock` either.
  - Severity: minor
  - Forward impact: a later story adding a cue for a sim moment adds it in `demo.ts`, not in a
    diff. `DemoState.cues` and `DemoState.events` are two different things with similar names;
    the field's doc comment says so at length, because that confusion is exactly the defect AC3's
    rebuild test exists to catch.
- **`extra-man` is counted off the ledger's REPLAY THRESHOLD, not emitted at the award site.**
  - Spec source: TEA's handoff — "two of the eleven moments live in `game.ts` … `extra-man`
    (watch `PlayerLedger.extraManAt`, which re-arms +20,000 per award)".
  - Spec text: as above — the threshold is named as the thing to watch.
  - Implementation: `extraMenAwarded(before, after)` = `(after.extraManAt − before.extraManAt) /
    REPLAY_INTERVAL`, summed per ledger once at the end of `stepGame`.
  - Rationale: `awardExtraMen` is called from THREE exported functions (`creditScoreEvents`,
    `bookDeath`, `awardWaveBounty`) whose signatures are pinned by existing suites, so emitting
    at the award site would mean changing three public return types. The threshold moves by
    exactly one interval per award and by nothing else, so the delta is exact — including the
    several-at-once case the ROM's `BRA SCRLEV` re-check produces. Counting `lives` instead would
    be WRONG: a death decrements lives on the same frame an award increments it and the two cancel.
  - Severity: minor
  - Forward impact: none functionally. If a later story ever re-arms `extraManAt` for a reason
    other than an award, this derivation stops being exact and must move to the award site.
- **`wave-bounty` fires ONCE per award, not once per paid knight.**
  - Spec source: `context-story-jt5-1.md`, AC4 ("maps every event kind to a cue"); TEA's
    reachability note ("coop pays 3,000 each; gladiator pays the claimer").
  - Spec text: nothing constrains the multiplicity.
  - Implementation: one `wave-bounty` if ANY ledger's score moved across `awardWaveBounty`.
  - Rationale: a co-op wave pays both knights from a single WCOOP branch and the machine has one
    SNBOUN table; two cues would be the port inventing a doubling the ROM does not have. Detection
    is by a score MOVING rather than by ledger identity, because `awardWaveBounty` returns fresh
    objects whether or not it paid — so a voided co-op bonus and an unclaimed gladiator wave stay
    silent, which identity comparison would not have given.
  - Severity: minor
  - Forward impact: a story splitting per-player cues needs a per-player payload on the event,
    which the union does not carry today.
- **Both knights' transporter re-entry maps onto SNPCR1; the baiter shares the ptero's scream.**
  - Spec source: TEA's Delivery Finding "P2's transporter cue is a distinct ROM table this story
    collapses" (SNPCR1 :8116 / SNPCR2 :8119, bound separately at :5552 / :5556).
  - Spec text: as above — TEA filed the collapse as a known finding, and this implements it.
  - Implementation: `player-materialise` is one kind for both players and cites SNPCR1. Separately,
    a BAITER send-off emits `ptero-arrives` (SNPTEI) like a wave pterodactyl.
  - Rationale: the event union carries no payload, so a per-player cue would need one; the finding
    already owns that. The baiter IS a `kind:'ptero'` process with PCHASE ≠ 0 and enters the same
    way, so the introduction scream is the honest cue rather than a second invented one.
  - Severity: minor
  - Forward impact: splitting P1/P2 needs a second SAMPLE, not just a second manifest row — the
    finding says so. If a later story finds a distinct baiter cue in the table, `ptero-arrives`
    splits with it.
- **A LATENT defect was found and fixed in my own cliff emitter during self-review; it changes no
  behaviour on the shipped wave table.**
  - Spec source: `src/core/arena-state.ts:146-153` (`applyWaveDestruction`'s own doc comment).
  - Spec text: "destruction reflects the current wave, it is not cumulative" — the WCLFEW create
    path REBUILDS a cliff whose status bit is now clear.
  - Implementation: the first version counted `destroyedCliffs.length` growth. That silently
    encodes "destruction latches", which the function it reads explicitly denies: a wave that
    rebuilds CLIF1L while destroying CLIF2 leaves the count unmoved and would have gone silent.
    Replaced with a by-NAME set comparison.
  - Rationale: measured before and after — waves 1..40 contain rebuilds (w10, w15, w25, w30, w35,
    w40 all clear) but no count-preserving swap, so the emitted count is **21 either way**. This
    is recorded as a latent defect, not a live one, and the fix costs nothing.
  - Severity: minor
  - Forward impact: none. Stated because "I fixed a bug" would overclaim and "no findings" would
    hide a real reasoning error the wave table happened to cover for.

## SM Assessment — Setup

**Board state on arrival.** Story pointer read `setup`, story `backlog`, 3 points, `tdd`, p2, no
`depends_on`, no blockers or park banner. Merge gate clean.

**Sibling probes (both run before `sm-setup`).**
- Branch probe: `git fetch --prune && git branch -r | grep -Ei jt5` → no match. Nobody owned jt5-1.
- Session sweep across `a-1`/`a-2`/`a-3`: **a-2 holds a live `cp5-1` session** — the identical
  audio-seam story for *centipede*, currently in RED on `origin/feat/cp5-1-centipede-audio-seam`
  with four test files written. Contention assessed and cleared: different plugin directories, and
  `git diff --name-only` against that branch shows it touches **no `src/shared/` file** (it adds
  import lines only). The one genuinely shared surface is `.pennyfarthing/sidecars/tea/gotchas.md`
  — expect a union merge there, not a conflict to resolve by picking a side.

**Premise measurement (the reason Background was rewritten).** Three description claims were
falsifiable, so they were measured:

| Claim | Verdict |
|---|---|
| adopting `@shared` is an open ruling; "pin-and-bump ceremony applies" | **REFUTED** — `src/shared/` is in-tree since 2026-07-30; no pin, no git-URL dep, no bump. AC1 already says MOOT. |
| joust consumes nothing from `@shared` | **CONFIRMED** — 0 hits across `plugins/joust/**/*.ts`. |
| "every other game consumes between four and nine subpaths" | **REFUTED** — measured battlezone 13, star-wars 11, tempest 10, asteroids 10, red-baron 8, centipede 5. Range is 5–13. |
| events ride "on the step result" | **REFUTED** — `plugins/joust/src/core/game.ts:374` is `stepGame(game, inputs?): GameState`. There is no step-result pair; events must be a field on the returned state (asteroids precedent). Not a licence to change `stepGame`'s signature. |

**Open questions closed at setup, so TEA does not have to chase them.**
- The ROM quarry exists: `reference/williams-source/joust/` holds `JOUSTRV1–4.SRC` plus ~47 further
  files. AC5 is satisfiable from this checkout; it is not a missing-source blocker.
- joust runs a live citation gate — `plugins/joust/docs/rom-study/claims/` holds 28 claim files and
  the checker refuses to pass over an empty set. Authentic cues register there; inventions must be
  marked explicitly per AC5.
- All three target files confirmed absent. joust's shell is three modules (`input`, `render`,
  `timebase`).
- **No guard test will redden when the first `@shared` import lands.** `plugins/joust/tests/` was
  grepped: the only hit is a comment at `scaffold.test.ts:119` describing a past migration decision.
  Nothing asserts joust's zero. This was checked because mg1-9 taught that a story's own id and
  premise are often sitting inside a test that expects to die with it — here, nothing does.
- Prose this story invalidates: `plugins/joust/README.md:112-121` repeats the stale "four and nine"
  figure *and* asserts the adoption ruling is still open. Both sentences go false when this lands.

**`sm-setup` defects caught and repaired** (both are standing entries in the SM sidecar, and both
recurred): it omitted `**Repos:**` from the session file — added by hand — and it left the story at
`status: backlog` — stamped `in_progress` and verified. Fifth consecutive occurrence of the latter.

**Claim pushed immediately, both halves.** Epic stamp + context file → `main` (`c11d459`); empty
claim branch `feat/jt5-1-joust-audio-seam` pushed at zero commits ahead, purely so a sibling's
branch probe sees it. Verified visible on `origin`.
## TEA Assessment

**Tests Required:** Yes
**Tests Written:** 85 tests across 5 files, covering all 6 ACs
**Status:** RED — 69 failing / 1862 passing in the joust project; 16 pass on arrival by design (audited below)

**Suite health at handoff**
- `npm run lint` (tsc --noEmit, repo-wide): **clean**. The three not-yet-existing modules are reached
  through COMPUTED specifiers (`['..','src','core','events'].join('/')`), never a literal import, so
  the RED tree typechecks.
- `npx vitest run` (whole cabinet): **10,499 tests, 69 failed, 10,429 passed** — the passing count is
  unchanged from the pre-story baseline, so there is **zero collateral**. The grand total is checked
  against the per-file sum deliberately: a runner that had scoped itself to the five named files
  would have reported ~85.
- `npm run test:orchestrator`: **358 pass, 0 fail**.

**Test Files**
- `plugins/joust/tests/audio-events.test.ts` — AC2/AC3. The union and `EVENT_KINDS`, purity, the
  stream on `GameState`, five moments proven in ORDINARY seeded play (not fixtures), replay
  determinism, the per-frame rebuild, and the frozen pre-story sim fingerprint.
- `plugins/joust/tests/audio-manifest.test.ts` — AC1/AC4. `@shared/audio` with nothing pinned,
  `SOUNDS`/`CHANNELS`/`DEFAULT_BASE_URL`, and the ROM-priority channel rule.
- `plugins/joust/tests/audio-dispatch.test.ts` — AC4. Every kind reaches exactly one cue, the `never`
  guard, one-shots only, dispatch ordering.
- `plugins/joust/tests/audio-rom-citations.test.ts` — AC5. `CUE_SOURCES` byte-verified on BOTH sides
  (table row and call site) against the vendored tree, skipping cleanly on CI.
- `plugins/joust/tests/audio-seam-scope.test.ts` — AC6 + the doc half of AC1, plus the lang-review
  rule checks.

### The contract, in one line each

`src/core/events.ts` exports `EVENT_KINDS` (a runtime tuple) with `GameEvent` derived from it;
`stepGame` returns `events` on the state it already returns; `src/shell/audio.ts` exports `SOUNDS`,
`CHANNELS`, `CUE_SOURCES`, `DEFAULT_BASE_URL` and `createAudioEngine`; `src/shell/audio-dispatch.ts`
exports `playEventSounds(audio, events)`.

### The eleven cues, with their ROM citations (all verified byte-exact)

Every line below was re-opened from `reference/williams-source/joust/JOUSTRV4.SRC` while writing this.
Dev should transcribe these rather than re-deriving them.

| kind | cue | table (line) | prio | call site (line) |
|---|---|---|---|---|
| `enemy-death` | enemyDeath | SNEDIE (8104) "ENEMY DIES" | 40 | 2960 `LDX #SNEDIE` |
| `player-death` | playerDeath | SNPDIE (8115) "PLAYER DIES" | 80 | 4744 `LDX #SNPDIE` |
| `egg-collected` | eggCollected | SNEGG (8098) "PLAYER HITS EGG SOUND" | 45 | 3031 `LDX #SNEGG` (EGGSCR) |
| `egg-hatched` | eggHatched | SNEGGH (8099) "EGG HATCHING SOUND" | 45 | 3243 `LDX #SNEGGH` |
| `ptero-arrives` | pteroArrives | SNPTEI (8094) "PTERODACTYL INTRODUCTION SCREAM" | 65 | 1467 `LDX #SNPTEI` |
| `ptero-death` | pteroDeath | SNPTED (8091) "PTERODACTYL DYING SOUND" | 66 | 2946 `LDX #SNPTED` |
| `player-materialise` | playerMaterialise | SNPCR1 (8116) "PLAYER 1 RE-CREATED (TRANSPORTER)" | 70 | 5544 (P1DEC `FDB …,SNPCR1`) |
| `enemy-materialise` | enemyMaterialise | SNECRE (8103) "ENEMY RE-CREATED (TRANSPORTER)" | 40 | 5560 (P3DEC `FDB …,SNECRE`) |
| `extra-man` | extraMan | SNREPL (8089) "EXTRA MAN" | 100 | 7406 `LDX #SNREPL` (SCRPLY) |
| `wave-bounty` | waveBounty | SNBOUN (8096) "COLLECT BOUNTY" | 50 | 4711 `LDX #SNBOUN` |
| `cliff-destroyed` | cliffDestroyed | SNCLIF (8090) "CLIFF DESTROYER" | 67 | 2327 `LDX #SNCLIF` |

The table format is stated by the ROM itself at :8045-8049 — priority, then (code, duration) pairs,
with `!N$00` extending the timer, `!N$FF` killing the sound and `!N$xx` (01-3E) sending one. The
whole set is 38 tables at :8051-8131; these eleven are the ones whose moment this port can reach.

### Where each moment is reachable (measured, not assumed)

Proven in ORDINARY play with seed `0xbeef` under the suite's own input script — `enemy-death` at
frame 199, `egg-collected` at 214, `enemy-materialise` ×N at the wave advance at 1614,
`player-death` at 1788, `player-materialise` at 1789. Each test asserts the PRECONDITION (which is
green today: the process count really moves) before the event (which is not), so a later change that
moves the moment fails legibly instead of blaming the seam.

The remaining six were probed reachable before being demanded: `egg-hatched` via a settled wave egg
(`willHatch` → `remountEnemyProcess`), `ptero-arrives` at the wave-8 complement, `ptero-death` with a
player 8px above a ptero (a `dissolve` process appears), `extra-man` at a ledger crossing 20,000,
`wave-bounty` via `awardWaveBounty` (coop pays 3,000 each; gladiator pays the claimer),
`cliff-destroyed` at wave 6 (the first wave whose status grows `destroyedCliffs`; the bridge burns at
wave 3).

### Rule Coverage

`.pennyfarthing/gates/lang-review/typescript.md`. No `.claude/rules/` and no `SOUL.md` exist in this
repo, so the checklist is the whole rubric.

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | `#1 no type-safety escapes` | failing |
| #2 over-broad generics | `#2 no over-broad generics` | failing |
| #3 missing exhaustiveness check | `the source carries a never guard` + `every kind produces exactly one effect` + `an UNRECOGNISED kind is silent` | failing |
| #4 `\|\|` where `??` is meant | `#4 no || defaulting where ?? is meant` | failing |
| #5 missing `.js` on relative imports | `#5 every relative import carries the .js extension` | failing |
| #8 test quality (no vacuous assertions) | the mutation battery below | n/a |

Checks #6 (React/JSX), #7 (async), #9 (build config), #10 (input validation), #11 (error handling),
#12 (bundle) and #13 (fix regressions) have no surface in a data module, a manifest and a switch.

**Rules checked:** 5 of 5 applicable lang-review rules have test coverage.
**Self-check:** no vacuous assertions found. Every `toEqual([])`/`toBe('')` in the suite is an
offender-list assertion whose list is built in the same test; every determinism comparison is paired
with a non-vacuity assertion asserted BEFORE it; every doc negative was verified to MATCH the
unchanged README before being written.

### The 16 tests that PASS on arrival — audited, not assumed

Read the pass list, not the fail list. Sorted:

- **Deliberate green regression guards (9)** — the AC3 fingerprint ×3 seeds, the `src/core` purity
  sweep, `stepGame` is still pure, no audio binary committed, no source claims the samples are
  hosted, the README still says `silent`, the plugin declares no dependency. Each is a "do not break
  this" AC and each is mutation-proven below.
- **Controls that keep other tests honest (4)** — the fingerprint is discriminating, the byte-checks
  are discriminating, `flatten()` un-wraps a blockquote, `flatten()` leaves prose intact. These are
  self-proving: each asserts both a precondition and a postcondition in one test.
- **Facts about the quarry the citations rest on (3)** — the vendored tree is present (so the
  `skipIf` block is not silently grey), the sound-table format header is where the decode assumes,
  and the sound board's firmware is absent.

None was a defect. Two DEFECTS were found and fixed before commit, both in tests that were failing
for the wrong reason: `expect(promise).resolves` without `await` (a floating promise), and two
file-reads with no `existsSync` guard, which reddened as a raw `ENOENT` instead of "jt5-1 must
create src/shell/audio.ts". A third was removed outright — a scan forbidding the string
`deploy-assets` anywhere in the plugin, which would have vetoed an honest README sentence about what
a LATER story uploads.

### Mutation battery — the contract was PROBED, not just written

A throwaway implementation of the whole seam was written, run, and then mutated once per guard. Two
findings justify the cost:

1. **The contract is SATISFIABLE.** The throwaway takes the suite to **1932/1932 with `tsc` clean**.
   A red suite proves nothing about satisfiability, and an unsatisfiable contract is discovered by
   Dev at GREEN with my name on it.
2. **One guard was measured worthless and rewritten.** Mutation 3 (append the stream instead of
   rebuilding it) reddened ONE of the three rebuild tests; the other two were bounded
   (`toBeLessThan(...)`) rather than exact, and an appended stream that has gathered four events in a
   quiet window sits under any generous bound. Both now assert `toEqual([])` on frame 200 — measured
   to be a frame where the cue stream must be empty while the capped `DemoState.events` log still
   holds three entries, so one frame discriminates both ways. Same mutation after the rewrite: 4 red.

| # | mutation | tests red |
|---|---|---|
| 0 | CONTROL — no mutation | **0** (1932 pass) |
| 1 | an extra RNG draw in `stepDemo` | 5 |
| 2 | a "tidy" re-sort of the process list | 3 |
| 3 | append the cue stream instead of rebuilding it | 4 |
| 4 | commit a `.wav` under the plugin | 1 |
| 5 | add a `dependencies` block to `package.json` | 1 |
| 6 | a live browser global in `core/events.ts` | 13 |
| 7 | `stepGame` mutates its argument | 1 |
| 8a | drift ONE cited verbatim by a single byte | 1 |
| 8b | cite a real line that is the WRONG table | 2 |
| 8c | mark an authentic cue an invention | 2 |
| 9 | restore a stale README claim | 1 |
| 10 | a cue becomes a `startLoop` | 1 |
| 11 | one channel shared across two priorities | 1 |
| 12 | a source file claims the samples are hosted | 1 |
| 13 | declare a deferred/unreachable kind | 4 |

Mutation 8a first reported **zero** failures — which reads as "the whole AC5 file is scenery". It was
the MUTATION that had failed: the `$16`/`$7F` in the ROM verbatim were eaten by the shell before
python saw them, so nothing was changed. Re-run as a file with `assert needle in s`, it reddens 1.
Every mutation in the table above asserts its own landing.

Safety: the RED was committed before probing, source files were restored from `cp` backups (never
`git checkout`), and the tree is verified byte-identical afterwards by md5 — `git status` shows only
the test files, and the control run reproduces the RED exactly.

### What Dev should know before starting

- **Do not build the cue stream on `DemoState.events`.** That log is append-and-cap
  (`[...demo.events, ...collided.events].slice(-32)`, `demo.ts:1173`) and `stepGame` only tells this
  frame's entries from last frame's by a reference-set delta (`game.ts:376-380`). The cue stream must
  be rebuilt every frame, and there is a test that tells the two apart on a quiet frame.
- **Do not change `stepGame`'s signature.** It returns a bare `GameState`; the stream is a field on
  it. The epic context is explicit that the description's "on the step result" wording is not a
  licence here.
- **Two of the eleven moments live in `game.ts`, not `stepDemo`** — `extra-man` (watch
  `PlayerLedger.extraManAt`, which re-arms +20,000 per award) and `wave-bounty` (watch a score move
  across `awardWaveBounty`). The other nine are resolvable inside `demo.ts`.
- **The AC3 fingerprint is the delicate one.** Emitting events must not draw a random and must not
  reorder `sim.processes`. Note the expected order for seed `0xbeef` puts `player#1` AFTER the
  enemies — the respawn appends — and a well-meant sort would destroy exactly that.
- **`CUE_SOURCES` is data, and its citations are byte-checked on both sides.** The table above has
  every line already verified; a claims file `docs/rom-study/claims/audio.json` is also required so
  the citations ride joust's existing gate.

**Handoff:** To Bicycle Repair Man (Dev) for GREEN.
## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 1932/1932 passing in the joust project (GREEN — the exact figure TEA's throwaway
probe reached, so the contract was satisfiable as written and nothing had to be renegotiated)
**Branch:** `main` — trunk-based, committed and pushed as `2cafac2`

**Files Changed**
- `plugins/joust/src/core/events.ts` (new) — `EVENT_KINDS` as a runtime tuple, `GameEventKind`
  and the `GameEvent` union both DERIVED from it, so the shell's sweeps cannot agree with a
  hand-maintained list while the union drifts underneath.
- `plugins/joust/src/shell/audio.ts` (new) — `SOUNDS`, `CHANNELS`, `CUE_SOURCES`,
  `DEFAULT_BASE_URL`, `createAudioEngine(baseUrl?)` over `@shared/audio`.
- `plugins/joust/src/shell/audio-dispatch.ts` (new) — `playEventSounds` + `cueFor`, `never` guard.
- `plugins/joust/src/core/demo.ts` — `DemoState.cues`, rebuilt per frame; nine kinds emitted.
- `plugins/joust/src/core/game.ts` — `GameState.events`; the extra man, the wave bounty and the
  transporter re-entry.
- `plugins/joust/src/main.ts` — the engine, `resume()` on the first gesture, and the dispatch
  INSIDE the frame pump so a catch-up frame's moments are not dropped.
- `plugins/joust/docs/rom-study/claims/audio.json` (new) — 14 claims; the gate went 883 → 897.
- `plugins/joust/README.md` — the prose this story invalidated, plus five stale measured counts.

### Verification

| Gate | Result |
|---|---|
| `npx vitest run --project joust` | **1932 / 1932** |
| `npx vitest run` (whole cabinet) | **10,499 passed**, 1 todo, 703 files — zero collateral |
| `npm run lint` (tsc --noEmit, repo-wide) | clean |
| `npm run test:orchestrator` | **358 / 358** |
| `node plugins/joust/tools/audit/check-citations.mjs` | `checked 897 claim(s) / all claims verified` |

### What was verified BEYOND the suite, and what it found

A green suite proves the eleven kinds typecheck and dispatch. It does not prove any of them can
ever HAPPEN — TEA's "no deferred kinds" guard exists precisely because a declared-but-unemittable
kind passes every sweep. So each was driven from a real code path:

- 3×12,000 frames of ordinary seeded play surfaced **seven** kinds; `cueFor` returned null for none.
- The remaining four were staged and all fire: `cliff-destroyed` (forced advances past wave 6 —
  21 cues over waves 1..40), `extra-man` (a ledger crossing 20,000), `egg-hatched` (an egg wave
  stepped until a settled egg matured), `ptero-death` (a knight at lance-height above a glide-band
  ptero — a `dissolve` process appears, confirming the kill rather than the fallback).

That last probe is what caught a defect the suite could not: my first `ptero-death` staging put the
knight in the LOSING band and produced `player-death`, which is the correct cue for what actually
happened. Reading the pass as proof of the wrong thing was one geometry fix away.

**One defect in my own code, found in self-review and fixed before commit.** The cliff emitter
originally counted `destroyedCliffs.length` growth. `applyWaveDestruction`'s own doc comment says
destruction "reflects the current wave, it is not cumulative" — so a wave rebuilding one cliff
while destroying another leaves the count unmoved and would have gone silent. Replaced with a
by-name set comparison. Measured both ways across waves 1..40: the shipped table contains rebuilds
but no count-preserving swap, so the emitted count is **21 either way**. It was latent, not live,
and it is logged as such rather than as a save.

### AC coverage

| AC | Where |
|---|---|
| 1 — the ruling is MOOT, nothing pinned | `@shared/audio` imported through the alias; `package.json` still `{name,private,version}`; no relative tunnel into `src/shared` |
| 2 — the union exists, the sim emits it, purity holds | `core/events.ts`; `DemoState.cues` → `GameState.events`; the `src/core` sweep is green with the new module in it |
| 3 — replays reproduce, no RNG draw, no reorder | no `draw()` and no re-sort was added; the three frozen fingerprints (rng cursor, process ORDER, ledgers) are unmoved |
| 4 — every kind → one cue behind a `never` | `audio-dispatch.ts`; 11 kinds, 11 distinct cues, `play()` only |
| 5 — every cue cited or marked invented | `CUE_SOURCES` cites BOTH the FCB row and the call site for all eleven; zero inventions; 14 claims on the gate |
| 6 — no `.wav`, no upload, joust still silent | no binary committed, no `deploy-assets` run, no 200 checked; the README says "a seam but no samples" and still says `silent` |

**joust is still silent.** Nothing was uploaded to the assets bucket, and `@shared/audio` degrades
quietly at every failure path — so this suite going green is evidence about the wiring and about
nothing else. The eleven recordings are a later jt5 story.

**Handoff:** To The Argument Professional (Reviewer).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — mechanical checks executed directly in-session (lint, joust, cabinet, orchestrator, citation gate); all green |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — domain assessed directly by Reviewer |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — domain assessed directly by Reviewer |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — domain assessed directly by Reviewer (mutation battery; 1 major finding) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — domain assessed directly by Reviewer (1 minor finding) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — domain assessed directly by Reviewer (1 minor finding) |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — domain assessed directly by Reviewer (no findings) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — domain assessed directly by Reviewer (1 minor finding) |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Disabled via settings — the lang-review checklist was walked directly by Reviewer |

**All received:** Yes (1 enabled specialist run; 8 disabled via `workflow.reviewer_subagents`, their domains covered directly)
**Total findings:** 5 confirmed, 0 dismissed, 0 deferred

> `pf settings get workflow.reviewer_subagents` reports `preflight: true` and the other eight
> `false`. A disabled specialist is not coverage, so each domain was worked directly rather than
> claimed. Because this was a RELAY (the same session wrote the code), self-re-reading was assumed
> worthless from the start and a **mutation battery against the shipped implementation** was the
> primary instrument — 27 mutations. It found what re-reading did not.

## Reviewer Assessment

**Verdict:** APPROVED WITH FIXES APPLIED — two real defects found, both fixed and pinned in
`ec9c462`; three minor findings fixed in the same commit.

### The mutation battery (the instrument, not a formality)

27 mutations against the SHIPPED source (never a throwaway), each asserting its own landing, with
restore-from-`cp` and a clean-tree check afterwards. Highlights:

| mutation | red |
|---|---|
| CONTROL — no mutation | **0** |
| cue stream APPENDED instead of rebuilt | 4 |
| `never` guard weakened to `unknown` | 1 |
| a 12th kind with no dispatch case | **tsc FAILS** — AC4's compile-error promise is real, proven |
| two cues share a channel at different ROM priorities | 1 |
| a CUE_SOURCES verbatim drifts one byte | 1 |
| a cue becomes a `startLoop` | 1 |
| an extra RNG draw in the sim | 5 |
| the sim's cues dropped from `GameState.events` | 8 |

Nine mutations that SHOULD have reddened did not. They are the two findings below.

### CONFIRMED [RULE][AC5] — SNBOUN was sounded for awards the machine plays silently

`CUE_SOURCES.waveBounty` cites JOUSTRV4.SRC:4711. That line is byte-perfect and re-opens, and the
citation gate passes over it — but **:4711 is SNBOUN's only call site in the entire ROM**, and it
sits inside `SPDGLA` (:4691, "ONLY 1 GLADIATOR IN THE WAVE"), the gladiator partner-kill award.
The co-op bonus (:2642-2658) and the survival bonus (:2674-2693) award the identical 3,000 through
`SCRHUN` and `WAVMSG` and sound **nothing**; `WAVMSG`'s own body (:2256-2274) contains no `VSND`
either. Both were read, not inferred.

The emitter fired `wave-bounty` for all three award types. Two thirds of that cue's firings were
therefore an invention presented as authentic — the literal text of AC5 ("no cue is silently
fabricated as authentic"), and exactly the failure the citation gate structurally cannot catch,
because the quote is honest and only the SCOPE of the claim was wrong.

**Fixed** (user ruled ROM-exact when asked): `wave-bounty` fires for the gladiator claim alone, and
only when it actually paid. `CUE_SOURCES` now records the scope so a later widening is visible.
Pinned by three tests — a claimed gladiator wave cues, an unclaimed one does not, and a co-op wave
that really pays 3,000 stays silent. Re-widening the emitter reddens the suite.

### CONFIRMED [TEST] — six of eleven cues could have gone silently dead, fully green

Deleting one emitter at a time from the shipped code:

```
enemy-death / player-death  -> 5 red      egg-hatched      -> 0 red
egg-collected               -> 2 red      ptero-death      -> 0 red
enemy-materialise           -> 1 red      ptero-arrives    -> 0 red
player-materialise          -> 1 red      cliff-destroyed  -> 0 red
                                          extra-man        -> 0 red
                                          wave-bounty      -> 0 red
```

The manifest sweep, the dispatch sweep and the coverage check all read the same `EVENT_KINDS`
tuple, so they agree with each other whether or not a single event ever fires. TEA's AC2 guard
forbids seven hard-coded DEFERRED names and so cannot protect a kind that IS declared and whose
emitter merely stops firing. The five pinned kinds are exactly the five TEA reached in ordinary
seeded play; the six unpinned are the six TEA "probed reachable" during design without leaving a
test behind. Dev re-probed all six by hand at GREEN and recorded it — the right compensating action,
but a probe that is deleted protects nothing.

**Fixed:** `tests/audio-emission.test.ts`, 12 tests. Every one of the six now reddens on deletion.
Each asserts the moment before the cue, and two controls earn their keep:
- the ptero pair is staged at offset **14** — inside the 16px collision box, outside the 10±2 glide
  band — so the knight really dies. Dev's own first probe used an offset outside the box entirely,
  where *nothing happens* and a `not.toContain` passes for the wrong reason.
- the cliff sweep asserts `cued === newly-destroyed` on **every** advance instead of naming a wave.
  Naming one would have been wrong: the wave counter is BCD-packed (`nextWaveBcd` — the tenth wave
  is `0x10`), and td1-12 has not settled whether it stays BCD. My first draft asserted `wave 10` and
  failed at 16, which is how I found it.

### Minor findings, fixed in the same commit

- **[DOC][SIMPLE]** `cueFor`'s doc said "Exported so `main.ts` need not re-derive it." `main.ts`
  does not use it and nothing else does — a false statement about the codebase attached to an
  unnecessary export. Now module-private.
- **[TYPE]** `SOUNDS`/`CHANNELS`/`CUE_SOURCES` shipped as mutable `Record<...>` while TEA's manifest
  suite declares them `Readonly<Record<...>>`. The mismatch is invisible to `tsc` because the tests
  reach them through a computed specifier. Now `Readonly<>`, matching the declared contract.

### VERIFIED — challenged and upheld

- **The baiter's `ptero-arrives` is authentic, not an extension.** I suspected this was a port
  convenience. It is not: `PTERST` ("PTERODACTYL (FOR A WAVE)", :1421-1423, `CLR PCHASE` = "NOT A
  BAITER") and `BAITST` ("BAITER PTERODACTYL", :1425-1427) are adjacent entry points that fall into
  the same body and reach `LDX #SNPTEI / JSR VSND` at :1467. A baiter really does scream.
- **The `never` guard is not decoration.** Adding a 12th kind without a case fails `tsc` — AC4's
  central promise, measured rather than read.
- **AC3's fingerprint has teeth.** An added RNG draw reddens 5; the process ORDER is pinned too.
- **The silent default in `playEventSounds` is correct and deliberate**, not a swallowed error: an
  unrecognised kind must be quiet rather than audibly wrong, and a test pins it.
- **`extraMenAwarded`'s threshold derivation is right, and `lives` would have been wrong** — a death
  decrements lives on the same frame an award increments it and the two cancel.

### Known limit, stated rather than implied

Reverting the cliff emitter from the by-name set comparison to the length comparison reddens
**0** tests — because no wave in the shipped table destroys and rebuilds in the same advance, so the
two implementations are behaviourally identical on reachable data. The new test asserts the
invariant per advance (`cued === gained.length`), so it *would* fire if the table ever produced that
case; but nothing today can distinguish them. The fix stays as defensive correctness, and this note
exists so nobody reads the green suite as proof it was needed.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

| # | Check | Verdict |
|---|---|---|
| 1 | type-safety escapes | pass — no `as any`, no double-cast, no suppression; the one cast (`p as DemoProcess`) is pre-existing |
| 2 | generics/interfaces | pass — keyed by `SoundName`, not `string`; `Readonly<>` added this phase |
| 3 | exhaustiveness | pass — proven by mutation, not by grep |
| 4 | `??` vs `\|\|` | pass — `??` used on `extraManAt`, where 0 is a legitimate value |
| 5 | `.js` on relative imports | pass — all six new relative imports carry it |
| 6,7,9,10,12 | React / async / build / input-validation / bundle | N/A — a data module, a manifest and a switch |
| 8 | test quality | **was the major finding** — now fixed and mutation-proven |
| 11 | error handling | pass — silent degrade is the documented, tested design of `@shared/audio` |
| 13 | fix-introduced regressions | pass — the fix diff re-scanned; the added tests were themselves mutation-checked |

### Final state

| Gate | Result |
|---|---|
| `npx vitest run --project joust` | **1944 / 1944** (was 1932; +12 emission tests) |
| `npx vitest run` (cabinet) | **10,511 passed**, 1 todo, 704 files |
| `npm run lint` | clean |
| `npm run test:orchestrator` | **358 / 358** |
| citation gate | `checked 897 claim(s) / all claims verified` |
| working tree | clean; `ec9c462` pushed to `main` |

**AC5 is now true in the sense it was written to mean**, and the six cues that could have died in
silence cannot. joust is still silent — no sample was committed or uploaded, and nothing here
checked a live 200.

**Handoff:** To The Announcer (SM) to finish.