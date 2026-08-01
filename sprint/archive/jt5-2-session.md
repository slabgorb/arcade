---
story_id: "jt5-2"
jira_key: "jt5-2"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-2: The samples — synthesise joust's cues, upload them, and prove a live 200 (count is whatever the manifest holds when this runs, NOT eleven)

## Story Details
- **ID:** jt5-2
- **Jira Key:** jt5-2
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch:** none
- **Branch Strategy:** trunk-based (default: branching skipped) — a claim
  branch `feat/jt5-2-joust-samples-live-200` was created and pushed per
  explicit setup instruction (empty, tip == `main`) so a sibling checkout's
  `git branch -r | grep jt5-2` probe detects this story is claimed. The work
  itself lands via direct commits to `main` per the repo's trunk-based
  convention (CLAUDE.md — "Just commit; no need to ask first").

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-01T20:34:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T19:46:50Z | 2026-08-01T19:53:20Z | 6m 30s |
| red | 2026-08-01T19:53:20Z | 2026-08-01T20:14:03Z | 20m 43s |
| green | 2026-08-01T20:14:03Z | 2026-08-01T20:27:20Z | 13m 17s |
| review | 2026-08-01T20:27:20Z | 2026-08-01T20:34:00Z | 6m 40s |
| finish | 2026-08-01T20:34:00Z | - | - |

## SM Measured Facts (verified against the working tree 2026-08-01)

These override any stale numbers in the epic-YAML description prose (its own
"eleven" is marked stale by its own COUNT CORRECTION sentence). See also
`sprint/context/context-story-jt5-2.md` (Background section, same facts).

1. **The cue set today is SEVENTEEN, derived — never hardcode a count as a
   premise.** `plugins/joust/src/shell/audio.ts:98` `export const SOUNDS`
   holds exactly 17 entries: enemyDeath, playerDeath, eggCollected,
   eggHatched, pteroArrives, pteroDeath, playerMaterialise,
   enemyMaterialise, extraMan, waveBounty, cliffDestroyed, playerWingDown,
   playerWingUp, enemyWingDown, enemyWingUp, playerThud, enemyThud — jt5-1's
   eleven + jt5-3's four wing cues + jt5-4's two thuds.
2. **Order deviation, recorded not blocking:** the epic's agreed order put
   jt5-2 LAST, but the user explicitly invoked it now while jt5-6 (SNPCR2 —
   needs its own SECOND sample per its own description), jt5-8, jt5-9,
   jt5-15, jt5-17 are still backlog. When jt5-6 lands it does its own
   incremental sample + upload; jt5-2 bakes exactly today's SOUNDS set,
   which is correct per the story's own operative instruction.
3. **`just deploy-assets` currently bakes star-wars ONLY** — measured at
   `justfile:274-286`: it stages `star-wars/music` + `star-wars/sfx`, and
   `assets_bucket := "arcade"` (`justfile:271` — the bucket is named plain
   `arcade`, not `arcade-assets`). The recipe must be EXTENDED to also
   stage/upload `joust/sfx/`. CI never touches this bucket.
4. **No sound-board firmware exists to bake from:**
   `reference/williams-source/joust/JOUSTSND.DOC` is a single pointer line
   (`SEE [LIBRARY.SOUND]VSNDRM4.SRC`), and no vendored revision carries that
   file (measured — the file is 3 lines). Every sample is a recording or
   synthesis; no tempest-style POKEY bake is possible. The manifest's
   `CUE_SOURCES` entries in `audio.ts` name which ROM table each stands in
   for.
5. **The acceptance test is a LIVE 200, not a green vitest.** `@shared/audio`
   degrades silently on 404 / blocked autoplay / undecodable data (this is
   how a star-wars `.wav` stayed missing sw7-18→sw8-14), so a passing suite
   proves nothing about the bucket. The final AC requires curl status codes
   for every `https://arcade-assets.slabgorb.com/joust/sfx/<file>` URL
   derived from SOUNDS, pasted into this session.
6. **README status flip:** `plugins/joust/README.md:13` reads "Live at
   **v0.0.8** and **silent**" (line 27 repeats the caveat) — flip the status
   line off "silent" once the 200s are proven.

## Story Acceptance Criteria

**DERIVED CRITERIA — no upstream `acceptance_criteria` in sprint YAML; these
are SM-authored proposals for TEA to challenge and refine.**

1. The manifest-derived file list — one `.wav` per entry of `SOUNDS` in
   `plugins/joust/src/shell/audio.ts` as it stands at implementation time
   (17 as of 2026-08-01) — is derived programmatically at bake/upload time,
   never hardcoded as a literal count or list anywhere in the
   implementation.
2. Every sample is a recording or a synthesis (no ROM/firmware bake is
   possible per Fact 4), and each file's provenance stays traceable to the
   `CUE_SOURCES` entry it stands in for.
