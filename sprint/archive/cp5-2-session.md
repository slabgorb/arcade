---
story_id: "cp5-2"
jira_key: "cp5-2"
epic: "cp5"
workflow: "tdd"
---
# Story cp5-2: Wire the centipede audio seam into main.ts — the shell actually plays the stream

## Story Details
- **ID:** cp5-2
- **Jira Key:** cp5-2
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** cp5-1

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-01T14:27:00Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T11:47:52Z | 2026-08-01T11:53:57Z | 6m 5s |
| red | 2026-08-01T11:53:57Z | 2026-08-01T12:19:25Z | 25m 28s |
| green | 2026-08-01T12:19:25Z | 2026-08-01T12:28:38Z | 9m 13s |
| review | 2026-08-01T12:28:38Z | 2026-08-01T12:46:04Z | 17m 26s |
| red | 2026-08-01T12:46:04Z | 2026-08-01T13:38:54Z | 52m 50s |
| green | 2026-08-01T13:38:54Z | 2026-08-01T13:49:26Z | 10m 32s |
| review | 2026-08-01T13:49:26Z | 2026-08-01T14:27:00Z | 37m 34s |
| finish | 2026-08-01T14:27:00Z | - | - |

## Context

### Background: Story Overview

cp5-1 built the seam (the event channel, dispatch, and manifest) and deliberately stopped short of connecting it: `createAudio` and `playEventSounds` exist, are unit-tested against a recording fake, and are called by NOTHING — `plugins/centipede/src/main.ts` does not reference either. That was the right call for cp5-1 (wiring it then would have bought 14 guaranteed 404s, and this epic's rule is that a live 200 is the acceptance test for anything audible), but it means the epic's promise that later stories are "a matter of naming a cue and baking a file" is not yet true.

The precedent games all reference `playEventSounds`/`audio-dispatch` from `main.ts`.

**Measured correction to the epic description — it is wrong in two places, both verified against the current tree at setup:**

- It says "**All four** precedent games". There are **FIVE**: tempest, asteroids, battlezone, red-baron **and joust** (`plugins/joust/src/main.ts:30` import, `:198` call). The description omits joust entirely. star-wars is a *sixth* game with audio in `main.ts`, but it is **not** a precedent for this story: it dispatches **inline** and contains zero occurrences of `playEventSounds` — which is exactly the shape cp5-1's own header comment says centipede deliberately did **not** copy.
- It says "tempest 3 sites, asteroids 3, battlezone 2, red-baron 2". That per-game census is **wrong**. All five precedents use the **identical** three-call-site shape (plus two import lines):

1. `const audio = createAudioEngine()` — tempest:40, asteroids:53, battlezone:103, red-baron:358, joust:170
2. `audio.resume()` behind a user gesture — tempest:47, asteroids:58, battlezone:105, red-baron:359 (a one-line arrow, `const unlockAudio = (): void => audio.resume()`, so a grep for a bare `audio.resume()` statement misses it), joust:174
3. `playEventSounds(audio, <events>)` inside the stepped-frame callback — tempest:98, asteroids:118, battlezone:166, red-baron:878, joust:198

### The Latent Hazard

The `audio-dispatch.ts` dispatch function has TWO runtime throws on the hot path:

- `:62` — `if (sound === undefined) throw new Error(...)` when an unmapped event kind is encountered
- `:80` — the `never` arm of the effect switch (the fallback case)

An uncaught throw inside `requestAnimationFrame` kills the frame loop and freezes the game. Today that is unreachable because nothing calls the dispatch. The moment `main.ts` calls it, a kind added to `core/events.ts` without a manifest entry stops being a compile error caught by CI and becomes a runtime freeze. The compile guard (`EVENT_SOUND: Record<GameEventKind, SoundName>` in `shell/audio.ts`) does hold, so this is a defence-in-depth question, not an open hole.

### User Ruling on AC3 — Throw vs Degrade (2026-08-01, taken at setup)

> ⚠ **USER RULING (2026-08-01, taken at setup):** **DEGRADE.** Drop the runtime throws; keep a bare `const _exhaustive: never = event`-style default arm. The compile guard (`EVENT_SOUND: Record<GameEventKind, SoundName>`) plus CI's `npm run lint` remains the real enforcement. A missing cue must cost **SILENCE, never a frozen frame loop.**
>
> **Evidence:** I grepped the default arm of every precedent's `audio-dispatch.ts`. **None of the five throws at runtime** — tempest:111-116, asteroids:57-61, battlezone:74-77, red-baron:68-71 and joust:70-75 all end in a bare `const _exhaustive: never = event` with no `throw`. Centipede is the outlier in throwing, not in degrading.

### Additional Context for TEA and Dev

1. **AC2 test design:** AC2 explicitly forbids a grep-for-the-import as the test. It demands a fake engine injected at the seam that records a cue for an ordinary played frame. The seam is `SoundSurface = Pick<AudioEngine, 'play'|'startLoop'|'stopLoop'>` in `audio-dispatch.ts:20`, and `plugins/centipede/tests/audio-dispatch.test.ts` already has a recording fake to model on.

2. **AC5 samples:** AC5 forbids committing or uploading any `.wav`. The cabinet stays silent after this story.

3. **Attract screen handling:** The description's open question "whether the attract screen needs any shell-side handling at all" is answerable from the core and should not be treated as open: `core/events.ts:23-26` states that `stepAttractDemo` runs a full playing frame and CLEARS the stream before returning, and `sim.ts:1041` returns `events: []` on a death-delay frame. So attract is already silent at the CORE and needs no shell-side guard. This is measured-and-closed, not a design question.

4. **Testing:** Existing centipede tests live in `plugins/centipede/tests/`; run one app with `npx vitest run --project centipede`.

## Acceptance Criteria

> ⚠ **User Ruling (2026-08-01, taken at setup):** **DEGRADE** — drop the runtime throws; keep a bare `const _exhaustive: never = event`-style default arm. The compile guard plus CI's `npm run lint` remains the real enforcement. A missing cue must cost SILENCE, never a frozen frame loop. See Background context above for measured evidence and the ruling.

1. main.ts constructs the engine via createAudio() and calls playEventSounds(audio, state.events) once per stepped frame, in the render/step loop — not per event and not from the core.

2. A test proves the wiring is LIVE, not merely present: a fake engine injected at the seam records a cue for an ordinary played frame. A grep for the import is not the test.

3. The throw-vs-degrade decision for an unmapped kind is made explicitly and recorded in the dispatch's own comment, because an uncaught throw inside requestAnimationFrame freezes the game.

4. The gesture gate is respected: no AudioContext is constructed before the player's first interaction, and events that land before it are dropped without error.

5. Still no .wav is committed and none is uploaded — this story wires the plumbing and the cabinet stays silent until the asset stories land, verified by a live 200.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings at setup.

### TEA (test design)

- **Gap** (non-blocking): `tests/main-loop.test.ts:4-8` states as fact that main.ts cannot be tested behaviourally — "The boot loop touches requestAnimationFrame, canvas, and pointer-lock — none of which exist in the node vitest env — so its wiring is pinned by the `?raw` source read". cp5-2 measured that claim and it is false: the shell's entire DOM surface is five canvas members plus `querySelector`/`createElement`/`addEventListener`/`location` and a bare `requestAnimationFrame`, and `tests/helpers/boot-shell.ts` now boots the real thing in ~140 lines. Affects `plugins/centipede/tests/main-loop.test.ts` (the header comment needs correcting, or it will send the next author to a sixth `?raw` pin). *Found by TEA during test design.*
- **Improvement** (non-blocking): with the harness in place, main-loop.test.ts's thirteen `?raw` source-text assertions could be re-expressed behaviourally — several of them ("wires BOTH input adapters", "builds the offscreen atlas and hands it to render()") are exactly the kind of claim a source scan cannot distinguish from a mention. Deliberately NOT done here: cp5-2 must not rewrite unrelated pins, and re-seating them is a story of its own. Affects `plugins/centipede/tests/main-loop.test.ts`. *Found by TEA during test design.*
- **Conflict** (non-blocking): `sprint/context/context-epic-cp5.md`'s precedent table omits **joust**, the same omission the cp5-2 story description carried. The table lists five games with `core/events.ts` + `shell/audio.ts` and four with `shell/audio-dispatch.ts`; joust has all three (verified on disk) and appears in neither count. Its own correction banner is therefore itself one game short, and every later cp5 story reads that table. Affects `sprint/context/context-epic-cp5.md`. *Found by TEA during test design.*
- **Question** (non-blocking): joust's audio files are being actively rewritten by a sibling checkout — `plugins/joust/src/shell/audio-dispatch.ts` last changed in `af3fed4` (jt5-4), and a-1 holds a live `jt5-4-session.md`. cp5-2 cites joust only in prose, but any later cp5 story that pins a joust line number will pin a moving target. Cite joust by SYMBOL, not by line. Affects `sprint/context/context-epic-cp5.md` and future cp5 story contexts. *Found by TEA during test design.*


#### Rework — round-trip 1

- **Gap** (non-blocking): `stepSim` ALIASES the mushroom field. The state it returns carries the very
  same `playfield.cells` `Uint8Array` it was given, mutated in place — measured on the real core, no
  mocks: `createAttract(20260801)` sums to 2457, and after 60 idle attract steps the ORIGINAL state's
  array sums to 2389, with `before.playfield.cells === after.playfield.cells` true in both attract and
  play. So holding an earlier `SimState` does not preserve its playfield: it reports the CURRENT one.
  This cost real time here — the first cut of the seed guard held the boot state and compared it 65
  frames later, which read as "main.ts ignored the seed" when the seed had been honoured exactly.
  `helpers/boot-shell.ts` now copies (`snapshotPlayfield`). The wider question is whether any other
  suite compares a held state's field, and whether a core the README calls "a deterministic **pure**
  simulation core" should hand out an aliased buffer at all — the purity guard bans globals, time and
  `Math.random`, not in-place mutation of caller-visible state. Affects `plugins/centipede/src/core/`
  (the aliasing itself, if it is to be closed) and any test that snapshots a `SimState`.
  *Found by TEA during test design.*
- **Gap** (non-blocking): three OLDER centipede suites carry stale `main.ts:` citations of exactly the
  kind the Reviewer flagged in this diff — measured, not estimated: `pointer-lock.test.ts` cites
  `main.ts:36` for "fires `canvas.requestPointerLock()`" (:36 is the cp2-13 `?wave=` comment),
  `input-distribution.test.ts` cites `main.ts:61-71` for the per-rAF sampling, and
  `highscore-entry.test.ts` cites `main.ts:58` and `:58-59` for the storage binding (the real
  `makeHighScoreStorage` call is :66). The new `tests/audio-citations.test.ts` would catch all three if
  its `SCANNED` list were widened, which is a one-line change plus the re-anchoring. Left out of scope
  here deliberately (see the Design Deviation). Affects `plugins/centipede/tests/pointer-lock.test.ts`,
  `input-distribution.test.ts`, `highscore-entry.test.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): `src/shell/audio-dispatch.ts:77` carries the SAME stale `asteroids:33-37`
  citation the Reviewer raised as a LOW against the test file. It is the production comment, so it was
  outside the finding's stated location but is the identical defect — :33-37 is the inner switch's
  `= event.source` arm; the analogous one is :57-64. Both are non-throwing, so the surrounding claim
  ("all five degrade the same way") holds either way. Dev's to correct, since TEA may not edit source.
  Affects `plugins/centipede/src/shell/audio-dispatch.ts` (line 77). *Found by TEA during test design.*
- **Conflict** (non-blocking): the Reviewer's unseeded-sim MEDIUM cites "`game-loop.test.ts:217` exists
  to forbid `Date.now()` in the reseed path". Re-resolved: :217 is a `describe` header comment,
  "AC-2 — the reseed is a fresh, deterministic sim (no Date.now/Math.random)", and the block beneath it
  asserts that a restart REBUILDS the world from `createSim`. It is about the CORE's reseed, and there
  is no assertion anywhere forbidding `Date.now()` in main.ts — the shell is explicitly allowed it
  (`purity.test.ts:59` whitelists "the shell reads Date.now()"). The finding's substance is right and
  was acted on (every sibling suite does pin a literal seed); the authority it cites is not what it
  says. Affects nothing in the tree — recorded so the next reader does not go looking for a guard that
  is not there. *Found by TEA during test design.*


### Dev (implementation)

- **Improvement** (non-blocking): wiring the seam makes **14 console 404s** appear the moment the player first interacts — one per `SOUNDS` entry, all against `arcade-assets.slabgorb.com/centipede/sfx/`. This is the cost cp5-1's description predicted ("wiring it then would have bought 14 guaranteed 404s") and the epic accepted, and it is harmless (the shared engine degrades silently; the game runs at a steady 60 fps through all of them). But until the asset stories land, anyone opening devtools on centipede meets a wall of red that looks like a bug and is not. Worth a line in `plugins/centipede/README.md` so the next person does not go hunting. Affects `plugins/centipede/README.md`. *Found by Dev during implementation.*
- **Question** (non-blocking): `plugins/centipede/index.html` requests a `favicon.ico` that does not exist, so the console carries a 404 unrelated to this story on every load. Pre-existing and out of scope here, but it is the one error in centipede's console that is NOT explained by the missing samples, and it will confuse the asset-story acceptance check ("the console should show N 404s"). Affects `plugins/centipede/index.html`. *Found by Dev during implementation.*


#### Rework — round-trip 1

- **Improvement** (non-blocking): the "does not exist yet" comment is a whole CLASS of stale claim in
  this suite, not a cp5-2 accident. Nine centipede test files still carry a RED-phase header asserting
  that a module which shipped epics ago does not exist — `atlas.test.ts:5` ("atlas.ts does not exist
  yet — RED"), `timebase.test.ts:4`, `layout.test.ts:5`, `palette.test.ts:4`, `purity.test.ts:18`,
  `player.test.ts:33`, `playfield.test.ts:24`, `scorpion.test.ts:171`, `audio-events.test.ts:12`. Every
  one is false and has been for months. They are harmless individually and corrosive together: they
  train a reader to skim exactly the sentences this story was rejected for getting wrong. A sweep is
  cheap (nine one-line edits) but is not cp5-2's. Affects `plugins/centipede/tests/` (nine file
  headers). *Found by Dev during implementation.*
- **Question** (non-blocking): `?seed=` is now centipede's THIRD shell-only debug query param
  (`?wave=`, `?demo=`, `?seed=`), each added by a different story with its own Design Deviation and its
  own parsing idiom. No sibling game has any. There is no doc listing them — a reader learns each one
  by finding its comment in `main.ts`. Worth either a short section in `plugins/centipede/README.md` or
  a `docs/` note before a fourth arrives. Affects `plugins/centipede/README.md` or `plugins/centipede/docs/`.
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): the README's primary status block contradicts the shipped code and no test
  guards it, in an epic whose own guardrail makes the docs the only defence against silent audio.
  Affects `plugins/centipede/README.md` (rewrite lines 20-24; add a guard in the
  `tests/audio-seam-scope.test.ts` style). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `comment_analyzer`, `simplifier`, `edge_hunter`,
  `silent_failure_hunter` and `type_design` are all disabled in `workflow.reviewer_subagents`. On this
  diff the disabled `comment_analyzer` was the specialist whose domain held four of eleven findings —
  the same shape as jt8-6, where every enabled check was green for three rounds while every defect sat
  in the one disabled domain. Worth re-enabling at least `comment_analyzer` for citation-heavy repos
  like this one. Affects `.pennyfarthing` settings (`workflow.reviewer_subagents.comment_analyzer`).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): a line-number citation written into a test comment goes stale the
  moment the cited file changes size, and this diff invalidated four of its own. `tempest` and
  `red-baron` already have a `tests/audit/citations.test.ts` gate that verifies a cited line still
  says what the citation claims. centipede has none, and cp5 is a citation-heavy epic. Affects
  `plugins/centipede/tests/` (consider porting the citations gate). *Found by Reviewer during code review.*

Round 3:

- **Improvement** (non-blocking): a citation gate that matches only the `file.ts:N` spelling is
  blind to the bare `:N` form, and prose written in that form goes stale unwatched — four refs did
  exactly that in this story, shifted 11 lines by the very diff whose re-anchor pass rewrote every
  prefixed token around them. cp5-2's files are fixed and the requirement is written into the
  gate's own comment, but older centipede suites and the other six games' citation-bearing tests
  have never been swept for the bare form. Affects `plugins/*/tests/` (a one-off fleet grep for
  `(at|is|was) :\d` in test prose would find the rot cheaply). *Found by Reviewer during code review.*
- **Question** (non-blocking): the reviewer subagent infrastructure failed three independent ways
  in one round — `fork failed: Device not configured` on three spawn attempts, one spawned agent
  that ran its analysis but never returned a report through two direct requests, and one that
  neither ran nor replied. The review completed by hand, but the same failures on a subtler diff
  would silently thin coverage. Affects `.pennyfarthing`/pf agent-spawn plumbing (is the pane
  respawn path healthy under tmux?). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **cp5-1's throw block was INVERTED in place, not left standing beside a new degrade block**
  - Spec source: context-story-cp5-2.md, AC3 + the `⚠ USER RULING` recorded above it
  - Spec text: "The throw-vs-degrade decision for an unmapped kind is made explicitly and recorded in the dispatch's own comment"
  - Implementation: `tests/audio-dispatch.test.ts`'s `describe('cp5-1 AC3 — an unmapped kind is a LOUD failure, not a silent no-op')` was rewritten as `describe('cp5-2 AC3 — an unmapped kind DEGRADES: the frame plays on, quietly')`. Two assertions were turned over (`toThrow` -> `not.toThrow`; "dispatches UP TO the bad event, then throws" -> "dispatches the events on BOTH sides of it"), the control was kept and strengthened, and the `verdict()` sweep and `never` guard were left untouched.
  - Rationale: TEA owns test maintenance; Dev makes tests pass and cannot move another story's goalposts. Left standing, those two would go red the instant Dev implemented the ruling and Dev would be trapped between AC3 and cp5-1's suite. cp5-1 wrote the block anticipating exactly this: "cp5-2 has to decide throw-vs-degrade... This pins what the behaviour is TODAY so that the change reds when cp5-2 makes it deliberately."
  - Severity: minor
  - Forward impact: minor — AC3's runtime half now sits under a `cp5-2` describe name, so a grep for cp5-1's ACs no longer finds it. The block's header comment records the move and the ruling's evidence.

- **AC5 gets no new test — it is already guarded, and green on arrival**
  - Spec source: context-story-cp5-2.md, AC5
  - Spec text: "Still no .wav is committed and none is uploaded — this story wires the plumbing and the cabinet stays silent until the asset stories land, verified by a live 200."
  - Implementation: no assertion written. `tests/audio-seam-scope.test.ts:107-113` already walks the whole plugin for `.wav/.mp3/.ogg/.m4a/.flac` and requires the list to be empty; `:115-127` already forbids the audio module from claiming an upload.
  - Rationale: a second copy of a claim that already has a working guard can only drift from it. The existing pair covers both halves of AC5 verbatim and would red on a regression.
  - Severity: minor
  - Forward impact: minor — AC5's coverage lives under a `cp5-1` describe name. A reader auditing cp5-2's ACs against cp5-2's tests will find four, not five, and should be pointed at `audio-seam-scope.test.ts`.

- **Only the `:62` throw is pinned; the `:80` throw is recommended to Dev, not enforced**
  - Spec source: the setup ruling as recorded above ("Drop the runtime throws... `shell/audio-dispatch.ts:62` and `:80`")
  - Spec text: AC3 itself scopes the decision to "an unmapped kind", which is `:62` alone; the ruling's wording named both sites.
  - Implementation: every AC3 assertion drives an unmapped KIND, which reaches `:62`. Nothing tests `:80`.
  - Rationale: `:80` is the `default:` arm of the effect switch. `effectFor` returns a closed three-member union and all three have case arms, so the arm is unreachable without a cast — there is no honest runtime test that distinguishes `throw` from `break` there, and writing one would mean casting my way into a branch the type system forbids. cp5-1's `verdict()` already requires the `never` binding and forbids the arm from touching the engine, and permits either ending. All five precedents end it `void _exhaustive; break`.
  - Severity: minor
  - Forward impact: minor — a Dev who removes only `:62` satisfies every test and leaves one unreachable throw on the hot path. Called out in the handoff and worth one glance from the Reviewer.


#### Rework — round-trip 1 (after Reviewer REJECTED)

- **The AC1 guard now mocks a FOURTH module (`shell/timebase`) purely to obtain a clock**
  - Spec source: context-story-cp5-2.md, AC1
  - Spec text: "main.ts ... calls playEventSounds(audio, state.events) once per stepped frame, in the render/step loop — not per event and not from the core."
  - Implementation: `pumpFrame` is wrapped to count its own callback invocations, and both the `stepSim` tap and the `playEventSounds` tap stamp their records with that count. The comparison is over `(pump, events)` pairs rather than bare arrays.
  - Rationale: the round-1 guard was blind to a one-step SHIFT, which the Reviewer proved by mutation (hoisting the dispatch above the step left 1012/1012 green). Filtering both sides to non-empty independently deletes exactly the entries that expose the offset. A step counter cannot close it either — it ticks in the MIDDLE of the callback, so a shifted dispatch reads the neighbouring value and pairs up just as convincingly. Only a clock that ticks at the callback BOUNDARY separates them, and `pumpFrame`'s own callback is the boundary. Re-verified by mutation: the hoist now reds, and the `if (sim.events.length > 0)` refactor the Reviewer required to stay green still does.
  - Severity: minor
  - Forward impact: minor — the AC1 comparison is now coupled to the pump seam. Moving the dispatch out of the `pumpFrame` callback into any other per-step site would red it even if the cues were still correct — which is the intent, since "inside the pump callback" is what AC1 is asking for, but it is a tighter contract than round 1's.

- **A shell-only `?seed=` override is DEMANDED by the tests, though no AC asks for one**
  - Spec source: context-story-cp5-2.md — ACs 1-5; none mentions determinism or a debug seed
  - Spec text: (no AC covers this; the requirement comes from the Reviewer's MEDIUM and from house pattern)
  - Implementation: `helpers/boot-shell.ts` installs `?seed=20260801` into `window.location.search`, and each of the three boot suites asserts main.ts honoured it by comparing the booted mushroom field against `createAttract(SEED)`'s. main.ts must gain a `?seed=` parser in the `?wave=` shape. This is a production change requested by TEA, not by an AC.
  - Rationale: all three suites assert EMERGENT gameplay — the `fire` cue, a spider loop opening AND closing, a multi-event step — against `createAttract(Date.now())`. Observed green is not proven green, and every other centipede suite pins a literal seed. The alternative (weakening the assertions until they hold for any seed) would gut exactly the AC2 claim that the cues come from ordinary play.
  - Severity: minor
  - Forward impact: minor — main.ts gains a third debug query param. It is shell-only and never reaches `createSim`, so the pure core stays debug-free — the same contract cp2-13's `?wave=` and cp3-3's `?demo=` were logged under. The multi-event composition pinned in `audio-wiring.test.ts` is a property of THIS seed; changing `SEED` re-measures it.

- **`tests/audio-citations.test.ts` is a new gate no AC asked for, and its scope is deliberately narrow**
  - Spec source: `.session/cp5-2-session.md`, `## Reviewer Assessment` — the round-1 MEDIUM on `main.ts:183`, the LOW on `asteroids:33-37`, and the third `### Reviewer (code review)` Delivery Finding recommending the tempest/red-baron citations gate be ported
  - Spec text: "a line-number citation written into a test comment goes stale the moment the cited file changes size, and this diff invalidated four of its own"
  - Implementation: a table of every live `main.ts:N` citation in the cp5-2 files paired with a pattern the cited line must match, plus a sweep requiring every such citation to be registered. It scans FIVE files — the four cp5-2 audio suites and the boot helper — and nothing else.
  - Rationale: four of eleven round-1 findings were stale citations, and correcting them without a gate buys one clean round and no protection. Scoping it to cp5-2's own files is the deliberate half: three OLDER centipede suites carry the same defect (filed as a Delivery Finding below), and widening the gate would red them and drag unrelated rewrites into this story — which this story already declined once, at RED, for `main-loop.test.ts`.
  - Severity: minor
  - Forward impact: minor — any future edit that moves main.ts reds this gate. That is the point, and the failure message re-locates the anchor and reports the number the citation should now read, so re-anchoring is mechanical rather than a hunt. **Dev's `?seed=` change will red all five anchors** — verified live against the throwaway implementation, which reported :109, :111, :120, :140 and :219. Re-anchor the table and the prose together.

- **The README guard was added to cp5-1's `audio-seam-scope.test.ts`, not to a new cp5-2 file**
  - Spec source: the Reviewer's round-1 HIGH ("Add a guard in the `tests/audio-seam-scope.test.ts` style so the next story cannot repeat this")
  - Spec text: as quoted
  - Implementation: a `describe('cp5-2 — the README stops saying the shell is unwired, because it is wired')` block appended to the existing file, using its `normalized()` helper and its negative/positive pairing.
  - Rationale: that file IS centipede's doc-truthfulness gate for this epic, and the claim being guarded is a continuation of the one cp5-1 guarded — the README's audio status block. Splitting it across two files would make the next author fix one and miss the other, which is how this defect happened.
  - Severity: minor
  - Forward impact: minor — cp5-1's file now carries cp5-2 assertions. A reader auditing cp5-2's tests by filename will not find them there; the block's header says which story it belongs to.

### Dev (implementation)

- **The `:80` throw was removed too, though no test required it**
  - Spec source: `.session/cp5-2-session.md`, the `⚠ USER RULING` ("Drop the runtime throws... `shell/audio-dispatch.ts:62` and `:80`") and TEA's third Design Deviation, which pinned only `:62` and recommended `:80` to my judgment
  - Spec text: AC3 scopes the decision to "an unmapped kind", which is `:62` alone; the ruling's wording named both sites.
  - Implementation: `:62`'s `throw` became `continue`; `:80`'s became the house `void unreachable; break`. Removing only `:62` would have passed every test.
  - Rationale: TEA could not write an honest test for `:80` — the arm is unreachable without a cast, so no runtime assertion can reach it — but the ruling named it and all five precedents end that arm `void _exhaustive; break`. Leaving one unreachable throw on the frame path to satisfy the letter of the test list rather than the ruling would have been the wrong reading of both. The compile-time guard is untouched: `const unreachable: never = effect` stays, which is the line that actually fails the build if a case arm is dropped.
  - Severity: minor
  - Forward impact: none — cp5-1's `verdict()` permits either ending and still requires the `never` binding and that the arm not touch the engine; all three hold.

- **`unlockAudio` is attached to `window` keydown as a SECOND listener rather than folded into the existing one**
  - Spec source: context-story-cp5-2.md, AC4
  - Spec text: "no AudioContext is constructed before the player's first interaction"
  - Implementation: added `window.addEventListener('keydown', unlockAudio)` alongside main.ts's existing keydown listener (the cp4-6 initials handler) instead of calling `audio.resume()` from inside that handler.
  - Rationale: the initials listener is guarded by `if (/^[a-zA-Z]$/.test(e.key) || e.key === 'Backspace')`, so folding the unlock into it would gate audio on letter keys only — Enter and Space, the two keys a player actually starts and fires with, would never unlock the engine. Keeping them separate also matches tempest, which attaches a named `unlockAudio` to both surfaces and leaves it attached.
  - Severity: minor
  - Forward impact: none — resume() is idempotent by contract, so the extra listener costs one no-op call per keypress.



#### Rework — round-trip 1

- **Four cp5-2 test COMMENTS were corrected, though no test required it**
  - Spec source: `.session/cp5-2-session.md`, `## Reviewer Assessment` — the round-1 HIGH ("a README that now states the opposite of what shipped")
  - Spec text: "In this epic the docs ARE the safety mechanism — a 404 and working audio are indistinguishable to the suite"
  - Implementation: `helpers/boot-shell.ts:47-52` said "**`?seed=` DOES NOT EXIST YET**", and the three boot suites' seed guards each said the override "does not exist yet" / "this is the RED that asks for it". Implementing `?seed=` made all four false. Their tense was corrected and the reasoning kept; no assertion was touched, and the failure MESSAGES were left alone (they describe the state a failure would mean, and are still right).
  - Rationale: this story was rejected for exactly this defect one round ago, in a different file. Shipping the fix for a doc that contradicted the code while knowingly leaving four test comments that contradict the code would be the same mistake with a smaller blast radius. It is a tense correction, not a goalpost move — TEA had already handed over the equivalent maintenance for the citation table.
  - Severity: minor
  - Forward impact: none — comments only. Every assertion, message and helper signature is TEA's, unchanged.

- **`?seed=` takes an arbitrary integer, with no clamp of the kind `?wave=` carries**
  - Spec source: `.session/cp5-2-session.md`, `## Design Deviations` -> TEA -> "A shell-only `?seed=` override is DEMANDED by the tests"
  - Spec text: "main.ts must gain a `?seed=` parser in the `?wave=` shape"
  - Implementation: `Number.parseInt` + `Number.isFinite`, falling back to `Date.now()`. No `WAVE_SEED_MAX` equivalent, no range clamp.
  - Rationale: `?wave=` clamps because an out-of-range wave indexes a palette table and a bad value is a broken screen. A seed indexes nothing — `createRng` accepts any integer and every value produces a valid world, which is the entire point of a seed. A clamp would only be able to reject values that work.
  - Severity: minor
  - Forward impact: none — `Date.now()` is itself an arbitrary large integer, so the fallback path already exercises the same range.

### Reviewer (audit)

Every logged deviation was checked against the code; none is a rubber stamp.

- **TEA — "cp5-1's throw block was INVERTED in place"** -> ACCEPTED. cp5-1 wrote that block
  explicitly anticipating this ("so that the change reds when cp5-2 makes it deliberately"), and
  inverting in place is correct: a parallel degrade block would leave the suite asserting both
  policies at once. Verified the control was kept and strengthened.
- **TEA — "AC5 gets no new test"** -> ACCEPTED. I read `audio-seam-scope.test.ts:107-127` and it does
  cover both halves of AC5 verbatim, green throughout. A duplicate would only drift.
- **TEA — "only the `:62` throw is pinned; `:80` recommended, not enforced"** -> ACCEPTED. The claim
  that no honest runtime test can reach that arm is correct: `effectFor` returns a closed
  three-member union and all three are cased, so reaching the default requires a cast.
- **Dev — "the `:80` throw was removed too, though no test required it"** -> ACCEPTED. This is the
  right reading of the ruling over the test list, and it cost nothing: I confirmed cp5-1's
  `verdict()` still passes, so the compile-time guard is intact.
- **Dev — "`unlockAudio` is a SECOND keydown listener"** -> ACCEPTED, and the rationale is not merely
  plausible, it is necessary: the existing handler is gated
  `if (/^[a-zA-Z]$/.test(e.key) || e.key === 'Backspace')`, so folding the unlock into it would have
  gated audio on LETTER keys only — Enter (start) and Space (fire), the two keys a player actually
  uses, would never have opened the gate.

**UNDOCUMENTED (added by Reviewer):**

- **The README was left asserting the opposite of what shipped.** Spec: cp5-1 established by AC and by
  six tests that centipede's docs must not advertise a gap that has closed, and the epic guardrail
  makes the docs the designated defence against silent audio. Code: `README.md:20-24` still says
  `main.ts` "calls neither `createAudio` nor `playEventSounds`" and names cp5-2 as future work.
  Neither TEA nor Dev logged this. Severity: HIGH.
- **The suites' dependence on an unseeded wall-clock sim is a test-strategy choice that was never
  logged.** Every sibling centipede suite pins a seed; these three do not. That is a deviation from an
  established project pattern and belonged in the deviation log where the Reviewer could rule on it
  rather than discover it. Severity: MEDIUM.

#### Reviewer (audit — round 3): the six round-trip-1 entries, previously unstamped

- **TEA — "the AC1 guard mocks a FOURTH module (`shell/timebase`) purely to obtain a clock"** →
  ✓ ACCEPTED by Reviewer: the pump-boundary argument is correct (a mid-callback counter reads the
  neighbouring value under a shift; only the entry tick discriminates), the wrapper is a typed
  pass-through, and the hoist mutation was re-killed LIVE this round by the test-analyzer's run —
  6 tests red under the mutation, 1033 green restored.
- **TEA — "a shell-only `?seed=` override is DEMANDED by the tests, though no AC asks for one"** →
  ✓ ACCEPTED by Reviewer: without it every emergent assertion is a claim about one afternoon;
  `seedWasHonoured`'s chain to the observed world was verified in round 2 and stands.
- **TEA — "`tests/audio-citations.test.ts` is a new gate no AC asked for, deliberately narrow"** →
  ✓ ACCEPTED by Reviewer, with an amendment: the narrowness had two measured holes — bare `:N`
  spellings were invisible to the sweep, and `audio-seam-scope.test.ts` was outside SCANNED — and
  round 3's findings walked through both. Fixed in `e0f8111` (file scanned, spelling required,
  probe-mutation-checked). The scope CHOICE (cp5-2's files only, older suites filed as a Delivery
  Finding) remains right.
- **TEA — "the README guard was added to cp5-1's `audio-seam-scope.test.ts`, not a new file"** →
  ✓ ACCEPTED by Reviewer: one doc-truthfulness gate per game is the design that prevents the
  fix-one-miss-the-other failure this story started with.
- **Dev — "four cp5-2 test COMMENTS were corrected, though no test required it"** → ✓ ACCEPTED by
  Reviewer: tense-only, assertions untouched (verified by diff in round 2), and shipping fresh
  false comments while fixing a false README would have been the same defect one file over.
- **Dev — "`?seed=` takes an arbitrary integer, with no clamp of the kind `?wave=` carries"** →
  ✓ ACCEPTED by Reviewer: `createRng` totalises via `seed >>> 0` and the seed indexes nothing — a
  clamp could only reject values that work. The asymmetry with `?wave=` is correct, not drift.

#### Reviewer (rework — round 3, logged by its author)

- **Reviewer edited TEA-owned test prose and extended TEA's ANCHORS table directly**
  - Spec source: the round-2 precedent in this session (three findings found and fixed in
    `c8eadae` by the same route), and the user's standing signal to end the review cycle.
  - Implementation: `e0f8111` — comment corrections in four suites, four new ANCHORS rows,
    one SCANNED addition. No assertion, message, helper or signature changed; the only executable
    change ADDS four `it.each` cases (1029 → 1033).
  - Rationale: every finding was [DOC]/[SIMPLE] with the fix fully determined by measurement;
    a TEA round-trip would have re-run the whole ceremony to retype five measured values.
  - Severity: minor. Forward impact: none — the citations suite re-proves the new anchors on
    every run, and the mutation probe demonstrated the sweep guards the newly scanned file.

## Branch

**Strategy:** trunk-based, but feature branch created per user ruling for visibility to sibling checkouts
**Branch:** `feat/cp5-2-wire-audio-seam-into-main` (empty, pushed to origin)

## Sm Assessment

**Setup complete. Handing to TEA for RED.**

### Probes run before setup (both clean)
- `git fetch --prune && git branch -r | grep -Ei cp5` → **no hits**. No sibling owns this story.
- `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` → one hit, `a-1/.session/jt5-4-session.md`,
  a different epic touching `plugins/joust/`. No file overlap with cp5-2's shell-only blast radius.
- `main` was 1 commit behind at arrival (fb04b36 → af3fed4, sw8-10); pulled before setup.

### The epic description was measurably wrong in two places
Per the standing rule that a description quoting a number or a file's current state is a claim with a
timestamp on it, I ran every falsifiable claim before spawning setup.

| Claim | Verdict |
|---|---|
| `plugins/centipede/src/main.ts` references neither `createAudio` nor `playEventSounds` | ✅ 0 occurrences, all 185 lines read |
| "All **four** precedent games" | ❌ **FIVE** — joust also wires it (`plugins/joust/src/main.ts:30`, `:198`), omitted entirely |
| "tempest 3 sites, asteroids 3, battlezone 2, red-baron 2" | ❌ census wrong; all five share the **identical** 3-call-site shape |
| `playEventSounds` throws on an unmapped kind | ✅ — and at **two** sites (`:62`, `:80`), not the one claimed |
| Compile guard `Record<GameEventKind, SoundName>` holds | ✅ `shell/audio.ts:113`, covering all 18 kinds in `core/events.ts` |
| Shared engine no-ops before first gesture | ✅ `src/shared/audio.ts:143` / `:223`/`:227`/`:231` |
| AC1's `state.events` exists | ✅ `core/sim.ts:271`, seeded `[]` at `:317` |

The epic YAML still carries the false description; the context file fronts it with a numbered
`> ⚠ CORRECTION` block rather than rewriting it, so a later reader can see which came first.

**star-wars is not a precedent** and should not be copied: it has `createAudio` but zero
`playEventSounds` because it dispatches inline — the exact shape cp5-1's header comment says
centipede deliberately avoided.

### One user ruling taken, and why it had to be taken before RED
AC3's throw-vs-degrade is an either/or, and TEA writes a different RED test per branch, so an unruled
AC3 makes RED unspecifiable (the mg1-2 lesson). I put it to the user with the precedent census
attached: **none of the five precedents throws at runtime** — tempest:111-116, asteroids:57-61,
battlezone:74-77, red-baron:68-71, joust:70-75 all end in a bare `const _exhaustive: never = event`.

**Ruling: DEGRADE.** Drop both runtime throws; the compile guard plus `npm run lint` stays the
enforcement. A missing cue costs silence, never a frozen frame loop. AC3's wording is satisfied by
the degrade branch, so the AC was left verbatim and the ruling recorded above it.

### One question the description leaves open that is actually closed
"Whether the attract screen needs any shell-side handling at all" — it does not. The core already
keeps attract silent: `core/events.ts:23-26` (`stepAttractDemo` clears the stream before returning)
and `sim.ts:1041` (`events: []` on a death-delay frame). Measured and closed; TEA should not spend a
test proving a shell-side guard that has nothing to guard.

### sm-setup defects caught and repaired
1. It wrote every correction into **this session file only** — the context file came back as a raw
   `pf context create` generation carrying both falsehoods and the generic Technical Approach/Scope
   filler, while `SETUP_RESULT` reported the context as corrected. Repaired by hand: correction
   banner + measured Technical Approach + explicit Scope.
2. Its Background sentence said "there are FIVE … **FOUR** carry the identical shape" and then listed
   five names — a self-contradicting sentence inside the correction of a four-vs-five error. Rewritten.
3. It left the story at `status: backlog` (fifth consecutive occurrence). Stamped `in_progress`.

All five ACs verified byte-identical to `sprint/epic-cp5.yaml` in both files by parsing the YAML, not
by grep. The phase pointer read `setup` on arrival and occurs exactly once in this file.

### Claim pushed
`18bfc8e` on `main` (epic stamp + context), and `feat/cp5-2-wire-audio-seam-into-main` pushed empty
(0 commits ahead) so a sibling's branch probe lights up.

### For TEA
The story is 2 points and shell-only. AC2 is the one with teeth: it explicitly rejects a
grep-for-the-import, so the test must inject a fake at
`audio-dispatch.ts:20`'s `SoundSurface` seam and observe a cue recorded for an **ordinary played
frame** — `plugins/centipede/tests/audio-dispatch.test.ts` already has a recording fake to model on.
AC5 means nothing audible ships here; the cabinet stays silent until a later cp5 story proves a live
200.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/centipede/tests/helpers/boot-shell.ts` — the stub browser that lets `src/main.ts` boot under vitest's `node` env (not a test file; no assertions)
- `plugins/centipede/tests/audio-wiring.test.ts` — AC1, AC2 (7 failing)
- `plugins/centipede/tests/audio-gesture-gate.test.ts` — AC4 (2 failing)
- `plugins/centipede/tests/audio-hot-path.test.ts` — AC3's stated rationale, end to end (1 failing)
- `plugins/centipede/tests/audio-dispatch.test.ts` — AC3 at the unit, cp5-1's block inverted (4 failing)

**Tests Written:** 14 failing across 4 ACs (AC5 already guarded — see Design Deviations)
**Status:** RED — committed as `ff06aba`

### The one decision that shaped everything: AC2 outlaws this repo's usual idiom

AC2 says "A grep for the import is not the test." Every existing centipede pin on `main.ts`
(`main-loop.test.ts`, `highscore-entry.test.ts`) reads `../src/main.ts?raw` and matches source text,
and `main-loop.test.ts:4-8` explains that booting is impossible in the node environment. I re-measured
that rather than inheriting it:

```
grep -rhoE "\b(ctx|logicalCtx)\.[a-zA-Z]+" src/shell/*.ts src/main.ts | sort -u
  -> clearRect, drawImage, fillRect, fillStyle, imageSmoothingEnabled
```

Five canvas members, plus `document.querySelector`/`createElement`, `window.addEventListener`,
`window.location` and a bare `requestAnimationFrame`. red-baron already boots its own main.ts this way
(`tests/hud-wiring.test.ts:76`), also under `environment: 'node'`. So `helpers/boot-shell.ts` stubs the
browser and **nothing else** — the real core, atlas, renderer, timebase and input adapters all run. A
frame driven through it is an ordinary played frame in AC2's sense, not a staged one. Probed before a
line of the suite was written: the harness reaches `playing` on a real Enter, fires a real shot on a
real space bar, and the run emits `shot-fired`, `mushroom-destroyed`, `segment-killed`, `spider-killed`
and a `spider-start`/`spider-stop` pair.

### Two measurements the assertions are built on

- **One rAF frame can run 14 sim steps** (the `@shared/loop` spiral clamp). This is the only condition
  under which "once per stepped frame" and "once per rAF frame" differ — at 60 Hz they are the same
  thing, which is why a naive suite would never catch the bug. The run is driven in 1000 ms bursts for
  exactly this reason.
- **6 of 212 event-bearing steps emit TWO events** (measured over 20,000 steps; a death frame
  concatenates, `sim.ts:693`). Without a multi-event step, a per-EVENT dispatch is indistinguishable
  from a per-STEP one and AC1's "not per event" would be untested. There is a dedicated test asserting
  the run actually contains one.

### Vacuity was the real adversary, and it beat me once

Nothing in `main.ts` references the seam, so every recorder starts empty and every
universally-quantified claim ("every dispatched array is correct") is trivially true of no arrays.
`audio-hot-path.test.ts` **went green on its first run** — the poisoned frame is harmless while nothing
dispatches it, so "it did not throw" described a code path that never ran. It now carries a
`poisonDispatched` tap that reds until the wiring lands. Every negative assertion in the suite is
paired with a positive existence assertion in the same file; AC4's "no AudioContext before a gesture"
is committed only alongside "one after a gesture", because the negative passes today for a reason that
has nothing to do with the gate.

### Mutation battery — the guards were ranked, not assumed

Run against a throwaway implementation, then `src/` restored from a `cp` backup and verified by md5
(`a41a8d3…`, `git status` shows no source file modified).

| Mutant | Result |
|---|---|
| correct wiring (per-step dispatch + degrade + gesture unlock) | **1012/1012 green — the RED is satisfiable** |
| dispatch hoisted out of the pump to once per rAF frame | 1 red — AC1's array comparison, alone |
| dispatch called once per EVENT | 1 red — same assertion |
| the `:62` throw restored | **7 red** — 4 unit + 3 hot-path: the freeze is real and observable |
| `resume()` at module scope instead of on a gesture | 2 red — AC4's negatives bite once wiring exists |
| dispatch into a second, silent engine | 5 red — identity + all four AC2 cue assertions |

The fourth row is the one worth keeping: the hot-path suite does not merely assert that a throw is
undesirable, it boots the loop, poisons a live frame and watches the game freeze.

### Rule Coverage

`.claude/rules/` and `SOUL.md` do not exist in this repo. `.pennyfarthing/gates/lang-review/typescript.md`
was read; the checks that bear on a test-only diff are covered as follows.

| Rule | Test(s) | Status |
|------|---------|--------|
| No `any` / unchecked casts in new code | whole diff — `tsc --noEmit` clean; casts are `as unknown as Record<string, unknown>` at the globalThis boundary only | passing |
| Exhaustiveness guards preserved | cp5-1's `verdict()` sweep + `never` binding left untouched by the AC3 inversion | passing |
| No vacuous assertions | `poisonDispatched` guard; the "at least one step emitted TWO events" guard; every negative paired with a positive | 1 vacuous file found and fixed |
| Test quality — assertions must be able to fail | six-mutant battery above; every new assertion demonstrated red under at least one mutant | passing |
| Silent-failure surfaces | AC4 pre-gesture sweep asserts every cue kind dispatches without throwing, one at a time so the offender is named | failing (RED) |

**Rules checked:** 5 of 5 applicable. **Self-check:** 1 vacuous FILE found and fixed
(`audio-hot-path.test.ts`); no vacuous individual assertions remain.

### For Dev — three things that will cost you an hour each if you meet them cold

1. **cp5-1's suite requires EXACTLY ONE `switch` reachable from `playEventSounds`**
   (`audio-dispatch.test.ts:371-379` — "a second reachable switch is a deliberate decision, not a
   refactor"). Implement the degrade with `continue`/`if`, **not** a second switch, or you red a
   passing cp5-1 test and it will look like collateral damage.
2. **Keep the `never` binding.** `verdict()` requires exactly one exhaustiveness guard binding the
   discriminant in the default arm and forbids that arm from touching the engine. Dropping the throw is
   in scope; dropping `const unreachable: never = effect` is not — the house form is
   `void unreachable; break`.
3. **The `:80` throw is unreachable and untested** (see Design Deviations). Removing only `:62` passes
   every test I wrote. All five precedents end the default arm `void _exhaustive; break`; matching them
   is recommended and is what the setup ruling intended.

The shape to copy is `plugins/tempest/src/main.ts` lines 7-8, 40, 45-51, 98 — the identical three-site
shape all five precedents use. Note centipede's constructor is named `createAudio`, not the
precedents' `createAudioEngine`.

**Verification:** `tsc --noEmit` clean · orchestrator 358/358 · full vitest 715 files / 10,737 tests,
14 failed / 10,722 passed / 1 todo — every failure in the four files above, no collateral. Totals
independently confirmed by `testing-runner` (per-file counts sum to 14, and 715 is the known full suite
size, so the run was not narrowed).

**Handoff:** To Korben Dallas (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/centipede/src/main.ts` — the three-site wiring: `createAudio()` at boot, `unlockAudio` on click + keydown, `playEventSounds(audio, sim.events)` inside the pumpFrame callback
- `plugins/centipede/src/shell/audio-dispatch.ts` — the degrade ruling: both runtime throws removed, the `never` compile guard kept, the decision and its rationale recorded in the file's own comments

**Tests:** 1012/1012 centipede (GREEN) · full vitest 716 files / 10,751 tests, **0 failed** · orchestrator 358/358 · `tsc --noEmit` clean · `node scripts/build-app.mjs centipede` builds
**Branch:** `main` (trunk-based) — commit `6c2bf1a`

### The one judgment call, and why it went the way it did

TEA's RED pinned `:62` and explicitly left `:80` to me (their third Design Deviation). Removing only
`:62` passes every test. I removed both, because the arm is on the frame path, the ruling named it, and
all five precedents end it `void _exhaustive; break`. What is NOT given up is the compile-time guard —
`const unreachable: never = effect` stays, and that is the line that fails the build if a case arm is
dropped. cp5-1's `verdict()` still passes: one `never` binding, no cast, no engine call in the arm, and
still exactly one `switch` reachable from `playEventSounds` (I used `continue`, not a second switch —
their handoff flagged that trap and it would have looked like collateral damage).

### Verified in a real browser, because vitest cannot see this

The node harness proves the wiring; it cannot prove the gate behaves against a real WebAudio
implementation. Served the working tree at `127.0.0.1:5270/centipede/` (checked the path against a
nonsense control first — the SPA-fallback trap — the HTML differs, so it is genuinely centipede):

| | requests to `arcade-assets` |
|---|---|
| after boot, attract running untouched (frame 1385) | **0** |
| after ONE keypress | **14** — one per manifest entry |

The gate is real. The phase moved `attract` -> `playing`, and the game then ran **60 frames in 1000 ms**
— the ROM's own 15750/263 Hz cadence — through fourteen failed sample loads without a stutter. That is
the silent-degrade path working end to end, and it is the half of AC4 ("events that land before it are
dropped without error") that a fake engine can only approximate.

Console afterwards: those 14 404s, plus one pre-existing `favicon.ico` 404, and nothing else. No
exception, no freeze.

**The 14 404s are expected and are the story working as designed** — cp5-1's description predicted them
("wiring it then would have bought 14 guaranteed 404s") and AC5 requires the cabinet stay silent until
the asset stories upload samples and verify a live 200. A green suite here is explicitly NOT evidence
that centipede has sound. Filed as a Delivery Finding that the README should say so.

### AC coverage

| AC | Where | State |
|----|-------|-------|
| AC1 engine via `createAudio()`, dispatch once per stepped frame | `audio-wiring.test.ts` (4 tests) | green |
| AC2 fake engine records a cue for an ordinary played frame | `audio-wiring.test.ts` (4 tests) | green |
| AC3 throw-vs-degrade decided and recorded in the comment | `audio-dispatch.test.ts` (5) + `audio-hot-path.test.ts` (5) | green |
| AC4 gesture gate respected, pre-gate events dropped without error | `audio-gesture-gate.test.ts` (6 tests) | green |
| AC5 no `.wav` committed, none uploaded | `audio-seam-scope.test.ts:107-127` (cp5-1's, green throughout) + browser check above | green |

**Handoff:** To Jean-Baptiste Emanuel Zorg (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (+3 clean) | confirmed 4, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 5 rule + 1 citation | confirmed 6, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 11 confirmed, 0 dismissed, 0 deferred

**Coverage I took on myself, because the specialist is disabled.** `comment_analyzer` is OFF on this
project, and this diff is the worst possible one to run without it: ~25 line citations, an AC that
literally requires a comment, and two source files that GREW, invalidating citations pointing into
them. Four of my eleven findings are in that domain. `simplifier` and `edge_hunter` are also off — I
covered them by hand (dead-export sweep of the new helper; the edge list in Devil's Advocate below).
This is the jt8-6 lesson repeating: every enabled check was green there too, and every defect lived
in the one disabled domain.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (15 numbered checks). There is no
`.claude/rules/` and no `SOUL.md` in this repo — confirmed absent on disk, and no rule was invented
from either.

| # | Rule | Instances checked | Verdict |
|---|------|-------------------|---------|
| 1 | Type-safety escapes | 6 | compliant — the two `as unknown as` casts are the established house idiom (`red-baron/tests/hud-wiring.test.ts:64` for globals; `joust/tests/audio-flap.test.ts:116` for a deliberately-malformed event) |
| 2 | Generic/interface pitfalls | 0 | not applicable |
| 3 | Enum anti-patterns | 1 | compliant — no `enum`; the `effect` switch keeps `const unreachable: never = effect` |
| 4 | Null/undefined handling | 5 | compliant — all `??`, all on `Map.get()`/global fallbacks |
| 5 | Module/declaration | 12 imports | compliant — type-only imports use `import type`/inline `type` |
| 6 | React/JSX | 0 | not applicable |
| 7 | Async/Promise | 3 | compliant |
| 8 | **Test quality — mock signatures** | 4 | **VIOLATION** — see F4 |
| 9 | Build/config | 0 | not applicable |
| 10 | Type-level input validation | 0 | not applicable — no API boundary |
| 11 | **Error handling** | 3 catch sites | **VIOLATION (1)** — see F8 |
| 12 | Performance/bundle | 0 | compliant |
| 13 | Fix-introduced regressions | whole diff | compliant — production code (`main.ts`, `audio-dispatch.ts`) is clean; both violations are in new test infra |
| 14 | Derived edges inside one branch | 2 | compliant — the dispatch sits at the single choke point in the pump callback, after the demo guard. I also checked the OTHER path that reassigns `sim` (`enterInitial`, `main.ts:118`): `core/sim.ts` spreads state and never rebuilds `events`, so it drops no cue |
| 15 | Source-text assertion matching a TOKEN not a CLAIM | 3 | compliant — the AC3 doc regex is paired (old rationale absent + new present) and the behaviour is independently pinned by four sibling `it()` blocks |

CLAUDE.md rules: core/shell boundary **compliant** (no `src/core/` file touched; `shell` importing
`type GameEvent` from core is the permitted direction) · shared-code reuse **compliant** (builds on
`@shared/audio`, forks nothing) · no `.wav` committed **compliant** (0 in diff) · epic live-200
guardrail **compliant** and correctly restated at `main.ts:99-102`.

### Devil's Advocate

Let me argue this is broken. The strongest case is not against the production code — two independent
specialists and my own reading found `main.ts` and `audio-dispatch.ts` clean, the security trace found
no remaining synchronous throw on the frame path, and I watched the real browser run 60 fps through
fourteen failed sample loads. The strongest case is that **this story has quietly made the repository
lie about itself, and built its safety net out of observation rather than proof.**

Start with the lie. A developer arriving tomorrow reads `README.md` and is told, in bold, that the
shell is "**not connected**" and that connecting it "is story `cp5-2`". That story shipped. In any
other epic this is an annoyance; in *this* one it is a hole in the designated safety mechanism,
because the epic's own guardrail — quoted in cp5-1's test file — is that a 404 and working audio are
indistinguishable to the suite, so "the only defence is that the docs say plainly which one it is."
The defence now says the opposite of the truth. Worse, cp5-1 anticipated exactly this failure and
spent six tests on it; cp5-2 inherited the pattern and not the discipline, and wrote no guard at all.

Now the proof. Three new suites boot the real game off `createAttract(Date.now())` and then assert
that emergent gameplay happened: a shot fired, a spider came and went, and some step emitted two
events — the last measured at roughly six occurrences per twenty thousand steps. Every other centipede
suite pins a literal seed, and one of them exists specifically to forbid `Date.now()` in the reseed
path. Eight green runs is evidence, not a guarantee; the first red one will land in CI on somebody
else's story and read as their fault.

And the guard that matters most is weaker than it says. AC1's headline test filters each side of its
comparison independently, which means a dispatch shifted a whole step — every cue firing one frame
late, the natural consequence of writing the call above `stepSim` instead of below it — passes. I did
not argue this; I built the mutant and watched 1012 tests go green over it. The test's own failure
message promises "array for array, the events the core emitted per step." It does not deliver that.

What would a confused user do? Open devtools, see fourteen red 404s appear the instant they press a
key, and file a bug. Nothing in the repo tells them that is expected — Dev filed it as a finding
rather than fixing it, which is the right call for scope but leaves the trap armed.

What survives this: attract is genuinely silent (0 events over 30,000 steps), the gesture gate genuinely
holds in a real browser (0 requests before, 14 after), the degrade genuinely keeps the loop alive, and
the AC1 guard genuinely rejects the two bugs it was built for while tolerating two valid refactors. The
code is right. The claims around it are not yet.


## Reviewer Assessment

**Verdict:** REJECTED

One HIGH plus six MEDIUM. The production code is sound — I am not asking for a behaviour change. What
fails review is the layer of CLAIMS around it: a README that now states the opposite of what shipped,
four line citations that this diff invalidated by growing the files they point into, and two
test-quality defects that make the suite weaker than its own messages promise.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | README status block states the shell is "**not connected**" and that `main.ts` "calls neither `createAudio` nor `playEventSounds`", and names cp5-2 as the future story that will do it. Every clause is false as of 6c2bf1a. In this epic the docs ARE the safety mechanism — a 404 and working audio are indistinguishable to the suite, so cp5-1 spent six tests (audio-seam-scope.test.ts) enforcing README truthfulness. No guard exists on this claim. | plugins/centipede/README.md:20-24 | Rewrite: the shell IS connected as of cp5-2; the cabinet is still silent because no sample is uploaded; the first gesture now produces 14 console 404s and that is expected. "Two things are still missing" becomes one. Add a guard in the audio-seam-scope.test.ts style so the next story cannot repeat this. |
| [MEDIUM] [TEST] | AC1's headline guard is blind to a one-step SHIFT. `nonEmpty()` is applied to each side independently, so dispatching the PRIOR step's events leaves both non-empty subsequences identical. CONFIRMED by mutation: moving `playEventSounds` above `sim = stepSim(...)` passes 1012/1012. The failure message claims "array for array, the events the core emitted per step" — a per-step correspondence it does not enforce. | tests/audio-wiring.test.ts (the "every stepped frame..." test) | Record a step INDEX on both sides and compare (index, events) pairs. Do NOT switch to a raw index-for-index compare: mutant R2 confirms `if (sim.events.length > 0) playEventSounds(...)` is a valid equivalent refactor and must stay green. |
| [MEDIUM] [TEST] | The three boot suites drive an UNSEEDED sim (`createAttract(Date.now())`, main.ts:137) and assert emergent gameplay — the `fire` cue, a spiderLoop start AND stop, and "at least one step emitted TWO events" (measured at ~6 per 20,000 steps). Every other centipede suite pins a literal seed; game-loop.test.ts:217 exists to forbid `Date.now()` in the reseed path. 8/8 observed green, but observed is not proven. | tests/audio-wiring.test.ts, audio-gesture-gate.test.ts, audio-hot-path.test.ts | Add a shell-only seed override in the shape of the existing `?wave=` param and pin it in all three. |
| [MEDIUM] [RULE] [TEST] | Four `vi.mock` wrappers type their forwarded parameters `never` instead of deriving them from the real export. Rule #8 names this; the house pattern is `Parameters<typeof actual.fn>[0]` (red-baron/tests/prop-clock-wiring.test.ts:88,101). Measured: 10 repo files use the importOriginal idiom, only these 2 use `never`. `createAudio: (): unknown` also drops the real `baseUrl` parameter outright. | tests/audio-wiring.test.ts:67,91,103 · tests/audio-hot-path.test.ts:67,82 | Use `(...args: Parameters<typeof real.fn>)` so a future parameter is forwarded, not silently swallowed. |
| [MEDIUM] [RULE] | `main.ts:183` cited twice as "the trailing `requestAnimationFrame(frame)`". Real lines are 216 and 218; 183 is now `const board = sim.highScoreTable` — a real, plausible, WRONG line, so a reader who checks it is actively misled. Introduced by this diff growing main.ts by 33 lines. Found independently by me and by rule-checker. | tests/audio-dispatch.test.ts:1147 · tests/audio-hot-path.test.ts:174 | Correct to :216. |
| [MEDIUM] | `main.ts:84-86, :92-94` cited as the listeners main.ts "already owns". Real: canvas click at :108, initials keydown at :117. Same cause. | tests/audio-gesture-gate.test.ts:61 | Correct to :108 and :117. |
| [MEDIUM] | `sim.ts:723` (wave clear) is offered as an explanation for the measured 6 two-event steps. MEASURED pairs: 3x `player-died+march-stop`, 2x `march-start+spider-stop`, 1x `shot-fired+segment-killed`. No wave-clear pair occurs; the death citation covers only 3 of 6. A real line cited as corroboration for something it did not cause. | tests/audio-wiring.test.ts (the "TWO events" test) | State the measured composition, or drop the causal clause. |
| [LOW] [RULE] | `catch (e) { ... e as Error }` casts from `unknown` with no `instanceof` narrowing (Rule #11). | tests/audio-hot-path.test.ts:122-124 | Narrow, or type the field `unknown`. |
| [LOW] | `asteroids:33-37` cited for "a bare `const _exhaustive: never = event`" — that span binds `event.source`; the `= event` arm is :57-62. Both are non-throwing so the CLAIM holds, but the citation points at the less analogous of two arms. | tests/audio-dispatch.test.ts | Cite :57-62. |
| [LOW] [TEST] | boot-shell's listener registry is keyed by event type only and shared across document, window and every canvas, so `emit('click')` fires listeners on any target. No collision exists today. | tests/helpers/boot-shell.ts:~56 | Key by (target, type). |
| [LOW] [SIMPLE] | `sim()` is exported on the harness with 0 call sites — dead API in a brand-new file. | tests/helpers/boot-shell.ts | Remove, or use it. |


### Specialist tag coverage

Five of the nine specialists are disabled in `workflow.reviewer_subagents`, so their domains were
covered by hand rather than claimed from a subagent that never ran.

- [TEST] — reviewer-test-analyzer, ENABLED. 4 findings, all confirmed (the one-step-shift hole, the
  unseeded sim, the mock signatures, the listener map). Its shift finding I re-verified by mutation.
- [RULE] — reviewer-rule-checker, ENABLED. 15 rules enumerated; 2 violations confirmed (#8 mock
  signatures, #11 catch-cast) plus independent corroboration of the main.ts:183 citation defect.
- [SEC] — reviewer-security, ENABLED. Clean. Traced every path beneath `playEventSounds` for a
  surviving synchronous throw, checked gesture-driven resource exhaustion and URL-controlled input.
- [DOC] — comment-analyzer DISABLED. Covered by me, and it was the richest seam: four of eleven
  findings are stale or unsupported citations (main.ts:183 x2, main.ts:84-86/:92-94, sim.ts:723,
  asteroids:33-37). Every citation in the diff was resolved by hand against its target.
- [SIMPLE] — simplifier DISABLED. Covered by me: dead-export sweep of the new helper found
  `sim()` with 0 call sites; no other over-engineering found (all other exports and harness methods
  are used).
- [EDGE] — edge-hunter DISABLED. Covered by me in Devil's Advocate and by mutation: empty frames,
  catch-up bursts (14 steps), the demo-frozen path, attract (0 events / 30,000 steps), repeated
  gestures, and the first/last-step boundary that turned out to hide the shift defect.
- [SILENT] — silent-failure-hunter DISABLED. Covered by me and corroborated by [SEC]: the whole
  story is a deliberate silent-degrade change, so this was the domain I pushed hardest — the removed
  throws are replaced by `continue`/`break`, and the risk that degrading hides a real fault is
  answered by the compile guard (`EVENT_SOUND: Record<GameEventKind, SoundName>`) plus cp5-1's
  `verdict()` sweep, both verified still intact.
- [TYPE] — type-design DISABLED. Covered by me and by [RULE]: no new public types beyond the test
  helper's `ShellHarness`; the `never`-typed mock parameters are the one real type-design defect and
  are recorded above.

**Data flow traced:** player keypress -> `createKeyboardAdapter` (window keydown) -> `sampleStep()`
-> `pumpFrame` -> `stepSim` -> `SimState.events` (rebuilt per step) -> `playEventSounds` ->
`EVENT_SOUND` lookup -> `@shared/audio` `play`/`startLoop`/`stopLoop` -> silent no-op until
`resume()`. Safe because the lookup precedes `effectFor`, so a malformed `event.type` can never
reach `.endsWith()` (a real TypeError risk) — it is skipped first. Independently traced by
reviewer-security.

**Pattern observed:** GOOD — the dispatch is sited inside the pump callback and AFTER the
`if (demoKind) return` guard (main.ts:178-192), so a frozen demo frame plays nothing. That ordering
is load-bearing and easy to get wrong.

**Error handling:** the two throws are gone from the frame path and no synchronous throw remains
anywhere beneath `playEventSounds` (`@shared/audio` wraps `startSource` and `stopChannel` in their
own try/catch, and `resume()` catches ctor failure). VERIFIED by mutation: restoring the throw reds 7
tests including the booted hot-path suite.

**Verified good (evidence):**
- [VERIFIED] Attract stays silent with the seam live — 0 events across 30,000 steps from
  `createAttract(20260801)`. The core's promise (`core/events.ts:23-26`) still holds now that
  something is listening.
- [VERIFIED] The gesture gate holds in a REAL browser, not just against a stub — 0 requests to
  arcade-assets after boot + 60 untouched attract frames, 14 after one keypress.
- [VERIFIED] "up to 14 steps in one frame" is exact: `@shared/loop.ts:45` clamps elapsed to 0.25 s,
  FRAME_DT = 263/15750 s, 0.25/0.0167 = 14.97 -> 14 whole steps.
- [VERIFIED] The AC1 guard tolerates valid refactors — reordering the dispatch past the high-score
  save, and skipping empty frames, both stay 1012/1012 green. It is not brittle; it is (per the
  MEDIUM above) too permissive in one specific direction.
- [VERIFIED] All five precedent default-arm citations, all seven `@shared/audio` citations, all
  seven `core/sim.ts`/`events.ts` citations, and the tempest three-site citation resolve to what
  they claim. The citation defects are confined to files this diff changed.
- [VERIFIED] cp5-1's `verdict()` sweep still passes after the throw removal — one `never` binding,
  no cast, no engine call in the default arm, exactly one switch reachable from `playEventSounds`
  (Dev used `continue`, not a second switch).

**Handoff:** Back to Dev for fixes.

---
## TEA Assessment (rework — round-trip 1)

**Tests Required:** Yes
**Test Files:**
- `tests/audio-wiring.test.ts` — AC1 rebuilt on a PUMP INDEX; seed guard; measured composition pinned
- `tests/audio-gesture-gate.test.ts` — seed guard; both gesture citations re-taken
- `tests/audio-hot-path.test.ts` — seed guard; mock signatures; `catch` narrowed; two citations re-taken
- `tests/audio-dispatch.test.ts` — two citations re-taken (comment only, no assertion changed)
- `tests/audio-seam-scope.test.ts` — NEW cp5-2 block: four README truthfulness guards
- `tests/audio-citations.test.ts` — NEW: every live `main.ts:N` citation, re-resolved
- `tests/helpers/boot-shell.ts` — listener registry keyed by (target, type); `?seed=` plumbing; `snapshotPlayfield`

**Status:** RED — 8 failing, 1021 passing (centipede). Committed as `2d91c23`.
Orchestrator 358/358. Whole cabinet: 8 failed / 10759 passed — no sibling breakage.
`npm run lint` clean.

Independently re-run by the `testing-runner` Diva's Stone (`cp5-2-tea-red-rework1`): same
counts, and the eight failing names returned verbatim match the eight above one for one —
4 in `audio-seam-scope`, 2 in `audio-wiring`, 1 in `audio-gesture-gate`, 1 in
`audio-hot-path`. (Cross-checked deliberately: this runner has previously returned
fabricated test NAMES with correct counts.)

### Disposition of all eleven Reviewer findings

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| 1 | HIGH | README states the shell is "not connected" and names cp5-2 as future work | **RED written, Dev fixes.** Four paired guards in `audio-seam-scope.test.ts`, in cp5-1's style. Satisfiability proven against a throwaway rewrite: 13/13 green. |
| 2 | MED [TEST] | AC1 guard blind to a one-step SHIFT | **FIXED.** Pump-index pairing. Mutation-verified both ways — see the battery below. |
| 3 | MED [TEST] | Three boot suites drive an UNSEEDED sim | **RED written, Dev fixes.** `?seed=20260801` is installed by the harness and each suite asserts it was honoured; main.ts needs the parser. |
| 4 | MED [RULE][TEST] | Four `vi.mock` wrappers type parameters `never`; `createAudio` drops `baseUrl` | **FIXED.** All now `(...args: Parameters<typeof real.fn>)` and forward. |
| 5 | MED [RULE] | `main.ts:183` cited twice for the trailing rAF | **FIXED** → `:216`, and now gated. |
| 6 | MED | `main.ts:84-86, :92-94` cited for the gesture listeners | **FIXED** → `:106` and `:108-111`, with `:117-119` named as the non-gesture keydown. Gated. |
| 7 | MED | `sim.ts:723` offered as a cause that never fired | **FIXED.** The causal clause is gone; the composition is measured on the seeded run and pinned as data. |
| 8 | LOW [RULE] | `catch (e) { e as Error }` | **FIXED.** Typed `unknown`, no cast, no narrowing needed — the assertion is on a separate boolean. |
| 9 | LOW | `asteroids:33-37` is the less analogous arm | **FIXED** → `:57-64` in both test files. The same stale citation in `src/shell/audio-dispatch.ts:77` is Dev's — filed. |
| 10 | LOW [TEST] | boot-shell listeners keyed by type only | **FIXED.** Keyed by (target, type); `emit` names its target and THROWS when nothing is listening. |
| 11 | LOW [SIMPLE] | `sim()` exported with 0 call sites | **FIXED by use** — it is how each suite captures the boot state for the seed guard. |

### Mutation battery — the AC1 guard, re-ranked

Run against a throwaway wiring in `src/main.ts`; `cp`-backed up first and restored by `cp`,
with `md5` and `git status --short` confirming no `src/` file modified.

| mutant | red | what it establishes |
|---|---|---|
| correct wiring | **0 / 11** | the RED is satisfiable — no assertion is impossible |
| dispatch hoisted above `stepSim` (the SHIFT) | 1 | **the hole the Reviewer found is closed** — this passed 1012/1012 in round 1 |
| `if (sim.events.length > 0) playEventSounds(...)` | **0** | the equivalent refactor the Reviewer required to stay green still does |
| dispatch once per rAF frame | 2 | the catch-up-burst claim still bites |
| dispatch once per event | 1 | AC1's "not per event" is genuinely tested |
| dispatch into a second engine | 2 | the identity check still closes what counts cannot |

The citations gate was ranked the same way, and by accident: the throwaway `?seed=` change added
three lines to main.ts and reddened **all five** anchors, each reporting the new number
(:109, :111, :120, :140, :219). It is not scenery.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #8 mock signatures derive from the real export | all five `vi.mock` wrappers in `audio-wiring` / `audio-hot-path` | fixed (compile-enforced by `Parameters<>`) |
| #11 no cast out of `unknown` without narrowing | `audio-hot-path.test.ts` `outcome.threwOnPoisonedFrame` | fixed (typed `unknown`, never cast) |
| citation truthfulness | `audio-citations.test.ts` — 6 anchors + 2 sweeps | passing, and mutation-verified |
| doc truthfulness | `audio-seam-scope.test.ts` cp5-2 block — 4 tests | RED (Dev) |
| non-vacuity | every emergent assertion is now gated on a seed guard in the same file | RED (Dev) |

**Self-check:** no vacuous assertions. Each new positive was built only from tokens verified absent
from the target file (`as of cp5-2`, `\b14\b`, `expected` — all 0 occurrences), and each new negative
from tokens verified present (all 5 at 1 occurrence). The one assertion I could not prove by reading
— that the pump index really discriminates a shift — was proven by mutation instead.

### For Dev — two production changes, and one gate that WILL red on you

1. **`plugins/centipede/README.md:20-24`** — rewrite. The shell IS connected as of cp5-2; the cabinet
   is still silent because no sample is uploaded; the first gesture produces **14** console 404s and
   that is expected. "Two things are still missing" becomes one. Four tests pin it; a throwaway
   rewrite satisfied all four, so the shape is known to work.
2. **`?seed=` in `src/main.ts`** — a shell-only debug seed in the `?wave=` shape (parse in the SHELL,
   never pass it into `createSim`). Three tests pin it. The throwaway was four lines:
   `Number.parseInt(params.get('seed') ?? '', 10)`, fall back to `Date.now()` when not finite, and
   pass it to `createAttract`.
3. **`tests/audio-citations.test.ts` will red the moment you touch main.ts** — by design. The message
   re-locates each anchor and gives you the number the citation should now read. Update the `ANCHORS`
   table AND the prose in the file named beside it. This is maintenance of a citation table, not a
   goalpost move: the numbers are supposed to follow the code.

Also yours, and outside any test: **`src/shell/audio-dispatch.ts:77`** carries the same stale
`asteroids:33-37` citation the Reviewer raised against the test file. Correct it to `:57-64`.

Watch out for **`stepSim`'s aliased `playfield.cells`** (Delivery Finding above) — it cost me a
wrong diagnosis. A held `SimState` reports the CURRENT mushroom field, not its own.

**Handoff:** To Korben Dallas (Dev) for GREEN.

---
## Dev Assessment (rework — round-trip 1)

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/centipede/src/main.ts` — the shell-only `?seed=N` override (2 lines of code, 8 of comment), and `createAttract(debugSeed)` in place of `createAttract(Date.now())`
- `plugins/centipede/README.md` — the status block rewritten: the shell IS connected as of cp5-2, "Two things are still missing" becomes one, and a new paragraph on the 14 expected 404s
- `plugins/centipede/src/shell/audio-dispatch.ts` — the stale `asteroids:33-37` citation corrected to `:57-64` (TEA could not: it is source, not test)
- `plugins/centipede/tests/*` — citation re-anchoring only, no assertion touched (see below)

**Tests:** 1029/1029 passing (centipede, GREEN). Whole cabinet 10767/10768 (1 todo), 717/717 files.
Orchestrator 358/358. `npm run lint` clean. `node scripts/build-app.mjs centipede` builds.
**Branch:** `main` (trunk-based), rebased onto `origin/main` and pushed as `006edc4`.

A sibling checkout pushed 5 commits (jt5-4 round 3, sw8-13 round 1, a superpowers chore) while this
round was in flight. **Zero file overlap** with cp5-2's three — they are joust, star-wars, the sprint
epics and the Reviewer's sidecar; mine are centipede and the TEA sidecar — so the rebase was clean.
Re-verified AFTER the rebase, not before: lint clean, orchestrator 358/358, cabinet 717/717 files and
10767 tests passing.

### The two production changes TEA's RED asked for

1. **`?seed=`** — `Number.parseInt(params.get('seed') ?? '', 10)`, falling back to `Date.now()` when
   not finite, passed to `createAttract`. Parsed in the SHELL and handed to the core as an ordinary
   argument, so `createSim`'s contract gains nothing debug-shaped — the same seam `?wave=` and
   `?demo=` were logged under. No clamp; a seed indexes nothing (Design Deviation).
2. **The README status block** — every clause of it was false as of 6c2bf1a. Four tests pin the
   rewrite; all four green.

### The citation table, and why touching TEA's tests was the job

TEA warned that `tests/audio-citations.test.ts` would red the moment I touched `main.ts`, and it did —
all five anchors, each reporting where it had moved to:

| citation | was | now |
|---|---|---|
| the window keydown gesture binding | `main.ts:106` | `main.ts:117` |
| the canvas click listener | `main.ts:108-111` | `main.ts:119-122` |
| the initials keydown (NOT a gesture binding) | `main.ts:117-119` | `main.ts:128-130` |
| where attract is seeded | `main.ts:137` | `main.ts:148` |
| the trailing `requestAnimationFrame(frame)` | `main.ts:216` | `main.ts:227` |

Re-anchored in one pass across all six files plus the `ANCHORS` table, so no replacement could be
re-replaced by a later one (`main.ts:117` is simultaneously a new value and an old one — a naive
sequential edit would have corrupted it). `main.ts:36-45` was unaffected: my insertion is below it.

**Nothing in any test's LOGIC was changed** — no assertion, message, helper or signature. The only
other test edits were four comments that MY change made false (they said `?seed=` "does not exist
yet"), corrected for tense and logged as a Design Deviation. Leaving them would have shipped the
exact defect this story was rejected for, one file over.

### Self-review

- **Wired to the front end:** yes, and unchanged from round 1 — `createAudio()` at `main.ts:102`,
  `unlockAudio` on both gesture surfaces, `playEventSounds` inside the pump callback.
- **Follows project patterns:** `?seed=` mirrors `?wave=` line for line, including the "parsed here,
  in the SHELL" comment convention and the Design Deviation that goes with it.
- **All ACs met:** AC1/AC2 (the pump-indexed comparison now discriminates the shift TEA's mutation
  battery found), AC3 (degrade, unchanged), AC4 (gesture gate, unchanged), AC5 (no `.wav`, unchanged).
- **Error handling:** an unparseable `?seed=` falls back to the clock rather than throwing, which is
  the `?wave=` behaviour and the only sane one for a debug param.

**Handoff:** To Jean-Baptiste Emanuel Zorg (Reviewer) for re-review.
---
## Reviewer Assessment (re-review — round-trip 1)

**Verdict:** NOT STAMPED — three defects found and FIXED in `c8eadae`; the formal coverage claim
cannot honestly be made this round. See "Subagent coverage" below.

### Findings — all three fixed, none outstanding

| Sev | Finding | Fix |
|-----|---------|-----|
| MEDIUM [DOC] | Round 1's finding #7 (a real line cited as the cause of something it did not cause) RECURRED in the fix for it. The new note called `player-died+march-stop` "the death concatenation" (sim.ts:693 supplies only `player-died`) and `march-start+spider-stop` "two subsystems each emitting" (both halves are edges from ONE sweep). | Replaced with the mechanism resolved against the source: every frame's stream is the `[...produced, ...edges]` join at sim.ts:977-982, and `LOOP_VOICES.flatMap` (sim.ts:978) is the file's only edge-producing site — `*-start`/`*-stop` names are built by template literal (sim.ts:390-393) so they exist as no string constant in core. |
| LOW [SIMPLE] | `ShellDomOptions`/`search` in `helpers/boot-shell.ts` had ZERO callers passing it — dead API in a brand-new file, the same shape as round 1's `sim()` finding. Also a hole: opting out of the seed would opt out of `seedWasHonoured`, the guard the rework turns on. | Removed; the search string is fixed. |
| LOW [DOC] | The cp5-2 README guards' non-vacuity notes said the tokens are "absent from the README today" — true when written, false once the rewrite landed. | Re-worded to record the measurement rather than assert the current state, matching the correction already applied to the four `?seed=` comments. |

### Verified good (evidence, independently derived)

- [VERIFIED] The pump-index guard really does close the one-step shift. Reasoned through six alternative
  mis-sitings (double dispatch, stale copy, microtask, conditional drop, empty-array dispatch, a
  different callback count) — all red. Corroborated by TEA's six-mutant battery.
- [VERIFIED] `?seed=` is safe against every adversarial input. `createRng` does `seed >>> 0` (ToUint32),
  which totalises any finite number; `Number.isFinite` diverts NaN/Infinity to the clock. The seed never
  indexes, sizes or bounds anything. The asymmetry with `?wave=`'s clamp is correct, not an oversight.
- [VERIFIED] The seed guard's chain to the observed world holds. START1 reseeds from `state.rng.seed`
  (a mutating cursor, sim.ts:1020), so the played world is a pure function of `?seed=` plus the attract
  frames the harness drives — and core purity structurally forbids a clock entering that path.
- [VERIFIED] Every non-`main.ts` citation the diff introduces resolves: core/events.ts:12-21 and :23-26,
  core/sim.ts:277-279, src/shared/audio.ts:137, sim.ts:693 and :723.
- [VERIFIED] The README's new factual claims: SOUNDS has exactly 14 keys, and DEFAULT_BASE_URL is
  `https://arcade-assets.slabgorb.com/centipede/sfx/`.
- [VERIFIED] Round 1's #8 (catch-cast) is properly fixed — `null as unknown`, no cast, `String()` in the
  message. #10 (listener keying) and #11 (dead `sim()`) confirmed fixed by reading.

### Subagent coverage — INCOMPLETE, and not stamped

| # | Specialist | Received | Status | Findings |
|---|-----------|----------|--------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1029 green, orchestrator 358, lint clean, build ok, tree clean, pushed) |
| 2 | reviewer-security | Yes | clean | none — traced `?seed=` against nine adversarial inputs |
| 3 | reviewer-test-analyzer | **No** | stopped early | n/a |
| 4 | reviewer-rule-checker | **No** | stopped early | n/a |
| 5-9 | edge_hunter, silent_failure_hunter, comment_analyzer, type_design, simplifier | Skipped | disabled | covered by hand — the three findings above came from the disabled [DOC] and [SIMPLE] domains |

**All received:** No — `reviewer-test-analyzer` and `reviewer-rule-checker` were stopped mid-run at the
user's request to end the review cycle. Their domains are [TEST] and [RULE]: the mock-signature
forwarding, the `Parameters<typeof real.pumpFrame>` generic question, and any residual vacuity in the
new `audio-citations.test.ts` are the specific things nothing independently checked this round. The
coverage line is left at No rather than stamped Yes, because the gate reads it literally and a false
Yes buys a green gate with no review behind it.

---
## Subagent Results

Round 3 (re-review — round-trip 2). The purpose of this round: close the two domains round 2
honestly left unstamped, on the tree as of `c8eadae`. What happened instead is that the review was
completed BY HAND, because the subagent infrastructure failed three different ways — and the hand
review found live defects, which are fixed in `e0f8111`.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | error — spawned, never reported; domain covered directly | none from agent | N/A — every check run by Reviewer at HEAD: centipede 1033/1033, lint clean, orchestrator 358/358 (one transient `canonical-serve` port-race fail, green twice on re-run, nothing owning :5270), build ok, tree clean, pushed `e0f8111` |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A — disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A — disabled via settings |
| 4 | reviewer-test-analyzer | Yes | error — ran (observed live-mutating main.ts for ~5 min; its hoist mutation redded exactly the 6 suites the pump-index guard protects, incidentally re-proving that guard), but returned no report after two requests | none returned | N/A — [TEST] domain assessed by hand, all four priority areas: mock forwarding, the Parameters generic, citations vacuity, boot-shell (see Rule Compliance and Verified good) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A — but the round's five findings are ALL [DOC]-domain, found by hand |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A — disabled via settings |
| 7 | reviewer-security | Yes | clean | none | carried from round 2 (nine adversarial `?seed=` inputs) — valid because no production line changed since; re-confirmed `seed >>> 0` totalisation by reading |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A — disabled via settings |
| 9 | reviewer-rule-checker | Yes | error — three spawn attempts failed (`fork failed: Device not configured`) | none from agent | N/A — [RULE] domain done by hand: all 15 checks of `.pennyfarthing/gates/lang-review/typescript.md` enumerated over the diff (see Rule Compliance) |

**All received:** Yes (all four enabled domains accounted for: preflight and security clean with
evidence; test-analyzer and rule-checker errored and were assessed by hand per gate rule 4 — the
rows above say exactly which agent produced what, and nothing is claimed from an agent that failed)

**Total findings:** 5 confirmed (all found by Reviewer's own pass, all FIXED in `e0f8111`),
0 dismissed, 0 deferred.

### Rule Compliance

The 15-check TypeScript gate, enumerated over the cp5-2 diff (`45267f9..e0f8111`,
10 files) by hand since the rule-checker could not spawn:

- **#1 type-safety escapes** — one new escape: `{ type: POISON } as unknown as GameEvent`
  (audio-hot-path.test.ts:101). COMPLIANT: fabricating an unmapped kind REQUIRES casting past the
  compiler — that a cast is the only way in is the compile-time guarantee's own evidence, and the
  surrounding comment says so. `main.ts:149`'s `window as unknown as` is pre-existing (cp4-6), not
  this diff's. No `as any`, no `@ts-ignore`, no non-null `!` anywhere in the diff.
- **#2 generics** — no `Record<string, any>`, no `Function`, no bare `object`. boot-shell's
  `Record<string, unknown>` stubs are the checklist's own prescribed form.
- **#3 enums** — none introduced. The closed unions (`ShellTarget`, `effectFor`'s return) are the
  union-over-enum house form.
- **#4 null/undefined** — every `||` in the diff is boolean-on-boolean (main.ts:170 `fire`);
  `??` used on the param parses (main.ts:44,55). `EVENT_SOUND[event.type]` result is
  undefined-checked at audio-dispatch.ts:81-82.
- **#5 modules** — `import { type GameEvent }`/`type SimState` forms used; no runtime import of
  type-only names.
- **#6 React** — N/A, no .tsx.
- **#7 async** — boot suites `await import('../src/main')` correctly; FakeAudioContext promise
  members typed `Promise<void>`/`Promise<never>`.
- **#8 test quality** — the strongest section of this diff. All four `vi.mock` factories wrap the
  REAL module via `importOriginal` and forward with `(...args: Parameters<typeof real.fn>)` +
  positional re-call, so an arity/order/return change in the real signature is a COMPILE error in
  the mock — the mock cannot drift (audio-wiring.test.ts:120-188, audio-hot-path.test.ts:73-105).
  The `Parameters<typeof real.pumpFrame>` generic is load-bearing, not decorative: the wrapper
  destructures four positions and re-passes them typed, so it pins. The `createAudio` fake is typed
  as the full `AudioEngine`, so a grown interface reds it (TS2741).
- **#9 build/config** — no tsconfig/vitest config touched.
- **#10 input validation** — `?seed=` and `?wave=` both `Number.parseInt` + `Number.isFinite`
  gated; the seed indexes nothing (`createRng` does `seed >>> 0`). No `JSON.parse` in diff.
- **#11 error handling** — audio-hot-path deliberately holds the thrown value as `unknown`
  (its comment cites this rule); no `catch (e: any)` in diff.
- **#12 performance** — no barrel imports, no sync fs on hot paths (test-only readFileSync).
- **#13 fix-introduced regressions** — the round-3 fix diff (`e0f8111`) was itself re-scanned:
  comments + ANCHORS/SCANNED data only; four `it.each` rows ADDED, no assertion weakened.
- **#14 branch-local edges** — the loop edges are taken at `stepSim`'s single exit
  (sim.ts:977-982), not in a branch; core unchanged by this diff, re-read anyway.
- **#15 token-vs-claim assertions** — the citations suite anchors FULL-LINE regexes to the
  declaration (`/^ {2}requestAnimationFrame\(frame\)$/` — the indent deliberately discriminating
  trailing from bootstrap), asserts non-vacuity FIRST (audio-wiring.test.ts:316-324), pins counts
  (`\b14\b` carrying the 404 assertion where a bare `/404/` was measured vacuous), and the round-3
  sweep extension was mutation-tested live: an unregistered `main.ts:999` probe in the newly
  scanned file reds, restored greens.

CLAUDE.md rules: core/shell boundary — nothing in the diff enters `src/core/` except comments? No:
the diff touches NO core file at all (verified from the file list); the `?seed=` is parsed in the
SHELL and handed to `createAttract` as an ordinary argument. Shared-extraction bar — nothing
extracted to `src/shared/`, correctly (boot-shell is one game's helper). `?seed=` mirrors `?wave=`
line-for-line including the "parsed here, in the SHELL" comment convention, logged as a Design
Deviation like its precedents. Tenant isolation — N/A: no backend, no tenants; localStorage is the
only persistence and `makeHighScoreStorage` is pre-existing.

### Findings (round 3) — all five FIXED in `e0f8111`

| Sev | Tag | Finding | Fix |
|-----|-----|---------|-----|
| MEDIUM | [DOC] | Round 2's OWN fix clause — "the names appear as no string constant anywhere in core" — is false: `EVENT_KINDS` (core/events.ts:67-77) is a runtime tuple containing all eight, and being a VALUE is that export's documented point. Third recurrence of the resolve-prose-against-source class, this time inside the round-2 correction. | Clause now says no PRODUCING site spells them out and names the registry as the only literal spelling (audio-wiring.test.ts). |
| MEDIUM | [DOC] | audio-hot-path.test.ts: "The trailing call is at :216 (the bootstrap ... :218)" — stale by the 11 lines the `?seed=` block added (true: :227/:229), INSIDE the comment explaining stale-citation harm. Bare `:N` spelling evaded both Dev's re-anchor pass and the citations sweep, which match only `main.ts:N`. | Re-spelled prefixed; main.ts:229 registered in ANCHORS. |
| MEDIUM | [DOC] | audio-seam-scope.test.ts: "builds the engine at :91 and dispatches at :192" — same 11-line staleness (true: :102/:203), in a file the sweep did not even scan. | Re-spelled prefixed; main.ts:102, :203, :20-21 registered; file added to SCANNED. |
| LOW | [DOC] | Two ":183 now reads `const board = sim.highScoreTable`" claims (audio-hot-path.test.ts, audio-dispatch.test.ts) — false today (main.ts:183 is `} else {`); the round-1 wording described a tree two diffs gone. | Re-tensed to record the round-1 measurement as history. |
| LOW | [SIMPLE] | The citations sweep's blind spot itself: bare `:N` refs are invisible to it, and audio-seam-scope.test.ts was outside SCANNED — the two mechanisms that let the above go stale unwatched. | SCANNED comment now REQUIRES the `main.ts:N` spelling; sweep extension mutation-checked (probe reds, restore greens). |

Root cause, one sentence: the round-1 rework re-anchored every `main.ts:N` token across six files,
but four bare-colon refs written against the 218-line main.ts survived it, and Dev's `?seed=` block
then shifted the file +11 lines under them.

### Verified good (round 3, evidence independently derived)

- [VERIFIED][TEST] The four `vi.mock` factories cannot drift from the real signatures — forwarding
  form at audio-wiring.test.ts:127,151,164,180 and audio-hot-path.test.ts:80,96, argument-position
  re-pass typed against the real import; complies with checklist #8 (mock types match
  implementations). The `stepSim`/`playEventSounds` wrappers CALL THROUGH to the real functions, so
  the real sim runs — AC2's no-mock-idiom ruling is honoured in the only sense that matters.
- [VERIFIED][TEST] The AC1 pump-index discriminator survives its adversary: the test-analyzer's live
  hoist mutation redded audio-wiring + audio-hot-path (6 tests) while I watched; on the restored
  tree, 1033/1033 green. The burst-reality guard (pumps/rafFrames > 2, audio-wiring.test.ts:335-347)
  keeps the discriminator exercised.
- [VERIFIED][TEST] audio-citations.test.ts is non-vacuous end to end: anchors are full-line
  declaration regexes with a relocate() fix hint; the completeness sweep and the RETIRED-liveness
  guard close both escape hatches; my own `main.ts:999` mutation probe redded the sweep in the
  newly scanned file. All ten ANCHORS verified against main.ts as of `e0f8111` by running them.
- [VERIFIED][TEST] boot-shell.ts throws rather than no-ops on both failure surfaces — `emit` with no
  listener (line 245-250) and `frame` with no scheduled callback (line 254-257) — so a staged
  interaction that drives nothing cannot pass silently. `seedWasHonoured` compares the SNAPSHOT
  against `createAttract(SEED)` (line 134-137), and the snapshot discipline is forced by the
  documented `stepSim` aliasing (measured sums in the header).
- [VERIFIED][DOC] Every sibling-game citation in the diff resolves: all five degrade-path spans
  (tempest:111-119, asteroids:57-64, battlezone:74-80, red-baron:68-74, joust:70-78 — each read,
  each `void _exhaustive` with no throw), tempest:47-51 and tempest main.ts:45-51 for the gesture
  shape, `@shared/audio`:71-77 (ctor resolution), :137 (silent-degrade catch), :143-162 (resume
  idempotency — `loadStarted || !ctx` makes main.ts's "harmless no-op" claim true), sim.ts:438
  (shot-fired push), :693, :977-982, :390-393 (loopEdges — the only edge producer, and no
  `event('*-start')` literal call site exists in core: grepped).
- [VERIFIED][RULE] The diff touches zero core files; the shell/core boundary holds by construction,
  and the purity suite is among the 1033 green.

### Devil's Advocate

Suppose this round is the one that finally rubber-stamps. What would I be missing? The two agents
that failed are the two that failed LAST round — [TEST] and [RULE] — so the suspicious reading is
that "assessed by hand" is this round's version of round 2's honest No. The difference I can point
to: the hand pass produced five confirmed findings and a live mutation kill, which a rubber stamp
does not do, and the two domains' priority questions each have a line-cited answer above. Next:
my own authorship. I wrote `e0f8111`, and round 3 exists because round 2's fix contained a defect —
what makes round 3's fix different? Mechanism, not diligence: round 2's clause was a universal
negative ("no string constant ANYWHERE") that nothing checked; round 3's replacements are either
registered anchors the suite re-resolves on every run, or past-tense records of measurements. The
one new universal claim I introduced ("no producing site spells them out") I grepped before
writing, and the citations gate cannot rot silently in the two ways it just did — the bare form is
now called out in SCANNED's own comment, and the file that was unscanned is scanned. What would a
malicious user do? `?seed=` is the only new input: parseInt cannot yield Infinity or NaN past the
isFinite gate's fallback, and the seed reaches exactly one sink, `createRng`'s `>>> 0`. A hostile
value cannot size, index, or bound anything. What breaks under stress? A throw inside the pump
callback — the exact hazard this story exists for — is degraded at the only site that can throw
(the dispatch), proven by poisoning a LIVE frame and watching the loop keep scheduling AND stepping
(the "survived but stopped simulating" distinction the hot-path suite draws). The residual risk I
genuinely cannot close: the four rAF-loop suites depend on boot-shell's stub staying faithful to
the browser surface main.ts touches; a new DOM API in a future main.ts would need a new stub member,
and the failure would be a loud boot error in tests, not silence. Acceptable.

### Specialist tag coverage

All eight domains dispositioned this round: [EDGE] boundary re-checked by hand at the seed parse and
the burst clamp (14 steps, pinned by BURST_MS's comment, exercised by the >2 pumps-per-frame guard);
[SILENT] the degrade paths are the STORY, each verified loud-or-documented (404 wall documented,
dispatch skip commented, boot-shell throws on dead emits); [TEST] four priority areas verified with
line evidence above; [DOC] five findings, all fixed and now machine-guarded; [TYPE] the mock
signature-pinning and the `never` arms re-verified; [SEC] `?seed=` sink analysis re-confirmed atop
round 2's nine-input trace; [SIMPLE] the one dead API this round grew (none — round 2's
`ShellDomOptions` removal stands, and the fix added only registered data rows); [RULE] fifteen
checks enumerated above.

---
## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `?seed=20260801` → `window.location.search` → main.ts:55 parseInt →
`Number.isFinite` gate (main.ts:56) → `createAttract(debugSeed)` (main.ts:148) → `createRng`
`seed >>> 0` → `seedPlayfield(rng)` — one sink, totalised, indexes nothing (safe because every
uint32 is a valid world). And the payload path: `stepSim` → `SimState.events` (rebuilt at the one
exit, sim.ts:977-982) → pump callback (main.ts:203, inside `pumpFrame`, once per stepped frame) →
`playEventSounds` → `EVENT_SOUND` lookup, degrade on miss (audio-dispatch.ts:81-82) → engine
methods, no-ops until the gesture gate opens.

**Pattern observed:** the citation-anchor gate (tests/audio-citations.test.ts) — a table of
full-line regexes the suite re-resolves against main.ts on every run, with a completeness sweep
and mutation-proven teeth. Good pattern, worth porting; its round-3 hardening (bare-form blind
spot) travels with it.

**Error handling:** an unmapped kind on the hot path skips its cue and plays the rest of the frame
(audio-dispatch.ts:81-82), proven end-to-end by poisoning a live frame and observing the loop still
scheduled AND still stepping; an unparseable `?seed=` falls back to the clock (the `?wave=`
behaviour); every `@shared/audio` failure path (no WebAudio, blocked autoplay, failed fetch,
undecodable sample) leaves the game quiet and never throws — which is precisely why the README's
14-404s warning is load-bearing and is itself pinned by count.

**Round 3 in one line:** the two unstamped domains were closed by hand after three infrastructure
failures; the pass found five [DOC]/[SIMPLE] defects — including one inside round 2's own fix —
all fixed and machine-guarded in `e0f8111`, and no Critical or High exists on the tree.

**Handoff:** To Ruby Rhod (SM) for finish-story.

**Handoff:** The code is green, fixed and pushed (`c8eadae`). What remains is process, not defects.
## Impact Summary

**Upstream Effects:** 17 findings (5 Gap, 2 Conflict, 4 Question, 6 Improvement)
**Blocking:** None open — 1 blocking Gap (the README stating the opposite of what shipped) was found by the Reviewer in round 1 and resolved in-story by the rework, now guarded by tests.

- **Gap:** `tests/main-loop.test.ts:4-8` states main.ts cannot be tested behaviourally; cp5-2 measured that false (boot-shell.ts boots the real thing). Affects `plugins/centipede/tests/main-loop.test.ts`.
- **Gap:** `stepSim` ALIASES `playfield.cells` — a held SimState reports the CURRENT field, not its own (measured). Wider than this story; the purity guard bans globals/time, not in-place mutation of caller-visible state. Affects `plugins/centipede/src/core/` and any suite that snapshots a SimState.
- **Gap:** three OLDER centipede suites carry stale `main.ts:` citations (pointer-lock, input-distribution, highscore-entry — measured targets recorded). Widening `audio-citations.test.ts`'s SCANNED list plus re-anchoring closes them. Affects `plugins/centipede/tests/`.
- **Gap:** (resolved in-story) `audio-dispatch.ts:77`'s stale `asteroids:33-37` citation — corrected to `:57-64` in the rework.
- **Gap:** (resolved in-story, was blocking) README contradicted the shipped wiring; rewritten and guarded by the cp5-2 block in `audio-seam-scope.test.ts`.
- **Conflict:** `sprint/context/context-epic-cp5.md`'s precedent table omits joust — its own correction banner is one game short; every later cp5 story reads it. Affects `sprint/context/context-epic-cp5.md` (now archived; fix travels to any cp5 successor epic).
- **Conflict:** the round-1 unseeded-sim finding cited `game-loop.test.ts:217` as forbidding `Date.now()` in the reseed path; re-resolved — no such guard exists and the shell is whitelisted for it. Recorded so nobody hunts for it.
- **Question:** joust audio files are a moving target (sibling checkout rewriting them) — later cp5 stories must cite joust by SYMBOL, not line.
- **Question:** `plugins/centipede/index.html` 404s a nonexistent `favicon.ico` — the ONE console error the missing-samples note does not explain; will confuse the asset stories' "N 404s" acceptance check.
- **Question:** `?seed=` is centipede's THIRD shell-only debug param, none documented outside main.ts comments. Worth a README section before a fourth arrives.
- **Question:** reviewer subagent infrastructure failed three ways in round 3 (fork failures, ran-but-no-report, neither); review completed by hand. Affects pf agent-spawn plumbing.
- **Improvement:** main-loop's thirteen `?raw` pins could be re-expressed behaviourally on the new harness (a story of its own).
- **Improvement:** (resolved in-story) the 14-404s wall is now documented in the README with its count pinned by test.
- **Improvement:** nine centipede test files carry "does not exist yet" RED-phase headers that have been false for months — a cheap sweep, not cp5-2's.
- **Improvement:** five of nine reviewer specialists are disabled; on this story the disabled comment-analyzer's domain held most of the findings across all three rounds. Re-enable it for citation-heavy repos.
- **Improvement:** (resolved in-story for cp5-2's files) the citations gate exists now; porting it wider is the standing recommendation.
- **Improvement:** bare `:N` line refs evade citation gates AND re-anchor passes (proven three times in this story); a fleet grep of `plugins/*/tests/` for the bare form would find the rot cheaply.

### Downstream Effects

Cross-module impact: findings across 5 modules — `plugins/centipede/tests/` (stale headers, stale citations, `?raw` re-expression), `plugins/centipede/src/core/` (the aliasing question), `plugins/centipede/README.md`/`index.html` (debug-param doc, favicon), `sprint/context/` (joust omission), pf tooling (subagent plumbing, disabled specialists).

### Deviation Justifications

12 deviations logged, all severity minor, every one stamped ACCEPTED by the Reviewer (rounds 1-3; the six round-trip-1 entries were stamped in round 3's audit): throw-block inverted in place; AC5 already guarded; only the `:62` throw pinned; the timebase mock for a pump clock; `?seed=` demanded by tests; the citations gate itself; README guard placed in cp5-1's file; `:80` throw removed too; `unlockAudio` as a second listener; four test comments re-tensed; `?seed=` unclamped; the Reviewer's round-3 direct edit of test prose + ANCHORS.

## Sm Assessment

cp5-2 is DONE and epic cp5 is COMPLETE (2/2 stories). The story took three review rounds: round 1
REJECTED (1 HIGH — the README contradicting the shipped code — 6 MEDIUM, 4 LOW), a full TEA+Dev
rework, round 2 finding-and-fixing three more but honestly refusing to stamp coverage after the
user ended the specialist wait, and round 3 closing the two open domains by hand after the subagent
infrastructure failed three ways — finding five more [DOC]-class defects (one inside round 2's own
fix), all fixed in `e0f8111` and machine-guarded by the extended citations gate. Verified at HEAD:
centipede 1033/1033, orchestrator 358/358, lint clean, build clean. Finish flow verified on disk:
session archived, epic-cp5 (+context) swept to archive — exactly one epic, as predicted — completed
ledger carries cp5-2 once, no Jira (local tracking), no PR (trunk-based; the empty ceremony branch
`feat/cp5-2-wire-audio-seam-into-main` survives per the branch-delete count gate). The Impact
Summary above was compiled by hand from the three Delivery Findings subsections because the
auto-writer produced nothing — the known defect, verified again this run.
