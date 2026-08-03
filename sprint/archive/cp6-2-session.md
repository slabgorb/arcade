---
story_id: "cp6-2"
jira_key: "cp6-2"
epic: "cp6"
workflow: "tdd"
---
# Story cp6-2: Bake the samples, upload them, and prove a live 200 — the sound actually arrives

## Story Details
- **ID:** cp6-2
- **Jira Key:** cp6-2
- **Points:** 5
- **Priority:** p2
- **Repos:** arcade
- **Workflow:** tdd
- **Branch:** none
- **Stack Parent:** none

> Trunk-based. Work lands directly on `main`. The claim branch
> `feat/cp6-2-bake-upload-prove-200` is pushed EMPTY (tip == `main`) purely so a sibling
> checkout's `git branch -r | grep cp6-2` probe sees the claim; nothing ever merges it.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T11:32:27Z
**Round-Trip Count:** 0

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T10:08:35Z | 2026-08-03T10:15:15Z | 6m 40s |
| red | 2026-08-03T10:15:15Z | 2026-08-03T10:33:32Z | 18m 17s |
| green | 2026-08-03T10:33:32Z | 2026-08-03T10:54:39Z | 21m 7s |
| review | 2026-08-03T10:54:39Z | 2026-08-03T11:32:27Z | 37m 48s |
| finish | 2026-08-03T11:32:27Z | - | - |

## Acceptance Criteria

1. All fourteen URLs under the centipede sfx prefix return a live 200, with the status codes pasted into the story — a green vitest is explicitly not sufficient evidence and the story says why.
2. The samples are baked from the ROM's own FREQ and CONT tables; any cue with no table behind it is baked as a declared stand-in and labelled as one, never presented as transcribed.
3. The baker imports a dependency-free manifest module and asserts identity with the shell's SOUNDS record, so a later cue with no bake spec throws rather than falling back to a default sound.
4. just deploy-assets names centipede alongside star-wars and joust, and a guard reddens if that line is removed — the recipe is not trusted on inspection alone.
5. The game has been played with sound on and the result reported in prose, because a decodable wav of the wrong tone passes every automated check in this repo.
6. README.md no longer describes centipede as silent and no longer points at the archived cp5 as the owner of this work.

---

## Sm Assessment

Setup measured the description's falsifiable claims before writing a line of context, per the
standing rule that `sm-setup` and every later reader copy a description forward as current fact.
This description is unusually dense with them — eleven distinct file:line or existence claims — and
the result is worth stating plainly: **nine verified exactly, one is already-shipped, and one is
half-right in a way that would cost Dev a rebuild.** Every number below was run, not reasoned.

### Board state on arrival

Clean by every documented probe, and one of them mattered:

- `pf agent start sm` → `NEW_WORK_STATE`; the story is `backlog`, 5pt, p2, `tdd`, `repos: arcade`.
- `git branch -r | grep -Ei cp6` after `fetch --prune` → **no remote branch**. Nobody has claimed it.
- The sibling-session sweep (`ls /Users/slabgorb/Projects/a-*/.session/*-session.md`) → the only
  live session anywhere is a-1's `jt9-2` (joust). **Read the output, do not just check it ran** —
  the documented failure is a glob that no-matches and reads like a clean board.
- **The probe that mattered:** the first sweep, taken before the pull, found
  `/Users/slabgorb/Projects/a-2/.session/cp6-1-session.md` — this story's own prerequisite, live in
  a sibling, sitting at its finish phase with a round-trip count of 2. Had setup proceeded then,
  TEA would have been told to "consume cp6-1's recorded lengths" against a dossier that did not yet
  exist in this checkout. The user pulled; cp6-1 is now `status: done, completed: '2026-08-02'` and
  its whole deliverable is on `main` (`0860f74`). **The prerequisite is satisfied, and it was not
  five minutes earlier.**

### The epic's premise, re-measured live today

The epic exists because centipede is silent. That is still true, measured this session:

| URL under `arcade-assets.slabgorb.com/centipede/sfx/` | status |
|---|---|
| shot_fire, mushroom_hit, segment_kill, spider_kill, flea_kill, scorpion_kill, head_bottom | **404** ×7 |
| player_death, wave_clear, bonus_life, centipede_march, spider_move, flea_move, scorpion_move | **404** ×7 |
| *control* `tempest/sfx/player_fire.wav` | **200** |
| *control* `joust/sfx/enemy_death.wav` | **200** |

Fourteen 404s, two 200s on the same host in the same pass. The host is healthy and the prefix is
simply empty — exactly as the epic claims. This is AC-1's **baseline**, and it is the number the
finish must be able to contrast against.

### Claims that verified exactly — do not re-run these

Recorded so the next reader does not re-spend the sweep (the jt5-10 rule: "no corrections" is a
measurement result with a cost attached).

| Claim | Verdict |
|---|---|
| `src/shell/audio.ts` imports `@shared/audio` at `:25-28` | **exact** — `:25` `import {` … `:28` `} from '@shared/audio'` |
| `src/shared/audio.ts:176-178` swallows fetch/decode failure | **exact** — `.catch(() => { failLoad(file) })`, all three lines |
| `justfile:274-289` is the `deploy-assets` recipe | **exact** — `:274` the target line through `:289` the last verify echo |
| The bucket is plain `arcade`, not `arcade-assets` | **true** — `assets_bucket := "arcade"` at `justfile:271` |
| Six tables at `CENTI4.MAC:2455-2465` | **true** — FREQ0/1/2/3/4/6, six FREQ tables, no FREQ5; the range ends exactly at FREQ6 (`:2466` blank, `:2467` `.SBTTL`) |
| `shell/audio.ts` declares fourteen cues | **true** — 14 record entries at `:46-61`. A bare `grep -c '\.wav'` returns **15**; the fifteenth is the comment at `:17`. Count the record, not the file. |
| `plugins/tempest/tools/pokey-bake/bake-sfx.mjs` exists | **true** |
| `plugins/joust/src/shell/audio-manifest.ts` exists | **true** |
| `plugins/joust/tools/sample-bake/deploy-assets.test.mjs` exists | **true** |
| `plugins/centipede/tools/pokey-bake/` does not exist | **true** — centipede has only `audit/` and `pictures-bake/` |

### DEFECT 1 — half of AC-6 is already satisfied, and a RED test for it would be vacuous on arrival

The description says the README's line 25 "currently points readers at 'the open epic
`sprint/epic-cp5.yaml`' that has been archived and done since 2026-08-01."

**Measured: `grep -c "epic-cp5" plugins/centipede/README.md` → 0.** There is no such pointer. The
README's line 28 already reads "baking and hosting the samples is owned by `sprint/epic-cp6.yaml`,
which exists to repair exactly that gap", and the surrounding paragraph already describes cp5 as
*closed*, having "never filed the asset story it was deferring to".

`git log -S` names the commit: **`c6d75c4 chore(sprint): file epic cp6`** — the very commit that
filed this epic also fixed the README. So the description was written against a README state that
its own epic-filing commit had already changed. This is a description stale against **itself**.

**Consequence for the RED phase, and it is the whole reason this is written down.** AC-6 has two
clauses. The second ("no longer points at the archived cp5 as the owner of this work") is **already
true on arrival**. A test asserting it passes the moment it is written, proves nothing, and looks
like coverage — the `guard-backfill: mutation IS the RED` shape. The honest treatment is a guard
that is **mutation-proved** (re-introduce the cp5 pointer, watch it redden, restore) rather than one
that is merely green. The first clause — `README.md:11` still reads "playable and **silent**" — is
genuinely open and is real work.

**Do not edit AC-6.** Per the mg1-2 rule, the AC text stands as filed and the correction is carried
by a marked block above it in the context, so the epic YAML and the context cannot silently disagree
about what the story asked for.

### DEFECT 2 — cp6-1's BLOCKING finding never reached this story's description

cp6-1's finish commit states, in its own message: *"POKEY voice 0 is contended too … filed
**BLOCKING FOR cp6-2**, which wires those channels."* Its Reviewer's round-3 assessment carries the
same disposition, and the archived session names cp6-2 **forty-three times**.

**None of it is in cp6-2.** The `epic-cp6.yaml` diff of that finish commit is two lines —
`status: in_review → done` and a `completed:` stamp. A term count over cp6-2's description returns
**0** for every one of: `voice 0`, `preempt`, `arbitration`, `contend`, `fixture`,
`sound.fixture`, `sound.md`, `invention`, `stand-in`.

This is the documented jt9-1 failure exactly — *"the Reviewer's own 'file this with X' line is a
routing instruction nobody executes."* The finding is real, it is blocking, and it lives only in an
archived session and a commit message. Since cp6-2's description predates cp6-1 entirely, it names
**no artifact at all**: it says "Consume cp6-1's recorded lengths, loop flags and gating" without
naming `sound.fixture.json`, `sound.md` or `claims/16-sound.json`. The context file carries all of
it forward; that is the repair.

The finding itself, stated so nobody re-derives it: `BEQ 52$ ;IF NO PLAYER EXPLOSION`
(`CENTI4.MAC:2437`) is the voice-0 twin of `BEQ 48$ ;IF NO BONUS SOUND` (`CENTI4.MAC:2374`), and
`:2416 BNE 50$ ;ALWAYS` blocks fall-through — so **playerDeath preempts all four kill cues
outright** on the machine. Our `CHANNELS` map splits them (`'impact'` vs `'alert'`), so the clone
rings both where the cabinet rings one.

### DEFECT 3 — the input contract has a hole in it: four of fourteen cues carry NO length

Parsed from `sound.fixture.json` rather than read:

| cue | `origin` | `freqTable` | `lengthSeconds` |
|---|---|---|---|
| mushroom | `invention` | null | **null** |
| headBottom | `invention` | null | **null** |
| waveClear | `invention` | null | **null** |
| **fleaLoop** | **`rom`** | null | **null** |

Three inventions, plus one that is **ROM-sourced and still has no length** — `fleaLoop` is a
computed sweep (`computedCite: CENTI4.MAC:2409-2414`), not a tabulated tone, so it has no countdown
window to derive from. The other ten carry real numbers.

Two consequences, both concrete:

1. **A baker that maps `lengthSeconds → sample count` over all fourteen produces `NaN` four times.**
   joust's baker — the named model for this half — throws on exactly this:
   `if (!(frames > 0)) { throw ... }` at `bake-samples.mjs:321-323`, the second of its two guards
   (the first, `if (!spec)` at `:315-319`, is AC-3's "throws rather than falling back"). Centipede's
   four null-length cues would all trip the second one. They need declared stand-in lengths, chosen
   and labelled.
2. **AC-2's "declared stand-in" bucket has FOUR members, not three.** AC-2 splits the world into
   "baked from the ROM's own FREQ and CONT tables" and "any cue with no table behind it". `fleaLoop`
   is in the second bucket by AC-2's letter — it has no table — but its `origin: 'rom'` will tempt a
   reader into the first. `sound.md` §5 item 4 says it outright: *"fleaLoop is a sweep, not a tone.
   A single fixed sample is a stand-in for it and must say so."* Getting this wrong is the precise
   failure AC-2 exists to prevent: a stand-in presented as transcribed.

### DEFECT 4 — the model-baker citation is half right, and copying it wholesale fails AC-3

The description says to model the baker on `plugins/tempest/tools/pokey-bake/bake-sfx.mjs`. That is
right for the **waveform** half and wrong for everything else:

- `grep -n "tempest/tools" justfile` → **nothing**. Tempest's POKEY baker is wired into **no
  recipe**. The recipe bakes star-wars's `pokey-bake` and joust's `sample-bake`.
- Tempest's baker imports its own standalone `./sfx-data.mjs`. It has **no** link to any shell
  manifest and makes **no** identity assertion — which is the exact architecture AC-3 mandates.

So: **tempest is the POKEY-transcription model; joust is the manifest-identity and deploy-wiring
model.** The description does name joust for the manifest half, correctly. But a Dev told "model on
tempest" who copies tempest's shape gets a baker with a private data table and no identity link,
failing AC-3 while appearing to have followed the instruction. Both models are named explicitly in
the context, with which half each one owns.

### Verified good — no correction needed, and worth one line so nobody re-checks

**`FREQ4` is a two-line table.** `CENTI4.MAC:2463` is `FREQ4: .BYTE 28,28,30,28,28,30,3C,51` and
`:2464` is an **unlabelled** `.BYTE 50,50,60,50,50,60,74,0A2,0` that continues it — 17 bytes across
two lines. This is the classic multi-line-ROM-table trap that has bitten this fleet before (the
jt5-5 sound-table finding; the `rom-table-continuation-bit` rule). **cp6-1 got it right**:
`tableCite: 'CENTI4.MAC:2463-2464'`, `tableLengthBytes: 17`. No correction is needed — the hazard is
a baker that "tidies" it back to the labelled line and silently halves the bonus-life tone.
`FREQ6` (`:2465`) does **not** continue.

### The census that settled a question rather than raising one

`sound.md` §5 item 3 hands cp6-2 an either/or: the inventions "must be baked as **declared
stand-ins or not at all**". Left open, that is the mg1-2 shape — TEA cannot write RED, because one
branch bakes fourteen files and the other bakes eleven, and AC-1 demands fourteen 200s.

It did not need a user ruling, because the house already answered it. **joust bakes every manifest
cue**: `for (const name of Object.keys(SOUNDS))` at `bake-samples.mjs:313`, one `writeFileSync` per
entry at `:326`, eighteen cues, and joust's cues are *synthesised* — it had no ROM sample data at
all and still baked all eighteen, all serving 200 today. An unbaked cue is a 404, and a 404
degrades silently into exactly the condition this epic exists to cure.

So AC-1 and AC-2 together already close `sound.md` §5's either/or in favour of **bake all fourteen,
four of them labelled stand-ins**. Recorded rather than asked — the census pruned the option instead
of ranking it.

### The one thing that WAS the user's, and the ruling

`just deploy-assets` is a manual publish to a public production bucket that CI never touches, and
AC-1 cannot be met without it. Measured before asking: `scripts/deploy-r2.mjs` has no
skip-unchanged or ETag logic, so the run re-bakes and re-uploads **star-wars's music + sfx and
joust's sfx** as well — byte-identical, since both bakers are deterministic (joust seeds a
`mulberry32` PRNG per cue name), but it does touch two other games' live objects. Narrowing the
recipe is not available: AC-4 requires centipede be named *alongside* star-wars and joust.

**🔨 USER RULING (2026-08-03): authorized in-story.** The pipeline runs `just deploy-assets` itself
once the bake is green, then curls the fourteen URLs and plays the game with sound. This is the
order the ACs imply — AC-5's play-test cannot happen before the upload, because
`DEFAULT_BASE_URL` (`src/shell/audio.ts:32`) points at the R2 host, not at anything local.

### Scope call I made rather than asking

`src/shell/audio.ts:16-19` carries a banner reading *"NO SAMPLES SHIP WITH THIS STORY … Every
filename below names a `.wav` that a LATER **cp5** story bakes and uploads by hand"*. The stale cp5
pointer AC-6 describes is gone from the README but survives **here**, in the very file this story
must edit to split the manifest — and cp6-2 falsifies the banner's other half too, since after this
story the samples do ship. Folding the correction in rather than filing it: it is inside the story's
own blast radius, AC-6's intent covers it, and leaving a known-false banner in a file the story
rewrites would be the `wrong-prose fix: grep all phrasings` failure. Flagged here so the Reviewer
sees it was a deliberate call and not scope creep.

### Handoff

To **Han Solo (TEA)** for the RED phase. Everything above is in
`sprint/context/context-story-cp6-2.md`, with the four defects fronted as marked correction blocks
above the ACs they touch — the ACs themselves are reproduced byte-verbatim from the epic YAML and
have not been edited, verified by a `python3` `in` test against `yaml.safe_load`, not by grep.

Two things TEA should not have to discover cold:

- **`sound.fixture.json` is the input contract**, not `sound.md`. Consume the fixture; the prose is
  the explanation. `sound.md` §5 is addressed to this story by name and is worth reading first.
- **The dev port is TAKEN, by a sibling, right now.** `5270` is held by a live cabinet dev server:
  `node` **pid 7744**, cwd **`/Users/slabgorb/Projects/a-1`** — and it is serving the real cabinet,
  not a fallback (`/centipede/` and a nonsense control `/banana-not-a-game/` return **different**
  md5s, which is the only check that proves it, since the lobby's SPA fallback answers 200 to
  everything). a-1 is the checkout running `jt9-2`.

  AC-5 is a listen-with-sound check, so this is directly load-bearing: `just serve` here will fail
  on `strictPort`, and opening `127.0.0.1:5270/centipede/` would produce a **true observation about
  a-1's working tree** — the documented wrong-checkout screenshot failure, in its audio form.
  **Do not kill a-1's server.** Serve this tree beside it:
  ```bash
  npx vite --port 5290 --strictPort
  ```

  **A refinement on the documented probe, because it misled me first:** the sidecar's recipe
  `PID=$(lsof -ti tcp:5270 | head -1)` returned **pid 1702 — Google Chrome's network service**, a
  *client* holding a connection to the port, whose cwd is `/`. That reads as "held by something
  unidentifiable" and is worthless for attribution. Ask for the listener explicitly:
  ```bash
  LPID=$(lsof -nP -iTCP:5270 -sTCP:LISTEN -t | head -1)
  lsof -a -p "$LPID" -d cwd -Fn | grep '^n'
  ```