3. `just deploy-assets` is extended to also stage and upload `joust/sfx/`
   (alongside its existing star-wars staging) into the same `arcade` bucket
   under the `joust/sfx/` key prefix; CI is not made to touch this bucket.
4. Live 200 proof: for every URL
   `https://arcade-assets.slabgorb.com/joust/sfx/<file>` derived from
   `SOUNDS`, a curl status check returns 200, and the pasted status codes
   for all of them are recorded in the session/PR (a green vitest suite is
   explicitly NOT sufficient evidence per Fact 5).
5. `plugins/joust/README.md:13` and the repeated caveat at
   `plugins/joust/README.md:27` are updated to drop "silent" now that the
   200s are proven.
6. jt5-6's SNPCR2 (a second, still-backlog sample) is explicitly out of
   scope for this story's bake — jt5-2 bakes exactly today's `SOUNDS` set;
   jt5-6 does its own incremental sample + upload when it lands.
7. No regressions: joust's vitest project and the orchestrator suite stay
   green, lint is clean, and the build is clean.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the README's dev-server paragraph is refuted by mg1-2 —
  "There is no way to open joust in a browser from this repo right now" and the
  do-not-screenshot warning describe the pre-cabinet SPA fallback, but `just
  serve` now serves the real plugin at `/joust/` (pinned by
  `tests/canonical-serve.test.mjs`). Affects `plugins/joust/README.md` (the
  Quick-start paragraph needs rewriting against the current dev server). Not
  owned by jt5-2 (AC5 pins silence claims only) and not jt5-7's counts — needs
  an owner or a filed story at finish. *Found by TEA during test design.*
- **Gap** (non-blocking): both games' deploy-assets guards are token-level —
  they pin that the recipe STAGES a prefix, not that its bake calls are intact.
  Measured: deleting only the star-wars bake-music line (keeping `mkdir`/upload)
  survives joust's new suite AND star-wars' existing one. Affects `justfile`
  guard coverage (acceptable: the recipe's own echo output and the live-200
  curls own bake correctness; recorded so nobody reads the guards as more).
  *Found by TEA during test design.*
- **Question** (non-blocking): the README states the shipped game is "still
  live at joust.slabgorb.com" — CLAUDE.md's own rule is "do not infer a live
  game from a live hostname; request it", and nothing here has requested it.
  Affects `plugins/joust/README.md` (one word of hedging, or a measurement).
  Out of jt5-2's scope; note for jt5-7 or the finish sweep.
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): loading `audio-manifest.ts` directly as a
  plain-node ENTRY warns `MODULE_TYPELESS_PACKAGE_JSON` (the joust
  `package.json` is deliberately the three-field stub, so no `"type": "module"`
  can be added without touching that convention). Affects nothing shipped —
  the bake is `.mjs` and silent; recorded so nobody "fixes" the stub.
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): `bake-samples.mjs`'s CLI gate
  (`process.argv[1] === fileURLToPath(import.meta.url)`) goes false in a
  checkout reached through a symlink (ESM loader realpaths, argv[1] does not),
  making the CLI a silent no-op — the recipe would stage no joust keys while
  printing Done. Affects `plugins/joust/tools/sample-bake/bake-samples.mjs`
  (compare `realpathSync` of both sides). Loud footprints exist (verify curl
  404s; the spawn test reds on affected machines); route to jt5-6, the next
  bake-touching story. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): when jt5-6 adds SNPCR2 to the manifest, the
  bake throws until a synth spec exists — aborting the WHOLE `deploy-assets`
  run, star-wars staging included. Designed and loud, but jt5-6's description
  should say so, so its Dev meets it expected, adds the spec, and re-runs.
  Affects `sprint/epic-jt5.yaml` (jt5-6 description append at finish).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC4's live 200 is a finish-phase curl artifact, not a vitest**
  - Spec source: session AC4
  - Spec text: "for every URL … a curl status check returns 200, and the pasted
    status codes for all of them are recorded in the session"
  - Implementation: no network test written; the proof is staged as a finish
    checklist with STRONGER requirements — per SOUNDS-derived URL, `curl -sI`
    must show HTTP 200 AND `content-type: audio/wav` AND a content-length over
    1000 bytes, pasted verbatim into this session. A bare 200 with an HTML
    content-type is a FAIL (the SPA-fallback vacuity family).
  - Rationale: `@shared/audio` degrades silently on 404/blocked
    autoplay/undecodable data, so a vitest network probe would be flaky where it
    runs and vacuous where it matters — sw6-1 set the precedent (AC-8's 200 was
    checked in the browser, not the suite).
  - Severity: minor
  - Forward impact: Dev/Reviewer/SM must not read the green suite as AC4;
    the finish gate needs the pasted curl block.
  → ✓ ACCEPTED by Reviewer: the paste exists, 17 rows, shape-checked; a network vitest would have been the pretence the epic's rule forbids.