---

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs` — AC1 (mechanical half), AC2, AC3. New.
- `plugins/centipede/tools/pokey-bake/deploy-assets.test.mjs` — AC4, AC6. New, modelled on joust's twin.
- `plugins/centipede/tests/audio-seam-scope.test.ts` — **modified**: four existing guards that
  assert centipede is SILENT, retired or inverted.

**Tests Written:** 33 new across 6 ACs, plus 4 existing guards turned around.
**Status:** RED — 22 failed, 1092 passed, 6 skipped (baseline before this phase: **1087/1087 green**).
`npm run lint` exits 0 and the orchestrator suite is **390/390**.

### The finding that mattered most: four shipped guards assert the opposite of AC-6

Nothing in the story mentions them. `tests/audio-seam-scope.test.ts` carries guards written by
cp5-1 and cp5-2 that were correct then and are false the moment this story lands:

| guard | asserted | after cp6-2 |
|---|---|---|
| `claims no R2 upload …` | `audio.ts` must NOT match `/uploaded\|hosted and verified\|confirmed 200/` | **forbids the fix** — RETIRED |
| `says … but no samples ship yet` | README must SAY "no samples" | inverted: must not |
| `does not claim centipede now HAS sound` | README must NOT say it has sound | inverted: must say it |
| `warns … a wall of 404s … expected` | README must warn about 14 404s | inverted: there are none |

Left alone these stay green while the story is built and then red the moment the README is told the
truth — and **the cheapest way back to green is to keep describing a silent cabinet**, which is
failing AC-6 while the suite reports success. That is the mg1-9 "guard whose correct fate is
deletion" shape, so they were turned around here, in the RED, where the inversion is the
specification rather than damage to be repaired.

`commits no .wav (or any other sample) anywhere in the plugin` was deliberately **kept**: the baker
stages to a temp dir and the plugin tree must never grow a binary.

### Mutation battery — 12 mutations, 12 caught, and it found a real defect in my own test

Every mutation anchored on a substring asserted to occur exactly once, applied, run, restored by
explicit write (never `git checkout --`, which would have wiped this phase's uncommitted work).
`git status` clean afterwards; the justfile verified byte-identical.

| # | mutation | result |
|---|---|---|
| G1 | README re-points at the archived cp5 | caught |
| G4 | `assets_bucket` renamed to `arcade-assets` | caught |
| G5 | shell fetches another cabinet's prefix | caught |
| A1 | ROM parser stops at the labelled line (loses FREQ4's continuation) | caught |
| A2 | ROM parser reads bare literals as decimal instead of hex | caught |
| A3 | `flatten()` stops un-wrapping blockquotes | caught |
| A4 | recipe matcher leaks into the comment above the recipe | caught |
| P1-5 | each of the four staged prefixes, mkdir and bake line dropped separately | 5 caught |

**Two of them were the point of running it.**

1. **A real survivor exposed a weak test.** The first cut of "still stages star-wars AND joust"
   asserted only that each prefix appeared *somewhere* in the recipe body. `joust/sfx` appears
   **twice** — the `mkdir` at `justfile:279` and the bake at `:285` — so deleting it from the mkdir
   left the other mention and the test stayed green. Same for `star-wars/music`. That is this
   story's own failure class in miniature: a prefix staged but never baked into uploads an empty
   directory, every URL 404s, and `@shared/audio` swallows all of it under a green suite. The test
   now asserts the **pair** — every staged prefix must also have a baker line — and all five
   pair-mutations are caught. Proving it required simulating the post-GREEN recipe first, because
   the guard is legitimately RED today on centipede's half.

2. **A FALSE survivor exposed a defect in the harness.** `A3` first reported SURVIVED. It had not
   been tested at all: vitest's `-t` is a **regex**, so the filter `flatten() un-wraps …` matched
   nothing, all 1120 tests were skipped, vitest exited 0, and my runner read that as "still green".
   A mutant that was never run is indistinguishable in the report from one that was caught. The
   runner now parses the summary line and treats a zero-selection as a hard failure rather than a
   pass. Same family as the `grep -Eci` alternation trap: a green from a filter you just composed is
   a claim about your filter first.

### The apparatus is tested before it is trusted

The ROM parser in `bake-sfx.test.mjs` is this file's own untested code until it is tested, and two
of its properties are load-bearing:

- **Radix.** `.RADIX 16` is inherited, so a bare literal is hex. If the parser read decimal, every
  table assertion would compare an all-zero array against an all-zero array and pass vacuously.
  Pinned by `FREQ2 === [0xF0, 0xE0, … 0x50]`; mutation A2 proves it bites.
- **The unlabelled continuation.** `FREQ4` is `:2463` plus an unlabelled `.BYTE` at `:2464` — 17
  bytes, exactly as cp6-1 recorded. A parser stopping at the labelled line reads 8 and silently
  halves the bonus-life tone: no 404, no exception, just a shorter sound. Mutation A1 proves it.

### The four cues with no length are the story's real trap

Parsed from `sound.fixture.json`: `lengthSeconds` is null for `mushroom`, `headBottom`, `waveClear`
(all `origin: invention`) **and `fleaLoop`, which is `origin: rom`** — a computed sweep
(`CENTI4.MAC:2409-2414`) with no table and no countdown. Its ROM origin invites "transcribed" and it
is not one.

`PROVENANCE` is therefore asserted to be **derived from the fixture** (`freqTable === null` ⇒
`stand-in`) rather than a hardcoded list of four names, so it cannot drift from the ruling. A
positive control guards the derivation: the test first asserts the fixture still names exactly those
four, so a fixture change reds here instead of quietly emptying the check.

Two further traps are pinned because they pass every other assertion:
- **A stand-in that bakes silence** satisfies "one file per cue", "decodable RIFF/WAVE" and every
  URL check, and leaves four cues mute in play — indistinguishable from the 404s this story ends.
  Asserted audible.
- **`march` stretched to its period.** It is 7 frames of sound in a 16-frame period; `sound.md` §5
  says do not stretch it. Every transcribed cue's baked duration is asserted equal to the fixture's
  `lengthSeconds`, which makes 0.1169s right and the plausible-sounding 0.267s wrong.

### AC-6 is half-green on arrival, and it is guarded as a regression rather than trusted

The SM assessment above measured that the README stopped pointing at the archived cp5 in `c6d75c4`,
the very commit that filed this epic. `does not point at cp5 as the owner of this work` therefore
**passes the moment it is written**. It is kept as a regression guard and mutation G1 proves it
bites; it is explicitly labelled green-on-arrival in the file so no one reads a pass as work done.
The genuinely open half — `README.md:11`'s "playable and **silent**" — is red.

### AC-1 and AC-5 cannot be closed by any test in this repo, deliberately

`src/shared/audio.ts:176-178` swallows a 404, a blocked autoplay and undecodable data identically,
so **no vitest assertion can distinguish a populated bucket from an empty one.** What is checkable
is the other half of the pair, and it is: the filenames the baker writes are exactly the filenames
the shell fetches, and the base URL is centipede's own prefix. A green run of these files means "the
right files were built", never "the sound arrived".

AC-1's evidence is the fourteen curl status codes; AC-5's is prose after playing it. Both are
finish-phase artifacts and both are the user-authorized `just deploy-assets` run. Measured live this
session for the baseline: **all fourteen 404, `tempest` and `joust` controls 200 on the same host.**

### Rule Coverage — `.pennyfarthing/gates/lang-review/typescript.md`

| Rule | Test | Status |
|------|------|--------|
| #1 type-safety escapes | no `as any` / `@ts-ignore` introduced; new files are `.mjs` (untyped by design, matching joust's baker) | n/a |
| #5 module/declaration — `.js` extension in relative ESM imports | the baker is reached by an explicit `.ts`/`.mjs` specifier; `audio-manifest.ts` asserted to have **zero** imports | `audio-manifest.ts exists and is DEPENDENCY-FREE` — failing |
| #8 test quality — vacuous assertions | Phase C self-check below; every apparatus helper has its own can-fail test | `flatten()`, `deployAssetsRecipe()`, ROM parser — all passing + mutation-proved |
| #8 test quality — integration tests import from `src/`, not `dist/` | both new files import `../../src/shell/…` | passing |
| #9 build/config — unused import exits `tsc` 2 | caught and fixed during this phase (see deviations) | `npm run lint` exit 0 |

**Rules checked:** 5 of 9 sections applicable (no React/JSX, no enums, no async-heavy surface, no
generics introduced).
**Self-check:** 0 vacuous tests shipped. One weak test found by mutation and strengthened
(`every staged prefix is also BAKED into`); one harness defect found and fixed.

### What Dev inherits

- **6 tests report as `skipped`, not `failed`.** The `beforeAll` in the "writes the manifest" block
  cannot bake until `bake-sfx.mjs` exists, so vitest skips that block's specs. The **file** still
  reports FAIL. They will run and must pass once the baker lands — do not read the skip as optional.
- The API the tests require: `bakeSfx(outDir, opts?)`, plus exports `SOUNDS` (the manifest itself,
  by identity), `PROVENANCE`, and `TABLES`. See the deviation below — the injection point is TEA's
  imposition and the reasoning is recorded.
- **The dev port is held by checkout a-1** (`node` pid 7744). AC-5 is a listen check; serve on
  `npx vite --port 5290 --strictPort` and do not kill a-1's server.

## Design Deviations

### TEA (test design)

- **Specified an injection point on `bakeSfx` that no sibling baker has**
  - Spec source: context-story-cp6-2.md, AC-3
  - Spec text: "so a later cue with no bake spec throws rather than falling back to a default sound"
  - Implementation: the throw is tested behaviourally via `bakeSfx(staging, { sounds: rogueRecord })`,
    which requires the baker to accept an overridable cue record. joust — the named model — never
    covers its own equivalent throw at all: `bake-samples.mjs:315-319` implements it and no test
    exercises it. A source-text assertion was rejected as an alternative because it is the documented
    `toString`-tripwire reject class.
  - Rationale: AC-3 states a behaviour, and a behaviour needs a behavioural test. Without an
    injection point the only way to reach the throw is to edit the shipped manifest.
  - Severity: minor
  - Forward impact: Dev may name the option differently, but the throw must stay reachable from a
    test without editing `audio-manifest.ts`. If Dev changes the shape, update the test with it.

- **Modified another story's test file rather than filing the conflict**
  - Spec source: context-story-cp6-2.md, "Scope" — `tests/audio-seam-scope.test.ts` is not named
  - Spec text: in scope is "the `audio-manifest.ts` split and the `audio.ts:16-19` stale-cp5 banner;
    the `deploy-assets` recipe + its guard; `README.md`"
  - Implementation: four guards in `tests/audio-seam-scope.test.ts` (owned by cp5-1 and cp5-2) were
    retired or inverted, and one unused import removed.
  - Rationale: those guards assert centipede is silent. AC-6 requires the README stop saying so, so
    the two cannot both hold — this is not a scope choice but a contradiction that must be resolved
    inside this story. Leaving them would make "keep the README silent" the cheapest path to green.
  - Severity: minor
  - Forward impact: cp5-1's and cp5-2's AC-6 blocks no longer assert what they originally did. Each
    change carries an inline comment naming cp6-2 and the reason, so the history stays legible.

- **AC-5 has no automated test**
  - Spec source: context-story-cp6-2.md, AC-5
  - Spec text: "The game has been played with sound on and the result reported in prose, because a
    decodable wav of the wrong tone passes every automated check in this repo"
  - Implementation: no test written. The AC states its own untestability as its reason for existing.
  - Rationale: a test asserting "someone listened" would be a test of the session file, not of the
    game. Writing one would manufacture the appearance of coverage over the exact gap the AC names.
  - Severity: minor
  - Forward impact: AC-5 is a finish-phase prose artifact, alongside AC-1's curl output. Neither can
    be closed by the suite and the Reviewer should not expect a test for either.

**Handoff:** To Yoda (Dev) for GREEN.
---

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** centipede **1118/1118**; full fleet **11561/11561** (752 files, 1 todo);
`npm run lint` exit 0; orchestrator **390/390**.
**Landed on:** `main` (trunk-based) — RED `4d0e6d3`/`cb147af`, GREEN `289f025`, all pushed.

**Files Changed**
- `plugins/centipede/tools/pokey-bake/bake-sfx.mjs` — new. The baker.
- `plugins/centipede/tools/pokey-bake/vendor/{pokey.js,LICENSE}` — new, byte-identical to star-wars's.
- `plugins/centipede/tools/pokey-bake/.gitignore` — new (`out/`).
- `plugins/centipede/src/shell/audio-manifest.ts` — new. Dependency-free SOUNDS.
- `plugins/centipede/src/shell/audio.ts` — re-exports the manifest; stale cp5 banner replaced.
- `plugins/centipede/tests/audit/sound-dossier.test.ts` — cp6-1's two scope fences retired.
- `justfile` — `deploy-assets` stages and bakes centipede.
- `plugins/centipede/README.md` — AC-6.
- `plugins/centipede/docs/rom-study/cp6-2-demo-with-sound.png` — the play-test screenshot.

### AC-1 — the fourteen URLs, curled after the upload

`just deploy-assets` ran (user-authorized at setup) and uploaded **52 objects**.

| file | status | content-type | bytes |
|---|---|---|---|
| shot_fire.wav | **200** | audio/wav | 17678 |
| mushroom_hit.wav | **200** | audio/wav | 5804 |
| segment_kill.wav | **200** | audio/wav | 30502 |
| spider_kill.wav | **200** | audio/wav | 30502 |
| flea_kill.wav | **200** | audio/wav | 30502 |
| scorpion_kill.wav | **200** | audio/wav | 30502 |
| head_bottom.wav | **200** | audio/wav | 21164 |
| player_death.wav | **200** | audio/wav | 121876 |
| wave_clear.wav | **200** | audio/wav | 43244 |
| bonus_life.wav | **200** | audio/wav | 218058 |
| centipede_march.wav | **200** | audio/wav | 11266 |
| spider_move.wav | **200** | audio/wav | 64166 |
| flea_move.wav | **200** | audio/wav | 57644 |
| scorpion_move.wav | **200** | audio/wav | 32104 |

**14/14.** Every byte count matches the local bake exactly. The two other games the
same run re-uploaded still serve: `star-wars/music/space_theme.wav` **200**,
`joust/sfx/enemy_death.wav` **200**.

The four kill cues are **byte-identical** (md5 `46231544`), and that is fidelity rather than a
bug — cp6-1 ruled that all four collapse onto CHAN0's single `;EXPLOSION SOUND` table. The
transcription reproducing that collapse without being told to is the strongest evidence the
tables were read correctly.

### AC-5 — played with sound on, and exactly what I can and cannot claim

Served **this** checkout on 5290 (`lsof` confirmed cwd `a-3`; `/centipede/` and a nonsense control
returned different md5s, so it is the cabinet and not the SPA fallback) and left a-1's server on
5270 alone, as the handoff required.

Hooked `AudioBufferSourceNode.prototype.start` before unlocking the gate, clicked the canvas, and
played with held keys. Observed:

- **All fourteen fetched by the game itself, every one a 200.** The console carries **zero** audio
  404s — only the pre-existing `favicon.ico`, which the old README explicitly separated out. The
  "wall of 14 red 404s" that README warned about is gone.
- **Real playback of four distinct cues**, identified by buffer duration:
  `fire` 0.1837s ×3, `march` 0.1169s (looping), `spiderLoop` 0.6679s (looping),
  `playerDeath` 1.2691s. Those are the fixture's ROM windows to four decimals, so the buffers
  playing are provably the files this story baked and not a fallback.
- The screenshot shows real play: score 2057, three lives, mushroom field, shot in flight.

**What I cannot claim:** I did not *hear* it. An automated browser gives me delivery, decode and
scheduling, not perception — and AC-5 exists precisely because "a decodable wav of the wrong tone
passes every mechanical check in this repo," which includes every check above. What I did instead
was verify the sample *content* independently: peak 0.850 across all fourteen, RMS 0.19–0.43 (real
signal, not silence), zero-crossing rates 267–2752/s (distinct pitches, plausible for POKEY), and
the kill-cue collapse noted above. **The remaining risk is tone quality, and only a listen closes
it.** Recommend the user open `http://127.0.0.1:5290/centipede/` (or the live cabinet) and play a
wave before this is considered fully accepted.

### The four cues with no ROM source, and what I chose

`sound.md` §5 and AC-2 required declared stand-ins. Baking silence would have satisfied every
mechanical assertion — one file per cue, decodable, correct filename — and left four cues mute,
indistinguishable from the 404s this story ends. TEA's "a stand-in is still a sound" test forbids
that, so each is a short, plainly synthetic POKEY voice:

| cue | why it has no table | stand-in |
|---|---|---|
| `mushroom` | the shot path jumps *over* the explosion seed (`:2169` past `:2299-2300`) — deliberate silence | 0.06s dry tick |
| `headBottom` | arms NEWD (`:1310`), writes no sound register | 0.22s alert |
| `waveClear` | sets DELAY (`:2319`), no CHANn write | 0.45s two-step |
| `fleaLoop` | ROM-sourced but **computed** from ANTV every pass (`:2409-2414`) | 0.6s sweep running the ROM's own formula across ANTV's range |

`fleaLoop` is the one worth flagging to review: it is `origin: 'rom'`, so it invites being called a
transcription. It is not one, `PROVENANCE` says `stand-in`, and the fixed length is ours.

### Two defects I introduced and caught

1. **A second silence claim further down the README** (`README.md:147`, the shared-library section:
   "**No samples ship yet**"). I corrected the status block and the guard still failed. This is the
   grep-all-phrasings trap exactly — correcting prose in one place and leaving the same claim in
   another leaves the record false.
2. **`export type { SoundName } from …` does not create a local binding**, and `audio.ts` names the
   type in four signatures. The suite stayed **green** because vitest does not typecheck; only
   `npm run lint` caught it. Worth remembering that a green vitest says nothing about types here.

I also had to restore a `cp5-2` attribution my README rewrite deleted — a cp5-2 guard legitimately
protects the sentence naming which story wired the shell, and my rewrite dropped it.

## Design Deviations

### Dev (implementation)