- **jt5-1's AC6 prose-status pair removed (re-seat)**
  - Spec source: sibling suite `plugins/joust/tests/audio-seam-scope.test.ts`
  - Spec text: "the README still calls joust silent AFTER the seam lands" /
    "and says WHY it is still silent"
  - Implementation: that describe (2 tests) deleted with a supersession comment;
    inverse pins live in `tools/sample-bake/deploy-assets.test.mjs`. The
    binary fences (no audio file in the plugin tree; no stative hosted-claims
    in `src/**.ts`) are retained as permanent hosting-model guards.
  - Rationale: the pair fenced jt5-1's own scope — true only between seam and
    samples, a period this story ends. Keeping both suites deadlocks Dev.
  - Severity: minor
  - Forward impact: Dev must word the `audio.ts` header update in ACTIVE voice
    ("jt5-2 baked and uploaded …"), because the retained fence rejects
    stative claims like "the samples are hosted" in src/.
  → ✓ ACCEPTED by Reviewer: keeping both suites was unsatisfiable; the retained fences cover the durable properties, and Dev's wording cleared the fence in practice.
- **AC5 pinned to silence claims only; README counts fenced to jt5-7**
  - Spec source: session AC5; `sprint/epic-jt5.yaml` jt5-7
  - Spec text: AC5 "updated to drop 'silent'"; jt5-7 "joust's unguarded README
    counts"
  - Implementation: negatives target the five silence sentences; the
    count-bearing sentence is matched with a `\S+` wildcard so no number is
    pinned or perpetuated.
  - Rationale: jt5-7 exists and owns the counts (verified in the epic); pinning
    "seventeen" here would collide with it and go stale at jt5-6 anyway.
  - Severity: minor
  - Forward impact: jt5-7 is still owed the counts ("eleven ROM-cited
    moments", "eleven cues", the subpath census).
  → ✓ ACCEPTED by Reviewer: verified jt5-7 exists and its title names the counts; the \S+ wildcard neither pins nor perpetuates a number.

### Dev (implementation)

- **`FRAME_DURATIONS` moved into the manifest module (beyond TEA's minimal extract)**
  - Spec source: session TEA Assessment, Handoff step 1
  - Spec text: "Extract `SOUNDS`+`SoundName` to `src/shell/audio-manifest.ts`"
  - Implementation: `FRAME_DURATIONS` (with its multi-line-table doc comment)
    moved too, exported from the manifest and imported back by `audio.ts`.
  - Rationale: the bake sizes every file from the ROM's own arbitration window;
    leaving the table in `audio.ts` would have forced the bake to re-transcribe
    17 ROM numbers — the exact drift class the identity test exists to kill
    (and SNPCR1's 450-vs-30 misread is this epic's own precedent).
  - Severity: minor
  - Forward impact: jt5-6 adds SNPCR2's duration in the manifest, not audio.ts;
    `FRAME_DURATIONS` is now public via the manifest module.
  → ✓ ACCEPTED by Reviewer: re-transcribing 17 ROM numbers into the bake would recreate the drift class the identity test kills; the move is the smaller risk and the suite pins the totals.
- **Sample duration = the ROM window, with early-decaying envelopes**
  - Spec source: session AC2; TEA duration band (0.05–10 s)
  - Spec text: "Every sample is a recording or a synthesis … provenance stays
    traceable to the `CUE_SOURCES` entry it stands in for"
  - Implementation: each file spans FRAME_DURATIONS[cue] / FRAME_HZ seconds
    (SNPCR1's transporter = 7.49 s); short-sounding cues (wing thumps, decay 16–22)
    die early inside their window, leaving a near-silent tail.
  - Rationale: the window is the only duration the ROM actually states (the
    sound board's firmware is unvendored); the file spanning it means what you
    hear tracks what STMR would have allowed to sound. Waveform character
    remains judgement, said plainly in the tool header per cue.
  - Severity: minor
  - Forward impact: none — the engine's arbitration clock is FRAME_DURATIONS
    itself, independent of sample length.
  → ✓ ACCEPTED by Reviewer: the window is the only ROM-stated duration; the trailing-silence design keeps audibility judgement separate from arbitration fact.
- **`FRAME_HZ` re-derived in the bake, not imported**
  - Spec source: TEA Assessment (the plain-node constraint)
  - Spec text: "derive SOUNDS from a dependency-free module"
  - Implementation: the bake re-states `8_000_000 / (512 * 260)` with a citation
    to `core/frame.ts` rather than importing it.
  - Rationale: `frame.ts` chains `.js`-specifier core imports plain node cannot
    resolve; a shared FORMULA cannot drift the way a transcribed `60` could.
  - Severity: minor
  - Forward impact: none (the formula is 1982 hardware).
  → ✓ ACCEPTED by Reviewer: a formula shared by citation cannot drift the way a transcribed 60.096 could; importing frame.ts is impossible under plain node.

### Reviewer (audit)

All seven logged deviations (SM ×1, TEA ×3, Dev ×3) stamped ✓ ACCEPTED above.
Undocumented-deviation sweep: the bake's 22050 Hz / 16-bit mono PCM format was
constrained by no spec (TEA's format checks accept PCM or float, mono or
stereo) — an implementation choice inside the tests' envelope, not a
deviation. Nothing else diverged from spec unlogged.

- **Story ordering (SM, setup):** the epic's agreed order (2026-08-01) put jt5-2
  LAST so one upload pass would suffice; the user explicitly invoked it now with
  jt5-6/8/9/15/17 still backlog. Proceeding is per the story's own operative
  instruction (derive from `SOUNDS` at run time); the forward impact is that
  jt5-6 must do its own incremental SNPCR2 sample + upload when it lands (its
  description already says so). Recorded, not blocking.
  → ✓ ACCEPTED by Reviewer: the operative AC is self-healing and jt5-6's ownership of the second pass is written in its own description.

## Sm Assessment

**Setup complete; routing to TEA (Mr. Praline) for RED.**

- **Sibling probes (before any spawn):** `git branch -r | grep jt5-2` — no
  claim existed; live-session sweep across `a-*/.session/` found only a-2 on
  uf1-13 (Pennyfarthing review-gate territory, no file overlap with joust's
  audio shell). Board was genuinely clear.
- **Description measurement:** every falsifiable claim verified against the
  tree today, results in `## SM Measured Facts` above (all six held; the
  stale-count hazard the description itself warns about is real — `SOUNDS`
  is 17 today, not eleven, not fifteen). No corrections were needed to the
  epic description; the count-at-run-time phrasing already covers the drift.
- **sm-setup verification:** session header fields all present, exactly one
  phase-pointer token (it read `setup` on arrival); story stamped
  `in_progress` + `started` by sm-setup itself this time (first observed —
  sidecar carries the dated correction); claim commit `3bca086` and empty
  claim branch `feat/jt5-2-joust-samples-live-200` verified on origin.
  Context file shipped a filler Technical Approach despite a rich Background
  — SM replaced it with measured pointers (star-wars bake precedent,
  `deploy-r2.mjs` staging shape, curl pattern) and a measured Scope, in
  `97cea70`.
- **ACs are DERIVED** (the YAML has none) — TEA should treat the seven as
  proposals to challenge, and note AC4's evidence is curl output, not vitest.
  The live-200 step needs the bucket write (`just deploy-assets`), which is a
  Dev/finish-side action; TEA's RED should pin what a test CAN pin (manifest
  derivation, recipe staging, README text) and stage the curl proof as a
  checklist artifact rather than pretending a unit test proves the bucket.
## TEA Assessment

**Tests Required:** Yes
**Status:** RED (verified by testing-runner: 93 files / 2255 tests, 2 files failing, lint exit 0)

**Test Files:**
- `plugins/joust/tools/sample-bake/bake-samples.test.mjs` — the bake tool's
  contract (10 tests, RED at file level: `./bake-samples.mjs` does not exist —
  the bake-sfx valid-RED precedent). Pins: manifest re-exported by IDENTITY
  (`toBe`, not deep-equal — a transcription silently misses jt5-6's SNPCR2);
  set-equality of staged files against `Object.values(SOUNDS)` both ways;
  decodable RIFF/WAVE with sane format/rate and a 0.05–10 s duration band
  (weak floor on purpose — the sound firmware is unvendored, so any exact
  duration would be invention); non-silence; byte-identical re-runs; pairwise
  distinct waveforms; a plain-node CLI (`node bake-samples.mjs <dir>`) that
  exits 0 — the justfile's actual interpreter, where `@shared` does not
  resolve — and refuses to run with no output dir (the plugin tree must never
  grow a .wav).
- `plugins/joust/tools/sample-bake/deploy-assets.test.mjs` — AC3 + AC5
  (12 tests: 6 RED, 6 deliberate green guards — the last two added for the
  sibling-landed checklist check #18: inertness controls on the duplicated
  `flatten()`, whose first fixture was itself caught by its own precondition
  for not spanning the wrap). Recipe-body-scoped staging of
  `joust/sfx`; star-wars staging retained (extended, not replaced); bucket
  stays plain `arcade`; shell-prefix agreement; five README silence-claim
  negatives (each verified to MATCH today's flattened README) plus the
  `joust/sfx` positive (verified grep-count 0 today).
- `plugins/joust/tests/audio-seam-scope.test.ts` — re-seat: jt5-1's two
  prose-status tests removed (see Design Deviations); fences retained.

**Satisfiability (probed before handoff):** a throwaway bake plus a temporary
extract of `SOUNDS`/`SoundName` into a dependency-free
`src/shell/audio-manifest.ts` (re-exported from `audio.ts`) ran the FULL joust
project at 92 files green / 0 sibling breaks / tsc clean — proving the identity
test and the plain-node CLI test are jointly satisfiable, and handing Dev a
measured implementation route. Probe fully reverted (md5-verified); nothing of
it is committed.

**Mutation battery (all against the committed tests, throwaway restored after each):**

| Mutation | Landed | Caught by | Result |
|---|---|---|---|
| M1 one waveform copied to every cue | ✓ | pairwise-distinct | 1 red |
| M2 manifest transcribed instead of re-exported | ✓ | identity (`toBe`) | 1 red — the ONLY guard that fires |
| M3 `Math.random` in the synth | ✓ | determinism | 1 red |
| M4 zeroed sample data | ✓ | non-silence + distinctness | 2 red |
| M5 one cue skipped | ✓ (2nd attempt — `python3 -c` ate the newline; file-scripted) | set-equality, both stagings | 6 red |
| M6 stray extra file staged | ✓ | set-equality, both stagings | 2 red |
| M7 3 ms samples | ✓ | duration floor | 1 red |
| G1 bucket renamed `arcade-assets` | ✓ | bucket guard | +1 red |
| G2 star-wars bake line deleted | ✓ | **survived** — `mkdir`/upload lines still carry the token (recorded as a Delivery Finding: token guards pin staging presence, not bake correctness) | baseline |
| G2b recipe wholesale-replaced joust-only | ✓ | extended-not-replaced guard | +1 red |
| G3 shell prefix broken | ✓ | prefix-agreement guard | +1 red |

### Rule Coverage

The story's changed surface is `.mjs` tooling, the justfile, README prose and
remote binaries — no new TypeScript module is required by the tests (the
manifest-extract route ADDS one; see the note below).

| Rule | Test(s) / disposition | Status |
|------|--------|--------|
| #1/#2/#4 type escapes, generics, `??` | N/A today — no new TS module mandated. If Dev takes the manifest-extract route, `audio-seam-scope.test.ts`'s checklist scans do NOT auto-cover the new file (`NEW_MODULES` is a fixed list): Dev should add `src/shell/audio-manifest.ts` to that list in the same commit. | noted |
| #5 relative-import extensions | `audio.ts`'s re-export must use `./audio-manifest.js` (the existing #5 scan covers audio.ts); the bake's `.ts`-suffixed specifier is plain-node type-stripping territory, outside tsc | covered by existing scan |
| #8 test quality | self-check done: no vacuous asserts; every green-on-arrival guard mutation-proven; imports from `src/`, never `dist/`; non-vacuity guards on manifest emptiness/duplication | enforced |
| #13 fix-introduced regressions | Reviewer's meta-check; the mutation table above is its input | staged |
| #14 branch-local edges | N/A — no state machine in scope | — |

**Handoff:** To Dev (Bicycle Repair Man). The route with every trap measured:
1. Extract `SOUNDS`+`SoundName` to `src/shell/audio-manifest.ts`, re-export
   from `audio.ts` (proven: 0 sibling breaks, tsc clean). Add the new file to
   `NEW_MODULES` in `audio-seam-scope.test.ts`.
2. Write `tools/sample-bake/bake-samples.mjs`: deterministic synthesis, one
   file per manifest entry, explicit outDir, CLI + exports. The CUE_SOURCES
   tables (priorities, ROM comments, FRAME_DURATIONS) are the aesthetic
   reference; no firmware exists, so waveform character is judgement — say in
   the tool header which table each synthesis stands in for.
3. Extend `deploy-assets` in the justfile: stage `joust/sfx` alongside
   star-wars, same mktemp/deploy-r2 shape. Bucket stays `arcade`.
4. Run `just deploy-assets`, then curl EVERY SOUNDS-derived URL: paste the
   full `curl -sI` blocks (must show 200 + `content-type: audio/wav` +
   plausible length) into this session — that, not the suite, is AC4.
5. Rewrite the README status block: silence claims out, `joust/sfx` in,
   counts LEFT ALONE (jt5-7 owns them), `audio.ts` header updated in ACTIVE
   voice ("jt5-2 baked and uploaded…") — the seam-scope fence rejects stative
   hosted-claims in src/.
## AC4 Evidence — live 200 per manifest-derived URL (2026-08-01, post-upload)

URL list derived from `audio-manifest.ts` `SOUNDS` at curl time (not hand-typed);
every row is `curl -sI https://arcade-assets.slabgorb.com/joust/sfx/<file>`:

```
enemy_death.wav              HTTP/2 200  | content-type: audio/wav | content-length: 14720
player_death.wav             HTTP/2 200  | content-type: audio/wav | content-length: 14720
egg_collected.wav            HTTP/2 200  | content-type: audio/wav | content-length: 22058
egg_hatched.wav              HTTP/2 200  | content-type: audio/wav | content-length: 22058
ptero_arrives.wav            HTTP/2 200  | content-type: audio/wav | content-length: 44074
ptero_death.wav              HTTP/2 200  | content-type: audio/wav | content-length: 98376
player_materialise.wav       HTTP/2 200  | content-type: audio/wav | content-length: 330264
enemy_materialise.wav        HTTP/2 200  | content-type: audio/wav | content-length: 66822
extra_man.wav                HTTP/2 200  | content-type: audio/wav | content-length: 66088
wave_bounty.wav              HTTP/2 200  | content-type: audio/wav | content-length: 44074
cliff_destroyed.wav          HTTP/2 200  | content-type: audio/wav | content-length: 66088
player_wing_down.wav         HTTP/2 200  | content-type: audio/wav | content-length: 66088
player_wing_up.wav           HTTP/2 200  | content-type: audio/wav | content-length: 66088
enemy_wing_down.wav          HTTP/2 200  | content-type: audio/wav | content-length: 44074
enemy_wing_up.wav            HTTP/2 200  | content-type: audio/wav | content-length: 44074
player_thud.wav              HTTP/2 200  | content-type: audio/wav | content-length: 22792
enemy_thud.wav               HTTP/2 200  | content-type: audio/wav | content-length: 22792
```

All 17: HTTP/2 200, `audio/wav`, lengths agreeing with each cue's ROM window
(spot-check: 20 frames / 60.096 Hz * 22050 Hz * 2 bytes + 44-byte header =
14,720 exactly). Upload: `just deploy-assets`, "Uploaded 37 objects to arcade"
(17 joust + 20 star-wars re-uploads, byte-identical by the bake's determinism).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (`aa88865`, landed on `main`, pushed):**
- `plugins/joust/src/shell/audio-manifest.ts` — NEW: `SoundName`, `SOUNDS`,
  `FRAME_DURATIONS`, dependency-free (the plain-node reachable manifest).
- `plugins/joust/src/shell/audio.ts` — re-exports the manifest by identity;
  header's "THIS STORY SHIPS NO .wav" section replaced with the active-voice
  bucket-model statement (the seam-scope stative-claim fence stays green).
- `plugins/joust/tools/sample-bake/bake-samples.mjs` — NEW: seventeen
  deterministic synthesised stand-ins (mulberry32 seeded per cue name; tone /
  noise / arpeggio primitives; per-cue specs each naming their Williams table;
  throws on a manifest cue with no spec and on a missing outDir; CLI + exports).
- `justfile` — `deploy-assets` stages `joust/sfx` beside star-wars, extra
  verify-curl echo line.
- `plugins/joust/README.md` — status flips to "audible"; the audio paragraph
  states what landed and where the samples live; counts untouched (jt5-7's).
- `plugins/joust/tests/audio-seam-scope.test.ts` — `audio-manifest.ts` added to
  `NEW_MODULES` per TEA's instruction (checklist scans now cover it).

**Tests:** joust project 2267/2267 GREEN (was 6 failed + 1 import-failed file);
whole cabinet 11,060/11,060; orchestrator 359/0; `npm run lint` clean;
`node scripts/build-app.mjs joust` clean.
**Landed on:** `main` (`aa88865`), pushed — trunk-based, no PR per convention.
**Upload:** `just deploy-assets` ran clean (37 objects); AC4's 17-row curl
evidence is pasted above (all 200 + `audio/wav`).

**Handoff:** To TEA (Mr. Praline) for verify, then the Argument Professional.
Things worth their attention:
- The bake's plain-node path is proven twice (the CLI test spawns
  `process.execPath`; the real recipe ran it during the actual upload).
- Direct `import()` of the `.ts` manifest as a node ENTRY prints a harmless
  `MODULE_TYPELESS_PACKAGE_JSON` warning (the plugin package.json is the
  three-field stub and should stay so); the `.mjs` bake itself is unambiguous
  ESM and does not warn.
- Waveform character is judgement by design — if any cue offends the ear, the
  spec table in `bake-samples.mjs` is data; re-baking and re-running
  `just deploy-assets` is idempotent and cheap.
## Subagent Results

| Subagent | Received | Findings |
|----------|----------|----------|
| reviewer-preflight | Yes | clean: 0 type escapes, 0 TODOs, 0 audio binaries in repo, console.* only in the CLI entry block, suite 2267/2267, lint 0 |
| reviewer-edge-hunter | Yes (disabled in settings — domain assessed directly by Reviewer) | see [EDGE] observations |
| reviewer-silent-failure-hunter | Yes (disabled — assessed directly) | see [SILENT] observations |
| reviewer-test-analyzer | Yes (disabled — assessed directly; TEA's 11-mutation battery + Reviewer probes stand in) | see [TEST] |
| reviewer-comment-analyzer | Yes (disabled — assessed directly; every prose claim in the diff checked against evidence) | see [DOC] |
| reviewer-type-design | Yes (disabled — assessed directly) | see [TYPE] |
| reviewer-security | Yes (disabled — assessed directly) | see [SEC] |
| reviewer-simplifier | Yes (disabled — assessed directly) | see [SIMPLE] |
| reviewer-rule-checker | Yes (disabled — assessed directly; Rule Compliance below) | see [RULE] |

**All received: Yes**

## Reviewer Review — jt5-2 (round 1)

Scope: commits `5008243`, `f6cc819`, `b98ca9d`, `d9f7946`, `aa88865` (the
range also contains the sibling's uf1-13 lobby work — excluded).

### Rule Compliance

Changed `.ts` files vs `.pennyfarthing/gates/lang-review/typescript.md`:

- `src/shell/audio-manifest.ts` — #1 escapes: none. #2 keying: `SOUNDS` and
  `FRAME_DURATIONS` are `Readonly<Record<SoundName, …>>`, union-keyed, so a
  typo'd cue is a compile error. #5: zero imports (that is its contract); the
  seam-scope checklist scans now cover it via `NEW_MODULES` (Dev added it as
  instructed — verified in the diff and the green scan). [RULE] compliant.
- `src/shell/audio.ts` — re-export uses `./audio-manifest.js` (#5 ✓, and the
  file's own #5 scan enforces it); no escapes introduced; the removed blocks
  moved verbatim (diff inspected hunk-by-hunk via preflight + direct read).
  [RULE] compliant.
- `tests/audio-seam-scope.test.ts` — deletion + supersession comment + one
  array extension; no new assertion machinery. [RULE] compliant.
- `.mjs` tooling — untyped by design (matches star-wars' bake precedent); JS
  checklist #8 concerns addressed under [TEST] below.

### Observations

1. `[VERIFIED]` **The bake's PRNG claim is true.** `bake-samples.mjs`
   `mulberry32` is the canonical form; core's `rngNext`
   (`src/core/frame.ts:192-198`) differs only by `>>> 0` vs `| 0` on the
   increment (sign interpretation only — every downstream op is bitwise and
   coerces identically) and by `t ^ (t + X)` vs `(t + X) ^ t` (XOR commutes).
   Identical sequence for any seed; the header's "same generator" sentence is
   accurate. Checked against the prose-claims rule — no citation overreach.
2. `[VERIFIED]` **Cross-process determinism** (the recipe's idempotent-upload
   promise, probed beyond TEA's in-process test): two separate `node` CLI runs
   → `diff -r` byte-identical. [TEST]
3. `[VERIFIED]` **No clipping:** worst peak 19,348 / 32,767
   (`cliff_destroyed.wav`) — the `encodeWav` clamp is headroom insurance, not
   an active limiter. [EDGE]
4. `[VERIFIED]` **Wiring end-to-end:** `SOUNDS` → bake filename → staging key
   `joust/sfx/<file>` → served at `DEFAULT_BASE_URL` + `<file>` — the exact
   URLs the pasted AC4 curls returned 200/audio-wav for; the engine consumes
   the same `sounds`/`channels`/`frameDurations` maps (`audio.ts:471-480`,
   unchanged wiring). No user input anywhere in the flow; filenames are
   compile-time constants. [SEC][SILENT] — the engine's silent 404 degrade is
   pre-existing, by design, and now documented honestly in three places.
5. `[LOW]` `[EDGE]` **CLI self-detection vs symlinked checkouts:**
   `bake-samples.mjs` gates its CLI on
   `process.argv[1] === fileURLToPath(import.meta.url)`. Node's ESM loader
   realpaths the module URL while `argv[1]` keeps the caller's spelling, so in
   a checkout reached through a symlink the guard goes false and the CLI
   exits 0 having staged NOTHING — the recipe would then upload no joust keys
   while printing Done (half-silent: the printed verify curl 404s, and TEA's
   spawn test reds on any affected machine). Not reachable in this checkout
   (real path, deploy proven live). Fix is one line when next touched:
   compare `realpathSync` of both sides. Routed as a Delivery Finding to
   jt5-6 (the next bake-touching story) rather than a rework round.
6. `[SIMPLE]` **No over-engineering found:** the synth is three primitives +
   a data table; the one abstraction (specs keyed by cue) is what the
   throws-on-missing contract requires. Nothing to remove without losing a
   guard. [TYPE] the .mjs boundary is typed at its consumer (the manifest).
7. `[DOC]` `[VERIFIED]` **Every changed prose claim checked against
   evidence:** README's "200 + audio/wav curled for every file at upload
   (2026-08-01)" — matches the 17-row session paste; "No `.wav` lives in this
   repo" — preflight `find` returned none and the fence test enforces it;
   counts ("eleven ROM-cited moments") left verbatim for jt5-7 exactly as the
   deviation records; `audio.ts` header's active-voice wording clears the
   stative-claim fence (the fence's own suite is green over it).

**Tenant isolation:** N/A — no tenants, no auth surface, no user input; the
only external write is the deploy, gated on local credentials.
**Error handling:** the bake throws on a manifest cue with no spec, a missing
`FRAME_DURATIONS` entry, and a missing outDir; the recipe's
`set -euo pipefail` turns any of those into a hard abort before upload.

### Devil's Advocate

Assume this is broken. The strongest attack: **these seventeen sounds may bear
no resemblance to a real Joust cabinet** — nothing here ever heard one, the
firmware that defines the waveforms is unvendored, and no test can measure
"sounds right". That is real, and it is also exactly what the story scoped:
every artifact (tool header, README, CUE_SOURCES) says stand-in, names its
table, and the epic's later stories can replace waveforms without touching the
contract. The second attack: **the live 200 is a point-in-time fact** — the
bucket can be emptied tomorrow and this suite stays green forever; the README
now says precisely that and prescribes the curl. Third: **jt5-6 will grow the
manifest, and the bake then throws — aborting the WHOLE deploy-assets recipe,
star-wars staging included.** That is the designed loud failure, but the
person it fails on is a different story's Dev mid-deploy; routed as a finding
into jt5-6's description so it arrives expected. Fourth: the CLI guard's
symlink edge (observation 5) — the one genuine code defect found, Low because
every path to it leaves loud footprints. Fifth: **repeated flap cues at
~60 Hz cadence against 1.5 s samples** — could voice-steal into audible
stutter; the channel map puts both player wing cues on one channel and the
engine steals within it, which is what the machine's one-voice arbitration
did; the early-decay envelopes mean a steal cuts near-silence, not sound.
Sixth: a malicious filename cannot occur (manifest constants), an empty
manifest cannot upload vacuously (the bake's own tests pin set-equality and
non-emptiness). Nothing here rises to blocking.

### Verdict rationale

No Critical, no High. One Low (routed with a named owner), zero rule
violations, every deviation sound. The AC4 evidence is pasted, machine-checked
in shape, and spot-verified arithmetically.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `SOUNDS` manifest entry → deterministic bake
(`mulberry32(seedFrom(name))`, per-cue spec) → staging dir → `deploy-r2.mjs`
key `joust/sfx/<file>` → `DEFAULT_BASE_URL + <file>` fetch → `@shared/audio`
channel voice. Safe because every name in the chain is a compile-time
manifest constant; no user input exists on the path, and the only external
write (the bucket) is credential-gated and idempotent (cross-process
byte-identical, probed).
**Pattern observed:** the dependency-free-manifest-with-identity-re-export at
`plugins/joust/src/shell/audio-manifest.ts` + `audio.ts:70-82` — a clean
resolution of the two-runner constraint, worth reusing when any other plugin
grows deploy-time tooling.
**Error handling:** bake throws on missing spec / missing duration / missing
outDir (`bake-samples.mjs:283-296`); the recipe's `set -euo pipefail` turns
each into a hard pre-upload abort. The engine's silent 404 degrade is
pre-existing, deliberate, and now honestly documented at all three surfaces.
**Dispatch tags:** [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE]
— all incorporated above (specialists disabled in settings; domains assessed
directly, per project convention, with TEA's 11-mutation battery plus two
fresh Reviewer probes standing in for the test-analyzer's dynamic half).
**Findings:** one Low (CLI symlink edge, routed to jt5-6 with a named fix),
one Improvement (jt5-6 deploy coupling, routed to its description). No
Critical, no High.

**Handoff:** To SM (The Announcer) for finish-story.
## Impact Summary

**Verdict:** APPROVED, round 1, no Critical, no High. blocking_count: 0
(sm-finish preflight, cross-verified against the session and epic YAML).

**What shipped:** joust's seventeen cues exist and are LIVE — synthesised
stand-ins (`tools/sample-bake/bake-samples.mjs`), one per manifest entry,
uploaded via the extended `just deploy-assets`, proven by 17× HTTP/2 200 +
`audio/wav` (see `## AC4 Evidence`). The manifest
(`SOUNDS`/`SoundName`/`FRAME_DURATIONS`) moved to the dependency-free
`src/shell/audio-manifest.ts` so the bake runs under the recipe's plain node;
`audio.ts` re-exports by identity. README status flipped off "silent"; counts
left verbatim for jt5-7.

**Delivery Findings, by phase → final disposition:**

| Phase | Finding | Disposition |
|---|---|---|
| TEA | README Quick-start dev-server paragraph refuted by mg1-2 | Routed → jt5-7 description (verified written) |
| TEA | deploy-assets guards are token-level (staging presence, not bake correctness) | Recorded as an accepted limit; live-200 curls own bake correctness |
| TEA | `joust.slabgorb.com` liveness claim unmeasured | Routed → jt5-7 description (verified written) |
| Dev | `MODULE_TYPELESS_PACKAGE_JSON` warning on direct plain-node entry of the manifest | Recorded only — nothing shipped is affected; do not "fix" the 3-field package stub |
| Reviewer | CLI symlink edge (argv[1] vs realpathed module URL → silent no-op) | Routed → jt5-6 description with the one-line fix (verified written) |
| Reviewer | jt5-6's SNPCR2 will abort the whole deploy until its synth spec exists | Routed → jt5-6 description (verified written) |

**Deviations:** all 7 stamped ✓ ACCEPTED by the Reviewer. **Order deviation**
(story ran before jt5-6/8/9/15/17 despite the agreed jt5-2-last ordering):
recorded at setup; consequence owned by jt5-6's own description.