- **Retired two more "still silent" guards, in a file outside the story's named scope**
  - Spec source: context-story-cp6-2.md, "Scope"; `tests/audit/sound-dossier.test.ts` is not named
  - Spec text: in scope is the baker, the manifest split, "the `deploy-assets` recipe + its guard;
    `README.md`"
  - Implementation: `tests/audit/sound-dossier.test.ts`'s `cp6-1 AC-6` block lost two of its three
    tests — one asserting `tools/pokey-bake/` does **not** exist, one asserting `deploy-assets` does
    **not** name centipede. The third (cp6-1's dossier honesty clause) is untouched, and the block
    was renamed to describe what it still checks.
  - Rationale: both are cp6-1 scope fences whose own failure messages name cp6-2 as the story that
    lifts them ("belongs to cp6-2, not cp6-1"). They forbid this story's entire deliverable; they
    cannot both hold. Same class as the four TEA inverted, in a file TEA did not scan.
  - Severity: minor
  - Forward impact: none — cp6-1's dossier deliverable is unaffected and its remaining guard still
    holds. A future reader sees the retirement comment naming cp6-2 and why.

- **Vendored a second copy of `pokey.js` rather than sharing one**
  - Spec source: CLAUDE.md, "Extract into `src/shared` only once a second game proves the
    duplication is real"
  - Spec text: as above — extraction requires a second game proving it
  - Implementation: `plugins/centipede/tools/pokey-bake/vendor/pokey.js` is byte-identical to
    star-wars's, making this the **third** copy (tempest, star-wars, centipede).
  - Rationale: per-plugin vendoring is the shipped pattern for this file and no test asks for
    extraction. Three copies now arguably clears the CLAUDE.md bar, but hoisting a vendored
    AudioWorklet into `src/shared` is a change to two already-shipping bakers and is not this
    story's work. Filed as a Delivery Finding instead.
  - Severity: minor
  - Forward impact: minor — a future extraction has three call sites, not two.

- **`bakeSfx` takes an `opts.sounds` injection point**
  - Spec source: `.session/cp6-2-session.md`, TEA deviation "Specified an injection point"
  - Spec text: "the throw is tested behaviourally via `bakeSfx(staging, { sounds: rogueRecord })`"
  - Implementation: implemented as TEA specified; `opts.sounds ?? SOUNDS`.
  - Rationale: AC-3 states a behaviour and a behaviour needs a behavioural test. joust implements
    the same throw and never covers it.
  - Severity: minor
  - Forward impact: none — the option is test-only and defaults to the shipped manifest.

## Delivery Findings

- **Improvement** (non-blocking): `vendor/pokey.js` now has THREE byte-identical copies
  (tempest, star-wars, centipede) plus its LICENSE. CLAUDE.md's bar for extraction into
  `src/shared` is "once a second game proves the duplication is real", and a third has now
  arrived. Affects `plugins/{tempest,star-wars,centipede}/tools/pokey-bake/vendor/`
  (hoist to a shared location and re-point three bakers). Not done here: it would edit two
  already-shipping bakers for no test in this story.
  *Found by Dev during implementation.*
- **Gap** (non-blocking): the baker emits a `MODULE_TYPELESS_PACKAGE_JSON` warning on every
  run — node re-parses `audio-manifest.ts` as ESM because `plugins/centipede/package.json`
  has no `"type": "module"`. Harmless and the bake is correct, but it is noise on every
  `just deploy-assets` and node names the fix in the warning. Affects
  `plugins/centipede/package.json`. Not done here: the orchestrator suite asserts that file
  is a three-field stub (name/version/private), so adding a field is a topology change with
  its own test to update. *Found by Dev during implementation.*
- **Question** (non-blocking): AC-5's residual risk is tone quality, which no automated check
  in this repo can close — by the AC's own statement. Delivery, decode and scheduled playback
  are verified; perception is not. Affects nothing in code; it is a request for a human listen
  before the story is considered fully accepted. *Found by Dev during implementation.*

**Handoff:** To Obi-Wan Kenobi (Reviewer).
---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | not dispatched — domain covered by Reviewer | n/a | Session policy bars the Agent tool; suite/lint/orchestrator run directly (see below) |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — domain covered by the mutation battery (H3) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — domain covered by hand (H1's false comment) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | not dispatched — domain covered by Reviewer | n/a | Session policy bars the Agent tool; lang-review checklist walked by hand below |

**All received:** Yes (0 dispatched — 7 disabled via `workflow.reviewer_subagents`, 2 enabled but barred by session policy and covered directly; nothing is outstanding)
**Total findings:** 3 confirmed High, 1 Medium, 2 Low, 2 of my own leads REFUTED by measurement

`pf settings get workflow.reviewer_subagents` reports `preflight: true`, `rule_checker: true`, the
other seven `false`. With effectively no specialist coverage, **the mutation battery IS the review** —
and it is what produced the most important finding below.

---

### Round 1 Reviewer Assessment (REJECTED — superseded by round 2, which APPROVED)

**Verdict: REJECTED** — three High findings. The story ships genuinely working sound and AC-1 is
unambiguously met (14/14 live 200s, independently re-curled), but two of the ten "transcriptions"
are not faithful and the suite cannot tell. This is a ROM-fidelity project; a wrong tone that
serves a 200 is precisely the failure AC-5 was written to catch.

### [HIGH] H3 — the suite cannot detect a baker that ignores the ROM entirely

The finding that reframes the other two. Three mutations against `bake-sfx.mjs`, each run through
the full centipede project:

| mutation | result |
|---|---|
| emit a **constant pitch** (`0x80`) for every transcribed cue — FREQ tables ignored | **SURVIVED** 1118/0 |
| emit a **constant AUDC** (`0xa8`) — CONT tables ignored | **SURVIVED** 1118/0 |
| **reverse** every FREQ table — right bytes, wrong order | **SURVIVED** 1118/0 |

Baseline 1118 passed / 0 failed; all three mutants: 1118 passed / 0 failed. The baker was restored
byte-identical after each (verified by `git diff --stat`).

The suite proves the tables are **READ** correctly — `TABLES` deep-equals an independent parse of
`CENTI4.MAC`, and TEA mutation-proved that parser's radix and continuation handling. It proves the
**durations** match the fixture. It proves nothing about whether the bytes are **APPLIED**. AC-2's
central claim — "The samples are baked from the ROM's own FREQ and CONT tables" — has no assertion
behind it, and a baker that reads the ROM and discards it is green.

**Required:** an assertion that the rendered audio is a function of the table contents. The cheapest
honest form is a golden-ish property rather than a byte-exact fixture: bake a cue, bake it again with
a locally-perturbed table, and assert the samples DIFFER; plus assert that two cues sharing a table
(the four kills) are byte-identical while cues on different tables are not. The second half is free —
it already holds and is the emergent evidence noted under VERIFIED below.

### [HIGH] H1 — `fleaLoop`'s stand-in uses a fabricated ROM constant, and sweeps the wrong way

`bake-sfx.mjs` computes the flea sweep as `((antv ^ 0x55) >> 1 ^ 0xff) | 0x80`, over `antv` ascending
`0 → 0xF0`, under a comment claiming *"runs that formula across ANTV's range so the SHAPE is the
machine's"*. Both halves of that are wrong.

1. **`0x55` is invented.** `CKFE` is not a constant — it is a RAM byte, and the ROM's own declaration
   documents its values: `CENDE4.MAC:254` `CKFE: .BLKB 1 ;USED FOR COCKTAIL VERSION / =0 WHEN NOT
   USING COCKTAIL / =FE WHEN USING COCKTAIL`. The upright build this clone models has **CKFE = 0** —
   and cp6-1 had **already established exactly that** in
   `docs/rom-study/claims/07-player-shot.json`: *"CKFE=0 in the 1-player upright build
   (CENTI4.MAC:750)"*. One grep would have found it.
2. **The sweep runs backwards.** `plugins/centipede/src/core/flea.ts:137` states the sense:
   `v: number // ANTV pixel (0xF8 parked/top -> 4 bottom)` — ANTV **decreases** as the flea descends.
   The code sweeps it ascending.

Net effect, computed:

| | sequence | direction |
|---|---|---|
| shipped (`CKFE=0x55`, ANTV ascending) | `D5 DD C5 CD F5 FD E5 ED 95 9D 85 8D B5 BD A5 AD` | AUDF falls → **pitch RISES** |
| ROM (`CKFE=0`, ANTV `0xF8`→`4`) | `83 8B 93 9B A3 AB B3 BB C3 CB D3 DB E3 EB F3 FB` | AUDF rises → **pitch FALLS** |

All 16 steps differ, the shipped one is non-monotonic where the ROM's is a clean ramp, and the
**pitch moves in the opposite direction** — which is the one property cp6-1 wrote down in words:
*"The pitch therefore falls as the flea descends."*

Being a stand-in is not the defect; AC-2 permits stand-ins. The defect is the comment asserting the
shape is the machine's when it demonstrably is not — the "prose that reads authentic and is not"
class this epic exists to prevent. Fix the constant and the direction (then the comment becomes
true), or keep the sweep and delete the provenance claim. The former is ~2 lines and strictly better.

### [HIGH] H2 — `playerDeath` drops the ROM's explicit `;INCREASE VOLUME`

`CENTI4.MAC:2447-2449`, on the CHAN5 player-explosion path:
```
	LDA Y,CONT0-1
	BEQ 64$			;LEAVE A DELAY BETWEEN EXPLOSIONS
	CLC
	ADC I,02		;INCREASE VOLUME
64$:	STA AUDC0
```
The player explosion is FREQ0/CONT0 **with 2 added to every non-zero control byte** — volume nibbles
`1,2,3,4` become `3,4,5,6`. cp6-1 recorded this in the fixture note *with the citation*: *"The
general explosion made LOUDER, not a sound of its own … adds hex 02 to the control byte to INCREASE
VOLUME (:2449)."*

`romEvents()` applies `cont[i]` verbatim for every cue, so `playerDeath` is baked as the ordinary
kill explosion slowed 4× by its frame gate. The single thing that distinguishes the player's death
from a segment's is absent. Note the `BEQ` — the rule is `audc === 0 ? 0 : audc + 2`, not a blanket
add; the zero entries are the inter-explosion delay.

### [MEDIUM] M1 — per-file peak normalisation removes between-cue loudness, and H2's fix needs it gone

`render()` scales every cue to peak 0.85. **My first version of this finding was that it flattens the
ROM's relative volumes, and measurement REFUTED it**: every ROM-sourced cue's AUDC maxes at volume
nibble **4** (CONT0, CONT1, CONT3 and the three immediates `0x64`/`0xA4`/`0xA4` all peak at 4), so
normalising each to the same peak changes nothing between them, and a single scalar preserves each
CONT envelope intact. Recorded so the next reviewer does not re-derive it.

**It becomes live the moment H2 lands.** With the `+2`, `playerDeath` peaks at volume 6 against the
kills' 4 — a real, ROM-created loudness difference — and the normaliser would then scale it straight
back to 0.85, silently discarding the fix. **H2 and M1 must be resolved together**: normalise the
fleet by one shared factor, or not at all. Fixing H2 alone produces a correct AUDC stream and an
identical-sounding file, which is the worst outcome because it looks fixed.

### [LOW] L1 — an unsourced AUDC default in a transcription path

`const immediate = c.contImmediate !== null ? Number(c.contImmediate) : 0xa8`. Measured: **no cue can
reach it** — every ROM cue with a FREQ table and no CONT table (`fire`, `bonusLife`, `scorpionLoop`)
carries a `contImmediate`. So `0xa8` is dead today. It is still a fabricated constant sitting in the
one function whose entire claim is fidelity, and if a future cue arrives without either, it will
silently get a made-up control byte instead of failing. Throw instead.

### [LOW] L2 — `i % table.length` wraps silently and is never exercised

Measured: `lengthFrames === tableLengthBytes` for all ten transcribed cues, so the modulo never
fires. If they ever diverged, wrapping is an assumption about the ROM's behaviour that nobody has
checked — the SOUNDS routine walks a countdown, it does not obviously restart the table. Assert the
equality (or throw) rather than papering over it with arithmetic.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

Walked by hand; `rule_checker` is enabled but could not be dispatched.

| Rule | Instances checked | Verdict |
|---|---|---|
| #1 type-safety escapes | `audio-manifest.ts`, `audio.ts` — no `as any`, no `@ts-ignore`, no non-null assertions; `.mjs` files are untyped by design, matching tempest/star-wars/joust bakers | compliant |
| #2 generics/interfaces | `SOUNDS` uses `as const satisfies Record<string,string>` — preserves literal types rather than widening | compliant |
| #4 null/undefined | `opts.sounds ?? SOUNDS` — `??` not `||`, correct for a possibly-empty object; `c.contImmediate !== null` is an explicit null test, not truthiness (`0x00` would be falsy) | compliant, and deliberately so |
| #5 module/declaration — `.js` extension in relative ESM imports | `audio.ts` imports `./audio-manifest.js` ×3 | compliant |
| #5 re-export without local binding | **Caught during GREEN** — `export type … from` left `SoundName` unbound in four signatures; fixed at `audio.ts` with a comment explaining it | now compliant |
| #8 test quality — vacuous assertions | see H3: the assertions are not vacuous, but they are **incomplete** in a way no linter sees | **finding** |
| #9 build/config | `plugins/centipede/package.json` has no `"type":"module"` → `MODULE_TYPELESS_PACKAGE_JSON` on every bake (Dev filed it) | acknowledged, non-blocking |

### VERIFIED — with evidence, including two of my own leads I killed

- **[VERIFIED] The ROM parser is correct and mutation-proved.** `bake-sfx.mjs:74-90` handles the
  `.RADIX 16` rule (bare literal hex, trailing `.` decimal) and unlabelled continuation lines. TEA's
  battery caught both mutations (decimal-parse; stop-at-label). `FREQ4` is 17 bytes across
  `:2463-2464` and `FREQ6` 20 with no continuation — both asserted.
- **[VERIFIED] Manifest identity holds.** `audio-manifest.ts` has **zero** import lines (asserted);
  `audio.ts:34` re-exports the binding rather than copying, so `bake.SOUNDS === shell.SOUNDS ===
  manifest.SOUNDS` by `toBe`. This is the one thing that stops a second drifting manifest.
- **[VERIFIED] The recipe guard bites in both directions.** Five pair-mutations (mkdir dropped, bake
  line dropped, per game) all caught. `assets_bucket := "arcade"` pinned. The staged prefix and
  `DEFAULT_BASE_URL` are asserted equal.
- **[VERIFIED] AC-1 independently re-confirmed by me**, not taken from Dev's report: 14/14 `200`,
  `audio/wav`, byte counts equal to the local bake; star-wars and joust controls still `200` after
  the same run re-uploaded them.
- **[VERIFIED] The kill-cue collapse is emergent, not coded.** `segmentKill`/`spiderKill`/`fleaKill`/
  `scorpionKill` bake byte-identical (md5 `46231544`) with no special-casing, because all four resolve
  to CHAN0's single `;EXPLOSION SOUND` table exactly as cp6-1 ruled independently from the assembler.
  Agreement between an independent reading and a mechanical transcription is the strongest fidelity
  signal in this diff — and it is worth noting it is also the only one H3's gap does *not* undermine.
- **[REFUTED — my own lead] the `spec` ternary's inner guard is dead code.** It is reachable: a fixture
  cue with `freqTable: null` and no `STAND_INS` entry hits it. Convoluted, not dead. No finding.
- **[REFUTED — my own lead] normalisation flattens the ROM's relative volumes.** Killed by
  measurement (all ROM cues peak at volume 4). Survives only as M1's conditional form.

### Devil's Advocate

Let me argue this is broken in ways the findings above understate. The story's whole justification is
that centipede should sound like the 1981 machine, and what actually shipped is ten files whose
*lengths* are provably the ROM's and whose *contents* nothing checks. H3 proves the suite would not
notice a constant tone. So what is the real confidence that these files are right? It rests on one
emergent coincidence (four identical kill cues) and on my reading of thirty lines of a baker. That
is thinner than 1118 green tests make it look, and the green count is actively misleading — it is
the exact "a fully green suite proves only that the code compiles" trap the story's own description
warns about, reproduced inside the story meant to end it.

A confused reader is the likelier victim than a malicious one. The `fleaLoop` comment tells them the
sweep's shape is the machine's. It is not, and the next person to touch that code will trust the
sentence rather than re-derive the formula — that is precisely how `0x55` would become permanent. The
same reader now sees a README asserting the cabinet is audible and a dossier asserting fidelity, with
no mechanical link between the two.

What about a stressed environment? `TABLES` is computed at module scope, so importing the baker reads
`CENTI4.MAC` eagerly; a missing ROM throws at import rather than at bake, which is fine here (the file
is tracked — I checked) but means the module cannot be imported for any purpose without the vendored
tree. `bakeSfx` is declared `async` and awaits nothing; harmless, but it means a caller that forgets
`await` still gets a resolved promise and no error, and the CLI's `await` is doing nothing. Partial
writes are unguarded: if `writeWav` fails on cue 8 of 14, the staging dir holds 7 files and
`deploy-assets` uploads them — a *partial* prefix, which serves 200s for some cues and 404s for
others, and the shared engine swallows the difference. No test covers a mid-bake failure, and
`set -euo pipefail` in the recipe would abort before upload only if node exits non-zero, which it
would — so this one is defended by accident rather than by design. Worth a sentence, not a story.

Finally, the honest limit on AC-5: Dev verified delivery, decode and scheduling and said plainly that
they did not *hear* it. Given H1 and H2, that caveat is now load-bearing rather than procedural — two
of the fourteen cues are known-wrong, and a listen is what would have caught the flea's inverted
sweep in seconds.

### What is NOT wrong, and should not be re-litigated

AC-1, AC-3, AC-4 and AC-6 are met and well-guarded. The manifest split is the correct shape and
solves a real problem. Retiring the six "still silent" guards across three files was right, done in
the open with reasons attached, and is exactly what the mg1-9 rule prescribes. The upload was
authorised and its blast radius was measured before it ran.

**Required for approval:** H1, H2, H3. M1 must be resolved as part of H2. L1/L2 are the Dev's call.

**Handoff:** To Yoda (Dev) for rework.

---

## Dev Assessment (round 2)

**Implementation Complete:** Yes — all three Highs and the Medium closed, plus both Lows.
**Tests:** centipede **1123/1123**; full fleet **11577/11577**; lint 0; orchestrator 390/390.
**Landed on:** `main` — `8ef4759`, pushed.

### H1 — the fabricated constant, and the sweep that ran backwards

Both halves of the Reviewer's finding were correct and both are fixed.

`CKFE` is not a constant. `CENDE4.MAC:254` declares `CKFE: .BLKB 1` — a RAM byte for the cocktail
build — and documents its values in the adjacent comment lines (`=0 WHEN NOT USING COCKTAIL`).
cp6-1 had already recorded the upright reading in `claims/07-player-shot.json`. The shipped `0x55`
was invented by me. It is now a named, cited `CKFE_UPRIGHT = 0x00` feeding a `fleaAudf()` helper
that carries the ROM's instruction sequence in its doc comment.

The direction was equally wrong: `core/flea.ts:67,137` records `ANTV pixel (0xF8 parked/top -> 4
bottom)`, so the sweep must run **downward**. It now does, and the audible consequence is
measurable in the rendered file — `flea_move.wav`'s zero-crossing rate falls across its duration
(410 → 287), which is cp6-1's "the pitch falls as the flea descends" showing up in the audio rather
than only in prose.

### H2 + M1 — they were one fix, exactly as the review said

`CENTI4.MAC:2447-2449` adds `2` to every **non-zero** CONT0 byte on the CHAN5 path. The `BEQ` is
load-bearing: a zero control byte skips the add, because those entries are the deliberate gap
between explosions. Volume nibbles `1,2,3,4` are now `3,4,5,6`.

Fixing that alone would have been invisible. Per-file peak normalisation scaled every cue to 0.85
independently, so the `+2` would have been divided straight back out — a correct AUDC stream and a
byte-different, identical-*sounding* wav. `render()` no longer normalises; `bakeSfx()` renders the
whole fleet, takes one shared factor from the loudest cue, and scales everything by it. Every ROM
loudness ratio survives.

Measured after the change: **player_death peak 0.850 vs segment_kill 0.534 — 1.59×**, and the fleet
now has **10 distinct peaks** where it previously had 1.

**A follow-on the review did not ask for, but the change forced.** With per-file normalisation gone,
the four *invented* stand-ins — carrying AUDC volume 6 and 8 — became the loudest things in the
cabinet, louder than any transcribed cue. Capped to nibble 4, the ROM's own ceiling for ordinary
cues. A declared stand-in should be audible, not dominant.

### H3 — and the hole in my own fix

Added `opts.tables` plus the differential test the review specified: perturb `FREQ2`, perturb
`CONT0`, require the rendered audio to move. Plus the free half — cues sharing `FREQ0/CONT0` must be
byte-identical, cues on different tables must not be.

**Then I re-ran the Reviewer's battery against the new tests, and R3 still survived.** A
differential test cannot see a transformation applied uniformly to *both* sides: reversing the
tables inside the baker also reverses the perturbed table the test hands in, and the two cancel. The
test could only ever catch a change it was the sole cause of.

Fixed with **absolute**, order-sensitive properties of the rendered audio, which nothing can cancel:
`shot_fire`'s pitch must RISE (FREQ2 descends `F0→50`, and a lower AUDF divides less) and
`flea_move`'s must FALL. Zero-crossing rate per half is a cheap, robust proxy on a POKEY square.

### Mutation battery — 8 applied, 7 caught, 1 equivalent

| # | mutation | result |
|---|---|---|
| R1 | constant pitch — FREQ tables ignored | caught |
| R2 | constant AUDC — CONT tables ignored | caught (2 tests) |
| R3 | **reverse every FREQ table** | caught — *survived until the absolute assertions landed* |
| R4 | drop the `+2 ;INCREASE VOLUME` | caught |
| R5 | per-file normalisation returns | caught |
| R6 | reintroduce a fabricated `CKFE` | caught |
| R7 | sweep the flea upward again | caught (2 tests) |
| R8 | drop the `lengthFrames == tableLengthBytes` guard | **SURVIVED — equivalent** |

**R8 is an equivalent mutant and I am not writing a test for it.** The guard cannot fire on today's
data — all ten transcribed cues have `lengthFrames === tableLengthBytes`, checked — so removing it
changes nothing observable through the public surface. Catching it would need a fixture-injection
point existing solely to exercise a defensive throw. Recorded rather than covered, per the standing
rule that an unobservable internal wants an honest note, not a manufactured assertion.

### L1 / L2 — both closed

The invented `0xa8` AUDC default is gone; a cue with neither a CONT table nor a `contImmediate` now
throws rather than receiving a made-up control byte. A `lengthFrames`/`tableLengthBytes` mismatch
throws instead of silently wrapping with `%`, because the ROM's behaviour past the table end is
unestablished and `%` was an assumption nobody had checked.

### AC-1 re-verified — the round-1 samples were live and wrong

This matters: the corrected bake changes sample VALUES but not lengths, so a status-and-size check
would have passed against the stale files. Re-deployed and verified by **content**:

| file | host md5 | round-2 local | round-1 local |
|---|---|---|---|
| player_death.wav | `4df271bf` | `4df271bf` ✓ | `f2cfc681` |
| segment_kill.wav | `ca00a0a0` | `ca00a0a0` ✓ | `46231544` |
| flea_move.wav | `1a46c114` | `1a46c114` ✓ | `97d1bd46` |
| shot_fire.wav | `c50b7c67` | `c50b7c67` ✓ | `885d470b` |

**14/14 return 200**, every content-length matching the round-2 bake; star-wars and joust controls
still 200.

### AC-5 re-played, and the fix is visible in the live buffers

Re-played against the live host on port 5290 (a-1's server on 5270 untouched). All fourteen fetched
**200**, zero audio 404s in console. Decoded-buffer peaks now carry the ROM's loudness ordering:

| cue | peak in the browser |
|---|---|
| playerDeath | **0.773** |
| spiderLoop | 0.576 |
| march | 0.484 |

That ordering is H2 and M1 landing where a player would actually meet them. **The honest caveat from
round 1 stands unchanged: I still have not *heard* it**, and with two cues having been demonstrably
wrong last round, a human listen is worth more here than any number above.

## Design Deviations

### Dev (implementation)

- **Capped the stand-ins' volume, which no AC or finding asked for**
  - Spec source: Reviewer round 1, M1; context-story-cp6-2.md AC-2
  - Spec text: "normalise the fleet by one shared factor, or not at all"
  - Implementation: also lowered `mushroom`/`headBottom`/`waveClear` AUDC from `0xa6`/`0xa8` to
    `0xa4`.
  - Rationale: removing per-file normalisation made the invented cues the loudest in the cabinet,
    since their hand-picked volume nibbles (6, 8) exceeded every ROM cue's ceiling of 4. That is a
    fidelity regression created by the fix, so it belongs to the fix.
  - Severity: minor
  - Forward impact: none — stand-in levels are ours to choose; the choice is now pinned to the ROM's
    own ceiling and commented.

- **R8 left uncovered as an equivalent mutant**
  - Spec source: Reviewer round 1, L2
  - Spec text: "Assert the equality (or throw) rather than papering over it with arithmetic"
  - Implementation: the throw is implemented; no test exercises it.
  - Rationale: unreachable on current fixture data, so no assertion can observe its removal without
    a fixture-injection point built only for that purpose.
  - Severity: minor
  - Forward impact: none today. If a future cue's `lengthFrames` ever diverges from
    `tableLengthBytes`, the throw fires and the bake stops — which is the intent.

## Delivery Findings

- **Improvement** (non-blocking): a differential test cannot detect a transformation applied
  uniformly to both the baseline and the perturbed input — the two cancel. This bit the H3 fix and
  was caught only by re-running the reviewer's battery against the new test. Any "perturb the input,
  assert the output moves" guard in this repo has the same blind spot and should be paired with at
  least one ABSOLUTE property of the output. Affects `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs`
  (now paired) and is worth knowing wherever else the pattern appears.
  *Found by Dev during rework.*
- **Question** (non-blocking): the round-1 samples were live on the public host for roughly 40
  minutes and were wrong in two cues. Nothing in the deploy path can express "this upload supersedes
  a bad one" — `deploy-assets` is fire-and-forget and CI never touches the bucket. Affects
  `justfile` / `scripts/deploy-r2.mjs`; no action proposed, but a reviewer may want to weigh whether
  an asset story should deploy before or after review. *Found by Dev during rework.*

**Handoff:** To Obi-Wan Kenobi (Reviewer) for round 2.

---

## Subagent Results — round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | not dispatched — domain covered by Reviewer | n/a | Session policy bars the Agent tool; suite/lint/orchestrator/curl run directly |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — covered by a 6-mutation battery on the round-2 surface |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — comments re-read against their citations by hand |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | not dispatched — domain covered by Reviewer | n/a | lang-review checklist walked by hand |

**All received:** Yes (0 dispatched — 7 disabled via settings, 2 barred by session policy and covered directly; nothing outstanding)
**Total findings:** 0 High, 1 Medium (tracking), 2 Low (coverage), 1 equivalent mutant, 3 round-1 Highs verified closed

---

## Reviewer Assessment

_Round 2. Round 1's rejection is preserved above, demoted and marked superseded._

**Verdict: APPROVED.** All three round-1 Highs are closed and I verified each one myself rather than
from the report. What remains is two coverage gaps on **correct** code, one equivalent mutant, and
one tracking obligation that belongs to the finish phase — none of which justifies a third round.

### The round-1 Highs, verified independently

| finding | how I checked it | result |
|---|---|---|
| **H1** fabricated `CKFE`, inverted sweep | imported the shipped module and compared `STAND_IN_SPECS.fleaLoop.sweep` against the ROM formula computed here | **byte-identical** to `f(ANTV, CKFE=0)` for ANTV `0xF8→8`; monotonically rising AUDF (so the pitch falls); no trace of the `0x55` sequence |
| **H2** missing `+2 ;INCREASE VOLUME` | read `TABLES.CONT0` from the module and derived what `:2449` requires | present, and the **four zero bytes stay zero** — the `BEQ 64$` delay is respected, which is the half most likely to be got wrong |
| **H3** suite blind to the transform | re-ran my three original mutations myself | `constant pitch` **caught**, `constant AUDC` **caught (2 tests)**, `reverse every FREQ table` **caught** |

`CHAN5` is unique to `playerDeath` in the fixture, so keying the boost on the channel is correct
rather than incidentally right. The `CHANNELS` map is untouched, as the scope fence required.

**AC-1 re-verified by me, not taken from the report: 14/14 live 200.** This mattered more than usual
this round — the corrected bake changes sample VALUES but not lengths, so a status-and-size check
would have passed against the stale round-1 files. Dev caught that and verified by content hash;
I re-curled independently.

### Dev found a hole in their own fix, which is the round's best moment

The differential test I specified in round 1 was insufficient, and **Dev discovered that by re-running
my battery against their own new test** rather than declaring the finding closed. A differential
assertion cannot see a transformation applied uniformly to both sides — reversing the tables inside
the baker also reverses the perturbed table the test supplies, and the two cancel. My specified fix
was wrong, and it was caught by the person implementing it. The replacement (absolute, order-sensitive
properties of the rendered audio: the shot must rise, the flea must fall) is strictly better than what
I asked for, and it is also what makes H1 verifiable in the audio rather than only in an array.

### [MEDIUM] cp6-1's F1 was filed BLOCKING FOR cp6-2 and has still not been dispositioned

At setup I recorded that cp6-1's voice-0 finding — `BEQ 52$ ;IF NO PLAYER EXPLOSION` (`:2437`) means
playerDeath **preempts all four kill cues** on the machine, while our `CHANNELS` map splits them into
`'impact'` and `'alert'` so the clone rings both — never reached this story's description. It still
has not been actioned, deferred in writing, or filed anywhere: grepping every epic YAML for the
finding's own vocabulary returns only my round-1 `review_findings` text.

**This is not cp6-2's to FIX** — the context's scope fence explicitly forbids editing `CHANNELS`,
inherited from cp6-1's own AC-5, and none of the six ACs mention voice arbitration. But a descope
must end with a filed story or a named owner, and neither exists. This is the second consecutive
story in this epic where a "filed BLOCKING FOR X" line was executed by nobody.

**Routed to SM as a finish-phase obligation**, due BEFORE `pf sprint story finish` archives the
session that explains it: file a story carrying the mechanism (`:2437`, `:2374`, `:2416 BNE 50$
;ALWAYS` blocking fall-through), the measured divergence, and the fixture's `voiceArbitration` record
as its input.

### [LOW] Two coverage gaps on code that is correct — routed as a chore, not a round

My round-2 battery ran six fresh mutations against surface that did not exist in round 1. Three were
caught (`+2` applied to every cue; fleet factor taken from the quietest cue; flea sweep collapsed to
one step). Three survived:

- **N2 — applying the `+2` to the ZERO bytes as well.** The code is right: `raw !== 0 ? raw + 2 : raw`,
  with a comment calling the `BEQ` load-bearing. Nothing asserts it. The mutant turns the four
  inter-explosion delay bytes into `AUDC 0x02` — audible noise where the ROM is deliberately silent.
  **Chore:** assert the baked CHAN5 event stream contains exactly four `AUDC 0` writes, and that every
  non-zero control byte is exactly its `CONT0` counterpart plus 2.
- **N4 — raising a stand-in's volume back above the ROM's ceiling.** Dev's own deviation (capping all
  stand-ins to volume nibble 4 once per-file normalisation was removed, so the invented cues stopped
  being the loudest in the cabinet) has no guard. **Chore:** assert every `STAND_IN_SPECS` entry's
  `audc & 0x0f` is ≤ 4.

Both are one assertion each against existing exports, neither requires new production code, and the
behaviour they describe is already correct. Per the established exit for this shape, they go to SM as
a chore with the specifications above. **If the chore does not land, both must be re-raised rather
than quietly dropped.**

### [EQUIVALENT MUTANT — no test wanted] two unreachable guards

`R8` (drop the `lengthFrames === tableLengthBytes` guard) and `N5` (drop the `contImmediate` throw)
both survive, and both should. Measured: every transcribed cue has `lengthFrames ===
tableLengthBytes`, and every cue with a FREQ table but no CONT table carries a `contImmediate`. Neither
guard can fire on today's fixture, so removing it is unobservable through the public surface.
Catching them would require a fixture-injection point built solely to exercise a defensive throw —
which is a test of the injection point, not of the baker. Dev classified R8 this way independently
and I agree; recording N5 alongside it so the next reviewer does not re-derive either.

### Rule-checker findings — `[RULE]`

`rule_checker` is one of the two specialists ENABLED on this project. It could not be dispatched
(session policy bars the Agent tool), so I walked the lang-review checklist by hand and record its
findings under its own tag rather than burying them in the compliance table below.

- **`[RULE]` #8 test quality — correct behaviour with no assertion behind it (LOW).** Rule #8 covers
  vacuous and missing coverage. `romEvents()` implements the ROM's `BEQ 64$` exemption correctly —
  `raw !== 0 ? raw + 0x02 : raw` — and nothing observes it. Mutation N2 (boost the zero bytes too)
  survives, turning four deliberate silences into `AUDC 0x02`. Routed as a chore with an exact spec;
  the code is right, only the guard is missing.
- **`[RULE]` #8 test quality — an implementer's own constraint, unguarded (LOW).** The stand-in
  volume ceiling (every `STAND_IN_SPECS` entry's `audc & 0x0f` ≤ 4, adopted so the invented cues
  stopped being the loudest in the cabinet once per-file normalisation was removed) has no test.
  Mutation N4 survives. Same chore.
- **`[RULE]` #4 null/undefined — VERIFIED, and load-bearing.** `c.contImmediate === null` is an
  explicit null comparison rather than a truthiness test, which rule #4 requires precisely because
  `0x00` is a legal AUDC value that `||` would have swallowed. Likewise `opts.tables ?? TABLES` and
  `opts.sounds ?? SOUNDS`.
- **`[RULE]` #1 / #5 — VERIFIED clean.** The round-2 diff introduces no `as any`, `@ts-ignore`,
  non-null assertion, or extensionless relative import; `STAND_IN_SPECS` is a plain named export.
- **`[RULE]` #9 build/config — acknowledged, non-blocking.** `plugins/centipede/package.json` lacks
  `"type": "module"`, so every bake prints `MODULE_TYPELESS_PACKAGE_JSON`. Filed by Dev as a Delivery
  Finding; not fixed here because the orchestrator suite pins that file to a three-field stub.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

| Rule | Checked | Verdict |
|---|---|---|
| #1 type-safety escapes | round-2 diff adds no `as any`/`@ts-ignore`/non-null assertion | compliant |
| #4 null/undefined | `opts.tables ?? TABLES`, `opts.sounds ?? SOUNDS` — `??` not `||`; `c.contImmediate === null` is an explicit null test (`0x00` is a legal falsy control byte) | compliant, and load-bearing |
| #5 module/declaration | `STAND_IN_SPECS` newly exported for the test; no new relative imports | compliant |
| #8 test quality — vacuous assertions | the flea test's cocktail-CKFE `not.toEqual` is **not** vacuous (sequences differ, and the monotonic check independently rejects the cocktail value); thresholds are ratio-based (`>kill*1.15`, `>a*1.05`, `<a*0.95`) rather than absolute, so they survive a sample-rate change | compliant |
| #8 test quality — coverage | see N2/N4 | **two gaps, routed** |
| #9 build/config | `MODULE_TYPELESS_PACKAGE_JSON` warning persists on every bake; Dev filed it | acknowledged, non-blocking |

### VERIFIED

- **[VERIFIED] The `+2` keys on a channel that is unique.** `CHAN5` appears once across all fourteen
  fixture cues (`playerDeath`), so `c.channel === 'CHAN5'` cannot catch a second cue by accident —
  and mutation N1 (apply to every cue) is caught.
- **[VERIFIED] Scope held.** `CHANNELS` is byte-unchanged; the only `CHAN` token in the round-2 diff
  is a comment that moved into `audio-manifest.ts` with its citation upgraded from the bare-colon
  form `:1994-1995` to `CENTI4.MAC:1994-1995` — an improvement, since bare-colon refs are invisible
  to every gate in this repo.
- **[VERIFIED] The fleet normaliser preserves ratios rather than removing them.** `player_death`
  peak `0.850` against `segment_kill` `0.534` (1.59×), 10 distinct peaks across 14 files where there
  was 1; mutation N3 (take the factor from the quietest cue) is caught.
- **[VERIFIED] The stale round-1 samples were superseded on the host**, by content and not by size —
  four cues' host md5s match the round-2 bake and differ from round 1.

### Devil's Advocate

The strongest case against approving is that I am accepting a story whose two most important cues
were demonstrably wrong eight hours ago, on the strength of the same kind of evidence that failed to
catch them the first time. That is a fair charge and it is worth being precise about why the
situation is different. In round 1 the suite could not distinguish a faithful bake from one that
ignored the ROM entirely — three mutations proved it. It now catches all three, plus the `+2`, plus
the normaliser, plus both halves of the flea defect. The evidence class changed, not just the count.

Where I remain genuinely uncomfortable: **nobody has heard this.** Dev has said so plainly both
rounds, which is the correct behaviour, but it means the residual risk is exactly the one AC-5 was
written to name — a decodable wav of the wrong tone. My checks are all structural. The flea's pitch
now falls, which I verified in the waveform, but "falls" is a direction, not a timbre; the POKEY
distortion nibble could be wrong in a way no zero-crossing count would reveal. The three declared
stand-ins are invented sounds whose only constraints are "audible" and "volume ≤ 4" — they could be
unpleasant and every test would pass. **This is why the finish must not treat AC-5 as discharged by
the automated evidence.**

A second worry: the whole fidelity argument rests on cp6-1's fixture being right, and this story
consumes it as ground truth. Round 1 found that cp6-1's own `claims/07-player-shot.json` already held
the `CKFE=0` fact that the baker got wrong — so the dossier was ahead of the implementation there,
which is reassuring. But the fixture's `lengthFrames`, `frameGate` and `pokeyVoice` values are taken
entirely on trust by the bake, and nothing in *this* story cross-checks them against the ROM. If
cp6-1 mis-derived a frame gate, every duration assertion here would faithfully reproduce the error
and report green. That is cp6-1's scope and it was reviewed there, but the coupling is worth stating.

Finally, the operational hazard Dev raised is real and I would not want it lost: the deploy path has
no notion of superseding a bad upload, and wrong samples were public for roughly forty minutes. That
is not a defect in this diff — it is a property of `deploy-assets` being fire-and-forget — but this
epic's whole thesis is that a green suite proves nothing about what is served, and the corollary is
that what is served can be wrong for as long as nobody re-curls.

### What was fixed since round 1, in one line

Three Highs closed, one Medium closed, both Lows closed, one hole in my own specified fix found and
closed by Dev, and the sample set on the public host replaced with the corrected bake.

**Handoff:** To Grand Admiral Thrawn (SM) for the finish ceremony, carrying two chore items (N2, N4)
and one filing obligation (cp6-1's F1) that must be discharged BEFORE `pf sprint story finish`.
---

## Impact Summary

*Hand-written by SM at finish. `sm-finish` preflight was not spawned (session policy bars the Agent
tool), so every claim below was measured directly rather than scraped.*

**cp6-2 shipped centipede's sound.** Fourteen `.wav` files are live on
`arcade-assets.slabgorb.com/centipede/sfx/`, ten of them transcribed from the cabinet's own POKEY
tables at `CENTI4.MAC:2455-2465` and four declared stand-ins. The epic's premise — measured at
setup as fourteen 404s against two 200 controls on the same host — is closed.

### Final state, measured at finish

| check | result |
|---|---|
| centipede project | **1125/1125** |
| full fleet | **11579/11579** (752 files, 1 todo) |
| `npm run lint` | exit 0 |
| `npm run test:orchestrator` | exit 0 (390/390) |
| AC-1 live URLs | **14/14 → 200**, `audio/wav`, re-curled by the Reviewer independently |
| attribution | nothing red anywhere; no sibling failures to attribute this run |

### Rounds, and what each one actually changed

**Round 1 — REJECTED, three High.** All three were real and none was cosmetic:

- The suite could not distinguish a faithful bake from one that ignored the ROM entirely. Three
  mutations (constant pitch, constant AUDC, reversed FREQ tables) survived at 1118/0.
- `fleaLoop`'s stand-in used a **fabricated** `CKFE = 0x55`. `CKFE` is a RAM byte the ROM documents
  as `=0 WHEN NOT USING COCKTAIL` (`CENDE4.MAC:254`), and cp6-1 had **already recorded** the upright
  value in `claims/07-player-shot.json`. It also swept ANTV backwards, so the pitch rose where the
  machine's falls — under a comment claiming the shape was the machine's.
- `playerDeath` dropped the ROM's `ADC I,02 ;INCREASE VOLUME` (`:2449`), which cp6-1 had recorded
  *with* the citation.

**Round 2 — APPROVED.** All three closed and each verified by the Reviewer through **re-derivation**
rather than by reading the diff: the shipped sweep was compared byte-for-byte against the ROM formula
recomputed at review time, the `+2` was checked to preserve all four `BEQ` delay bytes, and the
three original mutations were re-run independently. AC-1 was re-curled, and — because the corrected
bake changes sample values but **not lengths** — the host was verified by **md5**, not by size.

**Finish chore — applied and mutation-proved here.** Two LOW `[RULE] #8` coverage gaps on code that
was already correct. Both were confirmed to survive *before* writing the tests and to be caught
*after*, with a control mutation to prove the battery still worked (`86d57ee`). Closing N2 needed a
seam: `audcStreamFor(cue)` exposes the emitted AUDC bytes, because the `BEQ` rule is otherwise only
visible as a peak difference that cannot distinguish "the delay bytes stayed zero" from "they were
boosted a little".

### The moment worth keeping

The Reviewer's round-1 remedy was itself insufficient, and **Dev found that by re-running the
Reviewer's battery against their own fix**. A differential test ("perturb the input, assert the
output moves") cannot see a transformation applied uniformly to both sides — reversing the tables
inside the baker also reverses the perturbed copy the test supplies, and they cancel. The
replacement uses absolute, order-sensitive properties of the rendered audio (the shot must rise
because FREQ2 descends; the flea must fall because its sweep descends), which no uniform
transformation can cancel — and which is what made the flea fix verifiable in the **audio** rather
than only in an array.

### Routed forward — filed, not left as prose

- **`cp6-3` FILED (3pt, p2, bug, tdd, repos arcade)** — "POKEY voice 0 is contended and our CHANNELS
  map does not model it". This is cp6-1's F1, which its Reviewer marked **BLOCKING FOR cp6-2** and
  which then reached nobody: cp6-1's finish commit touched only `status` and `completed`, and cp6-2
  could not have fixed it regardless, because its scope fence forbids editing `CHANNELS`. Both
  stories correctly declined it; it simply had no owner. The filed description carries the full
  mechanism (`:2437`, `:2374`, `:2416`, plus the `:1813-1818` channel-zeroing), the measured
  divergence, the `voiceArbitration` fixture record as its input, the reason it is not a baker
  change, and the guard it will have to retire. **Nothing about the shipped code is wrong.**
- **Two Delivery Findings from Dev remain open and unowned by design**: the
  `MODULE_TYPELESS_PACKAGE_JSON` warning (blocked by the orchestrator suite pinning
  `plugins/centipede/package.json` to a three-field stub) and the third byte-identical copy of
  `vendor/pokey.js`, which now clears CLAUDE.md's bar for extraction into `src/shared`. Neither is
  this story's to fix; both are recorded here rather than filed, because each would edit two
  already-shipping bakers.

### The one thing that is NOT closed by any evidence in this repo

**Nobody has heard it.** Both rounds said so plainly. Delivery, decode, scheduling and the ROM's
loudness ordering are all verified — playerDeath's decoded buffer peaks at 0.773 against
spiderLoop 0.576 and march 0.484, which is `:2449` landing where a player meets it — but every check
is structural. AC-5 exists precisely because "a decodable wav of the wrong tone passes every
mechanical check in this repo", and round 1 proved that is not hypothetical: two cues were
demonstrably wrong while the suite was green. **A human listen is the remaining acceptance step**,
and it is worth more than any number above.

### Two equivalent mutants, deliberately uncovered

`lengthFrames !== tableLengthBytes` and the missing-`contImmediate` throw are both defensive guards
that cannot fire on the current fixture — measured, not assumed. Catching their removal would need a
fixture-injection point existing solely to exercise a throw, which tests the injection point rather
than the baker. Recorded so the next reader does not re-derive them.

---

## AC-5 discharged — 2026-08-03, after archival

The Impact Summary above ends by stating that nobody had heard the samples, and that a human listen
was the remaining acceptance step. **It has now been done: the user played it and reported it sounds
fine.**

Recorded here rather than left to be inferred, because the summary immediately above says the
opposite and an archived record that understates what was verified misleads exactly as much as one
that overstates it. AC-5 read "The game has been played with sound on and the result reported in
prose, because a decodable wav of the wrong tone passes every automated check in this repo" — that
was the one criterion no evidence in this repo could close, round 1 proved the concern was real
(two cues were demonstrably wrong while the suite was green), and it is now closed by the only
instrument that could close it.

All six acceptance criteria are met.
