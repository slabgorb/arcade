---
story_id: "cp6-1"
jira_key: "cp6-1"
epic: "cp6"
workflow: "tdd"
---
# Story cp6-1: The POKEY dossier and the fourteen-cues-over-six-tables ruling — what centipede's ROM actually sounds like

## Story Details
- **ID:** cp6-1
- **Jira Key:** cp6-1
- **Workflow:** tdd
- **Branch:** none
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-02T23:15:59Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-02T18:42:18Z | 2026-08-02T18:47:20Z | 5m 2s |
| red | 2026-08-02T18:47:20Z | 2026-08-02T19:32:50Z | 45m 30s |
| green | 2026-08-02T19:32:50Z | 2026-08-02T19:46:33Z | 13m 43s |
| review | 2026-08-02T19:46:33Z | 2026-08-02T20:07:57Z | 21m 24s |
| red | 2026-08-02T20:07:57Z | 2026-08-02T21:27:53Z | 1h 19m |
| green | 2026-08-02T21:27:53Z | 2026-08-02T21:58:54Z | 31m 1s |
| review | 2026-08-02T21:58:54Z | 2026-08-02T22:08:03Z | 9m 9s |
| finish | 2026-08-02T22:08:03Z | 2026-08-02T22:08:34Z | 31s |
| green | 2026-08-02T22:08:34Z | 2026-08-02T22:21:23Z | 12m 49s |
| review | 2026-08-02T22:21:23Z | 2026-08-02T23:15:59Z | 54m 36s |
| finish | 2026-08-02T23:15:59Z | - | - |

## Acceptance Criteria

1. All fourteen SOUNDS entries are accounted for individually — each names the ROM table and channel it transcribes, or is recorded explicitly as an invention with no source, and no cue is silently presented as authentic.
2. Every transcribed constant carries a radix-cited comment and a claims entry the live citation gate re-opens against the vendored CENTI4.MAC, so a wrong line number fails rather than reads plausibly.
3. Per-cue length and loop-versus-one-shot are derived from the ROM's own countdown window and table comments, not chosen by ear, and the derivation is written down so cp6-2 consumes a number rather than a judgement.
4. The non-uniform frame gating is recorded per cue (the spider's every-other-frame LSR, the bonus AND 07, the player explosion AND 03) rather than flattened into one cadence.
5. The manifest and the CHANNELS map are UNCHANGED by this story — it rules, it does not edit — and any cue the ruling finds unsourced is handed to cp6-2 as a named decision rather than quietly deleted.
6. centipede is still silent when this story closes, and the story says so plainly rather than implying progress toward sound.
7. The sound dossier is ENROLLED in the coverage sweep, not merely written beside it: centipede's hardcoded brief.md+glossary.md pair (tests/audit/citations.test.ts:441-442, :458-461) is generalised to a DOSSIER_FILES list in joust's shape (plugins/joust/tests/audit/citations.test.ts:603) with this story's doc in it, and the enrollment is mutation-proved — deleting a citation's claim must redden the sweep, or the doc is unwatched prose that reads gated. Pre-existing unswept docs (subsystems.md, pictures.md, open-questions.md) are FILED as a follow-up, not fixed here.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): centipede's coverage sweep still does not scan
  `subsystems.md`, `pictures.md` or `open-questions.md` — cp6-1's scope fence
  says FILE, not FIX, so this is the follow-up AC-7 promised. Affects
  `plugins/centipede/tests/audit/dossier-sweep.ts` (add the three to
  `DOSSIER_FILES`); note the real cost is not the list edit but converting
  whatever prose citations those three carry into claims, since enrolling them
  turns every uncovered citation red at once. *Found by TEA during test design.*
- **Gap** (non-blocking): joust — the precedent this story follows — has no
  mutation proof of its own enrollment. Its `DOSSIER_FILES` at
  `plugins/joust/tests/audit/citations.test.ts:603` is an inline const inside
  the gate, so a file could be dropped from that list and nothing would notice;
  the list would simply sweep less. cp6-1's `dossier-sweep.ts` + mutation test
  is the shape that closes it, and porting it to joust is a small story.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the `AND I,04` at `CENTI4.MAC:2368` sits
  inside the out-of-scope 15-second alarm and is the ONLY other FRAME mask in
  the SOUNDS span. It is correctly fenced out by the epic, but it means a
  future reader grepping for frame gates in `:2322-2465` finds four masks and
  three in-scope ones. Worth a sentence in `sound.md` so the fourth is
  explicitly declined rather than silently omitted. Affects
  `plugins/centipede/docs/rom-study/sound.md` (GREEN's doc).
  *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): POKEY voice 1 is CONTENDED on the real machine — the
  march, the computed flea voice and the scorpion loop all write `AUDF1` and
  converge on one `AUDC1` write (`CENTI4.MAC:2435`), so a live flea or scorpion
  SILENCES the marching tick (`CENTI4.MAC:2396-2406`). Our `CHANNELS` map gives
  all four sustained cues their own channel so they ring together, which makes
  the clone sound fuller than the cabinet. AC-5 forbade changing it here.
  Affects `plugins/centipede/src/shell/audio.ts` (the CHANNELS map) and
  `plugins/centipede/src/shell/audio-dispatch.ts` (would need voice-priority
  arbitration). This is a gameplay-audio fidelity story of its own, not a
  baker's job. *Found by Dev during implementation.*
- **Gap** (non-blocking): the ROM raises a sound our manifest has no cue for —
  `RESTOR` (`CENTI4.MAC:1826`) seeds the explosion once per restored mushroom
  between waves (`CENTI4.MAC:1881-1882`). It is the mirror image of an unsourced
  cue: a real ROM sound with nowhere to go. Affects
  `plugins/centipede/src/shell/audio.ts` (a new cue) plus a core event for the
  restore sweep. *Found by Dev during implementation.*
- **Conflict** (non-blocking): two comments in `src/shell/audio.ts` are now
  measurably wrong. `fleaKill` is annotated "slot 12 killed, second hit (:2169)"
  but `CENTI4.MAC:2169` is `JMP 20$` in the shot-hits-MUSHROOM path, and the
  flea kill actually converges on `19$` at `:2299-2300` with every other kill.
  `mushroom` is annotated "(OBSTAC)", but OBSTAC (`CENTI4.MAC:1701-1739`) is a
  pure address lookup that raises no sound at all. Affects
  `plugins/centipede/src/shell/audio.ts:47` (mushroom) and `:50` (fleaKill) —
  anchors corrected in GREEN round 2 per the Reviewer's [LOW] finding; `:48` and
  `:52` are `segmentKill` and `headBottom`. Note also that both comments spell
  their references bare-colon (`(:2169)`, `(:1994-1995)`), a form no gate in this
  repo can see. AC-5 forbade editing the manifest in this story, so both are left
  for cp6-2 to correct alongside its bake. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): the fixture records a `pokeyVoice` for every cue but nothing
  ever compares it to the ROM. Affects
  `plugins/centipede/tests/audit/sound-dossier.test.ts:481-482` (add a cross-check
  from each cue's cited lines to the `STA AUDF<n>`/`STA AUDC<n>` it performs).
  This is the guard whose absence let the voice-1 contention ruling ship wrong —
  the fixture marks FOUR cues as `pokeyVoice: 1` while its own `voiceArbitration`
  note names three, and no test can see the contradiction.
  *Found by Reviewer during code review.*
- **Conflict** (blocking): the voice-1 arbitration ruling is factually wrong in the
  three places it is written. SOUNDS holds four `STA AUDF1` — `CENTI4.MAC:2382`
  (bonus), `:2392` (scorpion), `:2414` (flea), `:2433` (march) — all converging on
  the single `STA AUDC1` at `:2435`, and `bonusLife` is tested FIRST at
  `:2373-2374`, so a live bonus tone bypasses the whole arbitration at `48$`
  (`:2396`). Affects `plugins/centipede/docs/rom-study/sound.md:133-149`,
  `sound.fixture.json:4-13` and `claims/16-sound.json` SND-088. Note SND-039
  (`:2414`) already states it correctly — the file contradicts itself.
  *Found by Reviewer during code review.*
- **Gap** (blocking): `CENTI4.MAC:2415` (`LDA I,0A4`, the flea path's control byte)
  is cited nowhere in the doc, the fixture or the 93 claims, yet
  `fleaLoop.contImmediate` records its value. Affects
  `plugins/centipede/docs/rom-study/sound.fixture.json:286` (add `contCite`),
  `claims/16-sound.json` (add the claim) and
  `tests/audit/sound-dossier.test.ts:737` (the sweep iterates `tableCues()`, which
  excludes every computed cue by construction).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): the claims gate cannot detect a claim pinned to the
  wrong-but-real ROM line, because each `verbatim` was copied from whatever line
  was cited. The `must` regex that was meant to prevent this exists only in an
  unshipped generator. Affects `plugins/centipede/tools/audit/check-citations.mjs`
  (no `must` field in its schema) — either commit the generator as a tool the
  suite invokes, or require each claim's cited line to contain a token drawn from
  the claim's own prose. *Found by Reviewer during code review.*
- **Gap** (non-blocking): the coverage sweep's citation floor is aggregate, so an
  enrolled doc can silently drop to zero citations while the total still clears
  the bar. Affects `plugins/centipede/tests/audit/citations.test.ts:423` (loop a
  per-file floor over `DOSSIER_FILES`, as `sound-dossier.test.ts:945` already does
  for sound.md alone). Related: a malformed linespec such as `2463-24-64` is
  silently dropped by `dossier-sweep.ts:82-86`, which has no else branch.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): this diff's own header comment says the vendored
  ROM is "Absent on CI", which is false — `reference/atari-source/` is tracked in
  git and `.github/workflows/deploy.yml:74` checks out with `fetch-depth: 0`, so
  the byte-reopening blocks DO run in CI. Affects
  `plugins/centipede/tests/audit/sound-dossier.test.ts:77`. Worth correcting
  fleet-wide if the same sentence was copied into other games' audit suites — it
  understates the gates it describes. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Dev's own Conflict finding above cites
  `audio.ts:48,52`; the two comments it describes are actually at `:47` (mushroom)
  and `:50` (fleaKill). The substance is correct — I confirmed OBSTAC
  (`CENTI4.MAC:1701-1739`) contains no sound write and that `:2169` is the
  mushroom path's `JMP 20$` — only the anchors are off, and cp6-2 will read them.
  *Found by Reviewer during code review.*

### TEA (test design — round 2)
- **Improvement** (non-blocking): the round-2 guards required no new test
  infrastructure, but they did surface that `parseCite` took `string` while four
  of its call sites reached fields the surrounding filter did not guarantee, so
  those calls were made through `as string`. A missing citation therefore
  arrived as `Cannot read properties of undefined (reading 'match')` with no
  field name in it. Fixed here by widening the signature and deleting the casts.
  Affects `plugins/centipede/tests/audit/sound-dossier.test.ts` — worth checking
  whether the sibling games' audit suites carry the same pattern, since this
  file's shape was copied from them. *Found by TEA during test design.*
- **Question** (non-blocking): `voiceCite` for the four kill cues all point at
  the same line (`CENTI4.MAC:2423`), which is correct — they are one ROM sound —
  but it means the `pokeyVoice` cross-check cannot distinguish a cue that
  legitimately shares a write from one mis-pointed at a neighbour that happens to
  target the same voice. Re-pointing `playerDeath` from `:2445` to `:2423` would
  survive, because both write AUDF0. Closing that would need each cue's voice
  write tied to its own `channelCite` block rather than to a bare line, which is
  a bigger change than this rework warrants. Affects
  `plugins/centipede/docs/rom-study/sound.fixture.json` (the `voiceCite` field's
  contract) — recording it so cp6-2 knows the guard's exact reach.
  *Found by TEA during test design.*

### Dev (implementation — round 2)
- **Improvement** (non-blocking): TEA's `voiceCite` Question above is not a
  prediction any more — it is the one survivor of a 15-mutation battery against
  the shipped artifacts. Repointing `scorpionLoop.voiceCite` from `:2392` to the
  march's write at `:2433` stays green: both lines write `AUDF1`, and the
  recovery is by voice rather than by path. Recording the measurement that makes
  the fix cheaper than TEA expected: in all eleven ROM cues the voice write sits
  **2 to 6 lines after that cue's own block anchor** — `channelCite` for the ten
  channelled cues, `computedCite` for the flea — while the surviving mutant sits
  47 lines away. So the guard TEA describes needs no new field and no block
  parser, only `voiceCite.start - anchor.start` in `[0, 8]`. I did not add it:
  tests are TEA's to write, and the round-2 contract is satisfied without it.
  Affects `plugins/centipede/tests/audit/sound-dossier.test.ts`.
  *Found by Dev during implementation.*

### Dev (implementation — round 3)
- **Gap** (non-blocking, but it grew teeth this round): the ROM-comment guard
  (`sound-dossier.test.ts`, "every ROM comment sound.md quotes is REAL and sits
  on a cited line") resolves every quote against **CENTI4.MAC only**, and it
  matches only backticked strings that START with `;`. Round 3 adds two quotes
  from `CENDE4.MAC` — the declarations that prove the SOUNDS header is a voice
  map — so the doc now carries quoted ROM text the guard cannot see. MEASURED in
  both directions: (a) a FABRICATED CENDE4 quote survives — rewriting the CHAN1
  declaration's comment to `;INDEX FOR SHOT SOUND` leaves the audit suite 80/80
  green; (b) a TRUE CENDE4 quote written in the guard's own `;`-form is REJECTED
  as fabricated — `;INDEX FOR CENTIPEDE SOUND` reddens with "appear nowhere in
  CENTI4.MAC", which is the honest quote and the wrong verdict. I quoted whole
  declaration lines (`CHAN1:\t.BLKB 1\t\t\t;INDEX FOR CENTIPEDE SOUND`) so the
  text is complete and faithful, but that is a workaround for the guard's shape,
  not verification. Fix: resolve each quote against the file named by the nearest
  preceding citation rather than assuming CENTI4.MAC, and drop the leading-`;`
  requirement so a whole-line quote is checked too. Affects
  `plugins/centipede/tests/audit/sound-dossier.test.ts`.
  *Found by Dev during implementation.*
- **Conflict** (blocking for the sprint, NOT for this story): a
  `git pull --rebase --autostash` ran in this checkout at 18:15 mid-phase — not by
  me — replaying all eight cp6-1 commits cleanly onto upstream `sc1-1` work. It
  brought in 18 new orchestrator tests, one of which FAILS:
  `tests/sprint-repo-routing.test.mjs:534`, "context scope follows the archive
  rule". PROVED NOT OURS: it fails identically on pristine `origin/main` in a
  detached worktree with none of this story's commits present. Cause: the test
  hardcodes `context-epic-jt8.md` as its non-vacuity example, with the comment
  "jt8 has 4 open stories at the time of writing" — every jt8 story is now `done`
  (jt8-1,2,3,4,6,7), so the epic correctly dropped out of the guard's live scope
  and the example went stale. It belongs to mg1-4 (`be67a10`, `c966511`). The fix
  is to derive the example from sprint state rather than pin one epic — pinning
  another open epic just moves the expiry date. Affects
  `tests/sprint-repo-routing.test.mjs`. *Found by Dev during implementation.*
  **FIXED at the user's direction (`4172a95`), outside this story's diff:** both
  directions are now derived from `sprint/epic-*.yaml` and stated as an equality
  (epic contexts in scope == epics with an open story; story contexts in scope ==
  stories not done), recomputed in the test file rather than by calling the
  helper under test. Mutation-proved 6/6 against the helper — including "every
  epic counts as live", which the old pinned assertion could not catch — and the
  staleness itself proved gone: forcing a live epic's remaining stories to `done`
  in a scratch worktree leaves the test green. `test:orchestrator` 390/390.

### Reviewer (code review — round 3)
- **Gap** (blocking for cp6-2): **POKEY voice 0 is contended too, and the dossier never
  rules on it.** The ruling recovers voice 1's arbitration in full but stops there, and
  the machine states the voice-0 case in the same words one screen further down:
  `CENTI4.MAC:2374` is `BEQ 48$ ;IF NO BONUS SOUND` and `CENTI4.MAC:2437` is
  `BEQ 52$ ;IF NO PLAYER EXPLOSION` — the same instruction shape, the same comment form,
  one voice apart. Measured: `STA AUDF0` has exactly two sites, `CENTI4.MAC:2423` (CHAN0,
  the four kill cues) and `CENTI4.MAC:2445` (CHAN5, playerDeath); label `52$` is
  referenced from exactly one place in the whole routine (`:2437`) and `:2416`
  (`BNE 50$ ;ALWAYS`) blocks fall-through into it, so **a live player explosion preempts
  all four kill cues outright**, exactly as a live bonus preempts the voice-1 three. The
  fixture already carries every ingredient — five cues at `pokeyVoice: 0`, both write
  sites claimed as SND-102 and SND-104 — but `voiceArbitration.contenders` lists only the
  four voice-1 cues, and `ourShellDiffers` records only the voice-1 divergence. The
  divergence is live in our shell: the four kills share channel `'impact'`
  (`src/shell/audio.ts:89-92`, correctly mutually exclusive) while playerDeath sits on
  `'alert'` (`:94`), so our clone can ring a kill and the player's death together where
  the cabinet plays only the death. cp6-2 wires these channels and will believe the split
  faithful unless told. Affects `plugins/centipede/docs/rom-study/sound.fixture.json`
  (`voiceArbitration` needs a voice-0 record, or a second entry) and
  `plugins/centipede/docs/rom-study/sound.md` §2.5. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): **`;CHAN 0=ALL EXPLOSIONS` is a second, unused proof of
  the voice reading, and §1's wording points away from it.** The header's voice-0 line
  says ALL EXPLOSIONS, plural, and it has to — voice 0 carries BOTH explosion variables
  (CHAN0 at `:2423`, CHAN5 at `:2445`), whereas the CHAN0 *variable*'s own declaration
  reads `;INDEX FOR EXPLOSION SOUND` (singular, `CENDE4.MAC:193`). Under the variable
  reading that header line is simply wrong; under the voice reading it is exact. That is
  an independent corroboration as strong as the CHAN1 one the ruling is built on, and the
  repo already holds it as claim SND-003. Meanwhile §1 tells the reader "the remaining
  three variables are missing from that header" and SND-105 speaks of CHAN5's "absence
  from the SOUNDS header comment" — both true of the *variables* and both steering away
  from the fact that all three of those cues ARE in the header: bonus and scorpion on the
  CHAN 1 line, the player explosion under CHAN 0's ALL EXPLOSIONS. Affects
  `plugins/centipede/docs/rom-study/sound.md` §1 and `claims/16-sound.json` SND-105.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): a **fourth** artifact still states the branch sense backwards —
  `plugins/centipede/tests/audit/sound-dossier.test.ts:1246`, whose assertion label reads
  `'CENTI4.MAC:2374 should branch past the arbitration'`. `BEQ 48$` branches TO the
  arbitration (`48$` is `CENTI4.MAC:2396`). Round 2 named three artifacts and round 3
  fixed exactly those three; this one survived because the round-3 diff is doc-only and
  nobody grepped the test files. The assertion itself (`/BEQ\s+48\$/`) is correct and the
  block comment above it is correct — only the human-facing failure message inverts, which
  is the worst place for it, since it is read at the moment someone is reasoning about
  this exact branch. Affects `plugins/centipede/tests/audit/sound-dossier.test.ts`.
  *Found by Reviewer during code review (rule-checker).*
- **Gap** (non-blocking): SND-098's claim body says the expiry tick's `DEY / BEQ 48$` sits
  "two lines below", but it is at `CENTI4.MAC:2379-2380`, five and six lines below the
  claim's own cited `:2374`. `sound.md:175` states the same fact precisely, so the
  imprecision is confined to the claim body — which is exactly the field no gate reads
  (the citation gate re-opens `source.verbatim` and never the `claim` prose). Affects
  `plugins/centipede/docs/rom-study/claims/16-sound.json`. *Found by Reviewer during code
  review (rule-checker).*
- **Gap** (non-blocking): `CENTI4.MAC:2377` is named in `voiceArbitration.note` as the
  player-explosion-tail branch target but is absent from `voiceArbitration.cites`, so it
  is the one line the note leans on that the citation sweep does not re-open. Pre-existing,
  not introduced by round 3. Affects
  `plugins/centipede/docs/rom-study/sound.fixture.json`. *Found by Reviewer during code
  review (comment-analyzer).*
- **Improvement** (non-blocking): `DOSSIER_FILES` (`tests/audit/dossier-sweep.ts:48`) is a
  hand-curated include-list inside a completeness sweep. Verified it currently omits only
  the three files AC-7 deliberately fences out plus one citation-free demo write-up, so
  nothing has slipped — but a future dossier `.md` is unswept until someone remembers this
  line. An exclude-list derived from the directory would make "swept" the default. Affects
  `plugins/centipede/tests/audit/dossier-sweep.ts`. *Found by Reviewer during code review
  (silent-failure-hunter).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The ruling lands in a machine-readable fixture as well as prose**
  - Spec source: context-story-cp6-1.md, AC-1 and AC-3
  - Spec text: "record it in plugins/centipede/docs/rom-study/ as claims the
    citation gate can re-open" / "the derivation is written down so cp6-2
    consumes a number rather than a judgement"
  - Implementation: GREEN must author `docs/rom-study/sound.fixture.json`
    alongside `sound.md` and `claims/16-sound.json`. The story names two
    artifacts; the tests require three.
  - Rationale: AC-1 ("each names the ROM table and channel it transcribes") and
    AC-3 ("cp6-2 consumes a number") are not checkable against prose — a
    markdown table can say anything and a regex over it tests the regex.
    Against a fixture, the tests RECOVER each number from the vendored file:
    the byte count, the seed's radix-decoded value, the mask in the cited gate.
    joust's `docs/rom-study/pictures.fixture.json` is the in-repo precedent for
    a machine-readable companion to a dossier doc.
  - Severity: minor
  - Forward impact: minor — cp6-2's baker imports the fixture rather than re-reading
    the prose, which is what AC-3 asks for; the fixture path is now part of
    cp6-2's input contract.
- **The DOSSIER_FILES list is extracted to a module, not left inline as joust has it**
  - Spec source: context-story-cp6-1.md, AC-7
  - Spec text: "generalised to a DOSSIER_FILES list in joust's shape
    (plugins/joust/tests/audit/citations.test.ts:603)"
  - Implementation: the list, extractor, claim loader and coverage predicate
    moved to `tests/audit/dossier-sweep.ts`; `citations.test.ts` imports them.
    joust keeps its equivalents as file-local consts and closures.
  - Rationale: AC-7 also requires the enrollment be mutation-proved, and those
    two halves conflict when the sweep is a closure. A mutation test that
    re-implemented the coverage rule would prove its own copy has teeth, not
    the gate's. One exported function, called by the gate and by the mutation
    proof, is the only shape where "deleting a claim reddens the sweep" is a
    statement about the thing that actually runs.
  - Severity: minor
  - Forward impact: none — for cp6-2; it is the shape the joust follow-up filed
    in Delivery Findings would adopt.
- **AC-5 and AC-6 ship as GREEN pins rather than failing tests**
  - Spec source: context-story-cp6-1.md, AC-5 and AC-6
  - Spec text: "The manifest and the CHANNELS map are UNCHANGED by this story"
    / "centipede is still silent when this story closes"
  - Implementation: five of the tests pass on the first run — they assert a
    state that is already true and must REMAIN true, so they are guards, not
    RED.
  - Rationale: a negative acceptance criterion has no failing form that is not
    a lie. Writing them RED would mean breaking the manifest to watch a test
    fail. Each was instead proved to bite by mutation (renaming a cue,
    re-pointing a CHANNELS bucket, creating `tools/pokey-bake/`, naming
    centipede in the `deploy-assets` recipe) — see the mutation battery below.
  - Severity: minor
  - Forward impact: minor — cp6-2 must DELETE the two AC-6 guards when it legitimately
    adds the baker and the deploy line. They are scoped to this story by
    design; leaving them in place would block the story that ends the silence.

### TEA (test design — round 2)
- **The fixture contract GAINS a required field rather than the tests inferring the voice**
  - Spec source: Reviewer Assessment (round 1), findings H1 and H3
  - Spec text: "add a cross-check from each cue's cited lines to the
    `STA AUDF<n>`/`STA AUDC<n>` it performs"
  - Implementation: added `voiceCite` to `CueRuling` as a required field for every
    rom cue, rather than deriving the register write by scanning outward from
    `channelCite`.
  - Rationale: the Reviewer's wording would have worked — the AUDF write sits a
    few lines below each `channelCite` — but a test that goes hunting near a
    citation is a test that decides for itself what "near" means, and it would
    have passed on `playerDeath` finding the explosion's `STA AUDF0` at :2423
    instead of its own at :2445. Both are AUDF0, so the bug would have been
    invisible. Making the fixture NAME the line moves the claim into the
    artifact where the claims gate can re-open it, which is what AC-2 asks of
    every other transcribed constant. It also gives cp6-2 the citation directly.
  - Severity: minor
  - Forward impact: minor — `voiceCite` is now part of cp6-2's input contract,
    and eleven new claims are required (`:1287`, `:2349`, `:2357`, `:2373`,
    `:2374`, `:2382`, `:2392`, `:2415`, `:2423`, `:2433`, `:2445`).
- **`voiceArbitration.contenders` is added as machine-readable data, not left as prose**
  - Spec source: Reviewer Assessment (round 1), findings H1 and H2
  - Spec text: "Name all four; state priority bonus > scorpion/flea > march"
  - Implementation: the arbitration ruling now carries a `contenders` array of
    cue keys, and the tests require it to equal the set recovered from the ROM's
    `STA AUDF1` lines.
  - Rationale: a prose note cannot be compared to a machine. The wrong ruling
    shipped precisely because the only statement of it was a sentence, while the
    data that contradicted it (`pokeyVoice: 1` on four cues) lived elsewhere in
    the same file with nothing joining them. A key both the ROM and the cue map
    can be checked against closes the loop; the prose is then checked against
    that key rather than against a human's reading.
  - Severity: minor
  - Forward impact: minor — cp6-2 reads `contenders` instead of parsing the note.
- **The prose is gated by SECTION scan, which is the weakest guard I wrote**
  - Spec source: Reviewer Assessment (round 1), finding H2
  - Spec text: "Correct the set to bonusLife/march/fleaLoop/scorpionLoop"
  - Implementation: `the prose names the same contenders the fixture does` locates
    the section whose heading matches `/voice\s*1/i` and requires every backticked
    cue name inside it to be a declared contender.
  - Rationale: prose is not structured data and I could not make this as tight as
    the fixture checks. Anchoring on the heading is the most stable handle the
    document offers. I am logging it rather than leaving it implicit because the
    failure mode is specific: rename that heading and the test fails loudly with
    "must carry a section about POKEY voice 1 contention", which is correct
    behaviour but will read as a false alarm to whoever renamed it.
  - Severity: minor
  - Forward impact: minor — cp6-2 must keep a voice-1 heading in `sound.md`, or
    update the test deliberately.

### Dev (implementation)
- **The fixture carries a `voiceArbitration` record the schema did not ask for**
  - Spec source: context-story-cp6-1.md, AC-1 and AC-4
  - Spec text: "All fourteen SOUNDS entries are accounted for individually" /
    "The non-uniform frame gating is recorded per cue ... rather than flattened
    into one cadence"
  - Implementation: added a top-level `voiceArbitration` object to
    `sound.fixture.json`, beyond the per-cue fields TEA's tests require.
  - Rationale: reading SOUNDS end to end turned up a second axis of
    non-uniformity the ACs do not name — POKEY voice 1 is contended, and the
    march is entered only when no flea or scorpion is live. Recording it per-cue
    would have scattered one fact across three entries; recording it nowhere
    would have let cp6-2 bake three cues that cannot all sound at once on the
    machine. The tests do not forbid extra keys, so this is additive.
  - Severity: minor
  - Forward impact: minor — cp6-2 reads it, and it is the evidence behind the
    voice-priority Delivery Finding filed against the CHANNELS map.
- **Claims are generated from the vendored file rather than hand-typed**
  - Spec source: context-story-cp6-1.md, AC-2
  - Spec text: "Every transcribed constant carries a radix-cited comment and a
    claims entry the live citation gate re-opens against the vendored CENTI4.MAC"
  - Implementation: `claims/16-sound.json` is emitted by a scratchpad script
    that copies each `verbatim` out of the vendored file. The claim TEXT — the
    ruling itself — is hand-authored.
  - Rationale: a hand-typed verbatim risks a tab-vs-space slip that reddens the
    gate for a transcription reason rather than a citation reason. Copying makes
    the byte check tautological on its own, so every claim also carries a `must`
    regex the cited line has to match BEFORE its verbatim is taken — a wrong line
    number fails at authoring time instead of byte-verifying a quote of the wrong
    code. All 93 matched. The structural checks in `sound-dossier.test.ts` read
    the ROM independently of the claims, so the line numbers are cross-checked
    twice.
  - Severity: minor
  - Forward impact: none — the committed artifact is ordinary JSON; the
    generator is a throwaway and is not part of the deliverable.

### Reviewer (audit)

- **TEA: "The ruling lands in a machine-readable fixture as well as prose"** → ✓ ACCEPTED
  by Reviewer: the fixture is what makes AC-1 and AC-3 checkable at all, and the
  ROM-recovering tests built on it are the strongest part of this diff. Agrees with author
  reasoning.
- **TEA: "The DOSSIER_FILES list is extracted to a module, not left inline as joust has it"**
  → ✓ ACCEPTED by Reviewer: verified the necessity claim rather than taking it — AC-7 needs
  the mutation proof to call the same implementation the gate calls, and I confirmed
  `sound-dossier.test.ts:963-988` imports the real `uncoveredCitations`/`claimCovers` from
  `dossier-sweep.ts`. A closure could not have been proved this way.
- **TEA: "AC-5 and AC-6 ship as GREEN pins rather than failing tests"** → ✓ ACCEPTED by
  Reviewer: a negative acceptance criterion has no honest failing form, and each pin was
  mutation-proved instead. Independently confirmed both hold today (0 files changed under
  `src/`, no baker, no deploy line).
- **Dev: "The fixture carries a `voiceArbitration` record the schema did not ask for"** →
  ✗ FLAGGED by Reviewer. The instinct was right — this fact belongs in the fixture and
  scattering it per-cue would have been worse. But "the tests do not forbid extra keys, so
  this is additive" is exactly why it shipped wrong: an additive key is an UNGATED key. It
  is absent from the `SoundFixture` interface and from `fixtureCitations()`, so neither its
  prose nor its six citations are swept, and the ruling it carries is materially incorrect
  (omits `bonusLife`, inverts the priority). Filed as High + Medium in the assessment table.
- **Dev: "Claims are generated from the vendored file rather than hand-typed"** → ✗ FLAGGED
  by Reviewer. The generation itself is fine and the 93 claims do carry real
  `source.verbatim` values that the gate byte-re-opens — I checked that directly and
  corrected my own first reading of it. What is flagged is the deviation's RATIONALE: it
  credits a `must` regex for making "a wrong line number fail at authoring time instead of
  byte-verifying a quote of the wrong code," but that regex lives only in the throwaway
  generator. `check-citations.mjs` has no `must` field and no claim carries one, so the
  safeguard is not in the repository and cannot be re-run. Byte-equality against a line the
  generator itself chose cannot detect that the wrong line was chosen — demonstrated by
  retargeting SND-054 to an unrelated real line with the suite staying green. This is a
  lang-review #17 issue (a deviation note asserting a mechanism nobody can re-run).

### Reviewer (audit — round 3)

No NEW deviations were logged by Dev in round 3, and re-reading the diff I found none
that went unlogged: the round is three doc/data files, and every change in it traces to
a round-2 finding. The five entries above keep their round-1 stamps. Two audits are
updated by this round, and one process deviation was undocumented and is recorded here.

- **Dev: "The fixture carries a `voiceArbitration` record the schema did not ask for"** →
  ✗ FLAGGED (round 1) → **✓ now ACCEPTED as re-audited.** The round-1 flag had two halves
  and both are closed: the block is now enrolled in the sweep (I confirmed
  `fixtureCitations()` walks `voiceArbitration.cites`, and rule-checker independently
  re-ran the enrollment at 53/53 with round 3's three new cites — `CENDE4.MAC:194`,
  `CENTI4.MAC:2326`, `CENTI4.MAC:2379-2380` — included), and the ruling it carries is
  correct, which I re-derived from the ROM rather than from the fixture. **The flag's
  underlying instinct is now vindicated twice over**: this deviation is the reason cp6-2
  gets a machine-readable arbitration record at all, and it is also what let me find the
  gap in finding F1 below — a record with a `contenders` array invites the question "which
  voices have one?", which prose never would have.
- **Dev: "Claims are generated from the vendored file rather than hand-typed"** →
  ✗ FLAGGED (round 1) → **✗ STILL FLAGGED, unchanged and correctly so.** The `must` regex
  still lives only in the throwaway generator; `check-citations.mjs` has no `must` field
  and no claim carries one. I re-confirmed this is not academic: test-analyzer swapped
  SND-100↔SND-103 and SND-102↔SND-104 line numbers and the suite stayed 1087/1087, which
  is exactly the defect the flagged rationale claims to have prevented. This is the same
  root as open finding M2 and is routed with it — no new action beyond F2 below.
- **UNDOCUMENTED (Reviewer-recorded): round 3 ran as GREEN when round 2 handed off to
  TEA for RED.** Spec source: the round-2 Reviewer handoff, "**Handoff:** Back to TEA for
  RED", naming two mechanisable items. What happened: the Phase History shows
  `review → finish (31s) → green`, i.e. the rejection walked forward into `finish` and was
  corrected to `green`, so TEA never ran. Consequence, and it is the honest reason one
  finding is still open: of round 2's two mechanisable items, the header-reading pin
  landed as gated CLAIMS (SND-106/SND-107, both mutation-proved to redden 4-6 tests) but
  the non-unique-`verbatim` anchor rule did not, because it is a test change and Dev was
  not in a test phase. Severity: minor — process, not product. **Not held against this
  round**: Dev correctly declined to write TEA's tests from the GREEN phase and said so
  plainly rather than closing the finding silently. Forward impact: F2 below carries the
  item; see also the known pf routing defect (`complete-phase` needs an explicit
  TO_PHASE on a rejection, or a REJECT routes to `finish`).

## Sm Assessment

Setup measured this story's own citations before handing it over, because its
deliverable IS citation accuracy and a dossier story that ships rotten anchors
teaches the next reader to trust anchors. Three of its own were wrong.

**Corrected in the story AND the epic** (cp6-2 reads the epic and inherited the
same two), all measured against `reference/atari-source/centipede/revision.v4/CENTI4.MAC`
(2686 lines, present):

1. The every-other-frame gate is **:2338-2340**, not :2339-2340. The prose quoted
   three instructions but the range spanned two lines and cut off `LDA FRAME` :2338.
2. The out-of-scope 15-second alarm is **:2360-2371**, not :2358-2368 — wrong at
   both ends. It ended at 2368 while the `;ALTERNATE TONE BETWEEN OFF AND ON`
   comment it quotes sits at :2369. The low end is the dangerous half: it declared
   `LDA I,64` :2358 / `STA AUDC2` :2359 out of scope, and those are not the alarm
   at all — they are the SHOT cue's own AUDC2 control/volume byte, FREQ2's
   companion, which cp6-2's baker needs. As written, the fence deleted an in-scope
   constant.
3. Attract silence is **:2329-2336**, not :2329-2338. The attract path RTSes at
   :2336; :2338 begins the in-scope gate from correction 1.

**Confirmed intact, safe to rely on:** the channel header :2325-2328; FREQ0/CONT0
:2455-2456; FREQ1/CONT1 :2457-2458; FREQ2 :2459; FREQ3/CONT3 :2461-2462; FREQ4
:2463-2464; FREQ6 :2465; the absence of any FREQ5; the player-explosion gate
`LDA FRAME / AND I,3` :2438-2439; `AND I,07` :2376 (verified the ONLY one in
:2322-2465); `LDA I,14` :2346 and `LDY I,20.` :2389 (the radix coincidence — both
decimal 20, by different routes); `FRAME_HZ = 15750/263` at
`plugins/centipede/src/shell/timebase.ts:20`, which EXISTS as a named constant, so
AC-3 consumes it rather than re-deriving it; and the fourteen-cue manifest at
`plugins/centipede/src/shell/audio.ts:44-62`.

**AC-7 added, ruled from precedent rather than taste.** The gate has two halves
and only one would have watched this story's output. `loadClaims()` globs the
whole claims directory (`tests/audit/citations.test.ts:432-438`), so a new
`16-sound.json` IS byte-re-opened — AC-2 is reachable. But the coverage sweep is
hardcoded to `brief.md` + `glossary.md` (:441-442, :458-461), so a new `sound.md`
would be swept by NOTHING, and the extractor only matches backtick-wrapped
`FILE:LINESPEC` (:420), so even inside a swept file a bare-colon ref is invisible.
joust already solved exactly this by replacing the hardcoded pair with a
`DOSSIER_FILES` list (`plugins/joust/tests/audit/citations.test.ts:603`, sweeping
three docs). Follow joust. Without AC-7 this story could satisfy AC-2 on whatever
its author remembered to hand-convert to JSON while the doc's remaining prose
rotted unwatched — the precise disease it was filed to prevent.

**Scope fence for TEA:** centipede already carries `subsystems.md`, `pictures.md`
and `open-questions.md` that its own sweep does not scan. Enrolling those is a
separate finding to FILE, not to fix here. This story adds its own doc and stops.

**Also fenced:** AC-5 makes this a ruling, not an edit. The manifest and CHANNELS
map stay untouched; an unsourced cue is handed to cp6-2 as a named decision. And
AC-6 is a truth-in-reporting clause — centipede is still silent at close.

**Environment:** clean tree on `main`, in sync with origin, no blocking PRs. The
two in-progress stories (jt5-7, jt5-8) are sibling checkouts' joust work and do
not touch centipede. Trunk-based, so `**Branch:** none` is recorded above
deliberately — the finish parser needs that line.
## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/centipede/tests/audit/sound-dossier.test.ts` — new, the cp6-1 suite (38 tests)
- `plugins/centipede/tests/audit/dossier-sweep.ts` — new, the coverage sweep as a
  module so AC-7's mutation proof can call the real one
- `plugins/centipede/tests/audit/citations.test.ts` — modified, the hardcoded
  brief+glossary pair replaced by the shared `DOSSIER_FILES`

**Tests Written:** 38 new, covering all 7 ACs
**Status:** RED — 33 failing, 1042 passing across the centipede project.
`npm run lint` clean; `npm run test:orchestrator` 372/372; the other 57 centipede
test files are unaffected by the `citations.test.ts` refactor.

### What GREEN has to produce

Three files. The suite's failure messages name each one and its required shape.

| File | What it is |
|------|-----------|
| `docs/rom-study/sound.md` | the prose dossier, now swept by the coverage gate |
| `docs/rom-study/sound.fixture.json` | the machine-readable ruling — what cp6-2 consumes |
| `docs/rom-study/claims/16-sound.json` | claims the live gate re-opens byte-for-byte |

### The tests worth anything are the ones that RECOVER the number from the ROM

A fixture that merely asserts about itself is worth little, so the load-bearing
checks recompute from the vendored `CENTI4.MAC` and require agreement:

- a cue claiming `FREQ2` must cite the line that DEFINES `FREQ2`
- `tableLengthBytes` must equal the `.BYTE` operands counted on that line
- `lengthFrames` must equal the immediate the ROM stores into the channel,
  **decoded hex unless it carries a trailing period**
- `lengthSeconds` must equal `lengthFrames × frameGate ÷ FRAME_HZ`, with
  `FRAME_HZ` imported from `src/shell/timebase.ts` and the literal `15750`
  forbidden inside the fixture (AC-3: consume it, do not re-derive it)
- `frameGate` must match the mask in the range it cites, and that range must
  include the `LDA FRAME` the mask reads

That last clause is the story's own history turned into a test. The pre-setup
spelling of AC-4 named three instructions and spanned two lines, cutting off
`LDA FRAME` at `:2338`. A range that quotes the mask but drops the load now
fails.

### Two measurements this suite is built on

**1. The countdown seed equals the table length in all seven channels, and the
two are written in DIFFERENT radices.** Measured against the vendored file:

| Channel | Seed | Radix | Value | Table | Bytes |
|---------|------|-------|-------|-------|-------|
| CHAN0 | `LDA I,13` :2299, :1881 | hex | 19 | FREQ0/CONT0 :2455-2456 | 19 |
| CHAN1 | `LDA I,07` :1288 | hex | 7 | FREQ1/CONT1 :2457-2458 | 7 |
| CHAN2 | `LDA I,0B` :2133 | hex | 11 | FREQ2 :2459 | 11 |
| CHAN3 | `LDA I,14` :430 | hex | 20 | FREQ3/CONT3 :2461-2462 | 20 |
| CHAN4 | `LDA I,17.` :1994 | **decimal** | 17 | FREQ4 :2463-2464 | 17 |
| CHAN5 | `LDA I,13` :1811 | hex | 19 | FREQ0/CONT0 (replayed) | 19 |
| CHAN6 | `LDA I,20.` :2024 | **decimal** | 20 | FREQ6 :2465 | 20 |

This is the radix discipline made mechanical rather than exhorted. Read all
seven one way and CHAN4 becomes 23 against a 17-byte table while CHAN6 becomes
32 against a 20-byte one — the systematic misread the story warns about, and it
cannot survive the seed-equals-table-length check.

**2. `SOUNDS` is called once per VIDEO frame** — `CENTI4.MAC:24`, inside MAIN's
loop, which spins on `SYNC` at `:17-18` waiting for VBLANK. That is what makes
`lengthSeconds = lengthFrames × frameGate ÷ FRAME_HZ` the right formula and not
an approximation, and it is why `frameGate` is expressed as video frames per
SOUNDS pass.

### Mutation battery — 37 of 37 caught

Every guard was ranked, not assumed. I built a throwaway schema-satisfying
dossier, drove the suite green on it, then applied one mutation at a time and
required a specific test to redden. **The throwaway was deleted afterwards — it
is Julia's deliverable, not mine**, and the working tree carries only the three
test-side files.

The battery mattered twice, and both times it found a hole rather than
confirming one:

- **The radix rule was vacuous.** Pass one caught 31 of 32; the survivor was
  "strip the radix from a transcribed constant". The cause was structural, not a
  bad mutation: the fixture could cite `STA CHAN4` and never `LDA I,17.`, so no
  claim ever quoted a number and the radix sweep had nothing to sweep. `seedCite`
  is now a RANGE that must span the load AND the store, and the seed constant
  must itself be pinned by a radix-stating claim.
- **A count floor is not a completeness check.** After adding the lang-review #15
  floors, "demote four table cues to computed" still survived: it left exactly
  six table-backed cues, meeting the floor of six, while four of the ROM's six
  tables went untranscribed. The tables are now ENUMERATED — all of
  FREQ0/1/2/3/4/6 must be claimed by some cue, and naming a FREQ5 fails, because
  there is no FREQ5.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 token-not-claim; every guard mutation-tested | the 37-mutation battery above | all caught |
| #15 loops whose `continue`s can skip every iteration | `expectPopulated` on all 14 sweeps; vacuity attack "every cue declared an invention" | failing (RED) |
| #15 bounds looser than the measured value | floors are the machine's numbers (7 channels, 6 tables, 3 gated cues), not round numbers | failing (RED) |
| #18 fixture whose value IS the expectation | `lengthFrames` is recovered from the ROM, never restated; `15750` banned from the fixture | failing (RED) |
| #18 helper reimplementing a platform algorithm | `the ROM readers this suite depends on` — `countByteOperands` and `decodeImmediate` pinned against 9 table lines and 8 seeds read by hand | passing (pin) |
| #17 comments asserting a mechanism nobody re-ran | every ROM fact in this suite's header is pinned by the helper self-check above, so the prose and the tests fail together | passing (pin) |
| #4 null/undefined (`??` not `||`) | `?? ''` on line lookups, `??` on `CENTIPEDE_SOURCE_DIR` | n/a (no nullable-falsy values) |
| #8 test quality — no `as any` | none in the diff; the two `as string` casts sit AFTER a test that has already required the field non-null | passing |
| #10 `JSON.parse()` typed `as T` without runtime validation | **deliberate, and it is the point**: `loadFixture()` casts, and the 38 tests ARE the runtime schema. A Zod schema here would duplicate the gate in a form nothing mutation-tests | n/a (justified) |
| #1/#2/#3/#5/#6/#7/#11/#12 | no enums, no JSX, no async beyond one dynamic import, no generics, no barrel imports in the diff | n/a |

**Rules checked:** 8 of 18 applicable; the other 10 have no surface in a
test-only, node-environment diff.
**Self-check:** no vacuous assertions found in what I wrote — proven, not
inspected, by the battery. One pre-existing weakness was fixed in passing:
`citations.test.ts`'s `the dossier files exist` asserted
`existsSync(a) && existsSync(b)` as a single boolean, which reports "expected
false to be true" and names neither file; it now reports the missing list.

### For Dev — four things that will cost an hour each if you meet them cold

1. **`sound.fixture.json` must not contain the string `15750`.** `FRAME_HZ` is a
   named constant at `src/shell/timebase.ts:20` and AC-3 says consume it. Put
   `"frameHzSource": "src/shell/timebase.ts:FRAME_HZ"` and let `lengthSeconds`
   carry the arithmetic; the test recomputes it from the imported constant.
2. **`seedCite` is a RANGE, not a line.** `CENTI4.MAC:1994-1995`, not `:1995`.
   It must span both the `LDA I,17.` and the `STA CHAN4`, and the line carrying
   the immediate needs its own claim whose text says `hex` or `decimal`.
3. **Every citation in `sound.md` must be backtick-wrapped and file-qualified.**
   The extractor's regex only sees `` `CENTI4.MAC:2455` ``. A bare `:2455` or an
   unbackticked `CENTI4.MAC:2455` is invisible to the sweep, and the suite fails
   on both spellings deliberately — that invisibility is how this story's own
   three citations rotted before setup caught them.
4. **`fleaLoop` is the awkward one.** The ant/flea voice at `:2409-2414` derives
   `AUDF1` from `ANTV` — no table and no countdown variable at all. The schema
   allows `freqTable: null` and `channel: null` for exactly this case, but only
   with a `computedCite`. Do not force it onto CHAN1 to make the shape fit;
   CHAN1 is the march's, and the ruling for the flea is that the ROM computes it.

I have NOT ruled on which cues are inventions — that is the story's deliverable
and it is yours. `mushroom`, `headBottom` and `waveClear` are the three I could
find no SOUNDS entry for while reading, but I did not chase their call sites, so
treat that as a starting point rather than a finding.

**Handoff:** To Dev for implementation
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/centipede/docs/rom-study/sound.md` — the prose dossier (63 backticked
  citations, every one pinned by a claim and individually mutation-proved)
- `plugins/centipede/docs/rom-study/sound.fixture.json` — the machine-readable
  ruling cp6-2 consumes: fourteen cues, plus the `voiceArbitration` record
- `plugins/centipede/docs/rom-study/claims/16-sound.json` — 93 claims, byte
  re-opened against the vendored `CENTI4.MAC`

**Tests:** 1075/1075 passing in the centipede project (GREEN). `npm run lint`
clean, `npm run test:orchestrator` 372/372.
**Branch:** none — trunk-based, committed straight to `main` (`adf44a5`).

### The ruling

Fourteen declared cues resolve to **eight sound-raising sites in the entire
program** — and one of those eight has no cue name at all. Eleven cues transcribe
the machine, three are inventions.

**Four kill cues are one ROM sound.** Label `19$` (`CENTI4.MAC:2299-2300`) is the
single convergence point for every creature kill: the centipede segment path
arrives by `JMP 19$` at `:2289`, and the spider, ant and scorpion paths arrive by
falling through `18$` — the scoring call above it names all three by hand. This
is the collapse the story predicted, and the `CHANNELS` map already models it.

**The mushroom is the sharpest of the three inventions**, because the ROM is
explicit rather than merely silent: the shot-hits-mushroom path jumps to `20$`
(`CENTI4.MAC:2169`), which is the line *after* the `19$` explosion seed. It
deliberately steps over the sound a creature kill raises. `OBSTAC` — which our
manifest names for this cue — is a pure playfield-address lookup with no sound
register write anywhere in it. `headBottom` sets `NEWD` and nothing else;
`waveClear` sets `DELAY` and nothing else. None deleted; each carries a named
`cp62Decision`.

**There is no FREQ5**, and the reason is load-bearing rather than trivia: the
player explosion replays `FREQ0` and adds `hex 02` to the control byte to
increase volume (`:2444`, `:2449`). A reader assuming contiguous numbering would
invent a table the machine does not have.

**`fleaLoop` is computed, not tabulated.** `AUDF1` is derived from `ANTV` every
pass (`:2409-2414`), so the pitch falls as the flea descends. It has no table, no
countdown and no length — a fixed sample is a stand-in for a sweep, and cp6-2
has to say so.

### Two findings the story did not ask for

Both are filed in Delivery Findings and both matter to cp6-2.

1. **POKEY voice 1 is contended, and the march loses.** The march, the flea voice
   and the scorpion all write `AUDF1` and converge on one `AUDC1` write
   (`:2435`). The march block (`:2428`) is entered *only* when the ant/scorpion
   is off screen, the player is exploding, or the ant/scorpion is exploding
   (`:2399`, `:2402`, `:2406`). So on the cabinet **a live flea or scorpion
   silences the marching tick**. Our `CHANNELS` map gives all four their own
   channel, so the clone will sound fuller than the original. AC-5 forbade
   changing it, so it is recorded as a decision rather than a surprise.
2. **An eighth site has no cue name.** `RESTOR` seeds the explosion once per
   restored mushroom between waves (`:1881-1882`) — a real ROM sound with nowhere
   in our manifest to go.

### The radix, and why the tables prove the reading

The countdown seed **equals the length of the table it drives in all seven
channels**, and that is not a coincidence to restate — it is the detector,
because five seeds are spelled hex and two carry a trailing period:

| Channel | Seed | Spelled | Value | Table |
|---------|------|---------|-------|-------|
| CHAN0 | `LDA I,13` | hex | 19 | FREQ0 = 19 |
| CHAN1 | `LDA I,07` | hex | 7 | FREQ1 = 7 |
| CHAN2 | `LDA I,0B` | hex | 11 | FREQ2 = 11 |
| CHAN3 | `LDA I,14` | hex | 20 | FREQ3 = 20 |
| CHAN4 | `LDA I,17.` | **decimal** | 17 | FREQ4 = 17 |
| CHAN5 | `LDA I,13` | hex | 19 | FREQ0 = 19 |
| CHAN6 | `LDA I,20.` | **decimal** | 20 | FREQ6 = 20 |

Read `LDA I,17.` as hex and the bonus runs 23 against a 17-byte table; read
`LDA I,20.` as hex and the scorpion runs 32 against 20. Neither is audible.

### Verification — the guards were re-proved against the REAL dossier

TEA's mutation battery ran against a throwaway. A green suite on my artifacts
proves they are self-consistent, not that the suite would have objected, so I
re-ran eleven mutations against the committed files: **11 of 11 caught.** Both
radix misreads, a gate flattened, an invention re-presented as authentic, a kill
cue re-pointed to the wrong table, `FREQ4` losing its second line, a claim
drifting one line, a radix dropped from the `:1994` claim, a citation losing its
covering claim, an unbackticked citation, and the silence statement removed.

The eleventh needed a second pass and is worth recording: my first attempt at
removing the silence statement replaced only one of two occurrences, so the guard
stayed green for a correct reason. Re-run against both, it reddens. A survivor is
a claim about the harness until you have checked the harness.

### AC coverage

| AC | Where it lands |
|----|----------------|
| 1 | All fourteen ruled; four collapse onto CHAN0, three are labelled inventions, `fleaLoop` recorded as computed. All six tables and all seven channels accounted for. |
| 2 | 93 claims, byte re-opened; every transcribed constant states its radix; the two decimal-20s pinned separately. |
| 3 | Lengths derived from the countdown seed and the frame gate; `FRAME_HZ` consumed from `timebase.ts`, never restated; the derivation written into the fixture. |
| 4 | Gates 1, 2, 4 and 8 recorded per cue with the mask each cites; the out-of-scope fourth mask declined explicitly so a reader finds it refused rather than missed. |
| 5 | `SOUNDS` and `CHANNELS` untouched; three inventions handed on as named decisions; two wrong manifest comments filed rather than fixed. |
| 6 | No baker, no deploy line, and the dossier opens by saying centipede is still silent. |
| 7 | `sound.md` enrolled in `DOSSIER_FILES`; all 63 of its citations covered and each individually proved load-bearing by the mutation test. |

**Handoff:** To Reviewer for code review

### Subagent Results — round 1

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1075/1075, lint clean, 372/372) | N/A — but its "nine .skipIf are legitimate" judgement was NOT accepted; I measured the degradation myself (see L1) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 2, dismissed 0, deferred 1 (helper adversarial cases — low, folded into L3) |
| 5 | reviewer-comment-analyzer | Yes | findings | 6 | confirmed 4, dismissed 0, deferred 2 (scorpion channelCite / RESTOR .SBTTL — folded into L3) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 3 | confirmed 0, dismissed 3 (all three are the rule-#10 JSON.parse sites; rule-checker independently traced every consumer and found runtime validation downstream — recorded as L6, not dismissed silently) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 16 | confirmed 7, dismissed 0, deferred 9 (5x readonly-param nits + 2 pre-existing citations.test.ts items + 2 latent anchors — folded into M7/L2/L3) |

**All received:** Yes (6 enabled returned, 3 disabled pre-filled)
**Total findings:** 4 High, 7 Medium, 6 Low confirmed; 3 dismissed with rationale; 12 deferred/folded

Two findings below are mine, proved by mutation against the COMMITTED artifacts rather than
inferred, and both survived: they are the reason this is a rejection rather than a nit list.

### Rule Compliance — .pennyfarthing/gates/lang-review/typescript.md

Enumerated across `sound-dossier.test.ts` (1012 lines), `dossier-sweep.ts` (143) and the
modified block of `citations.test.ts`. 18 rules; 8 have surface here.

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 14 casts, 0 `as any`, 0 `@ts-`, 0 `!` | 4 VIOLATIONS — `as string` at :554, :569, :726, :748 where the loop filter does not cover the cast field (M7) |
| #2 generic/interface | 6 helper signatures | 5 non-readonly params, none mutated — deferred, cosmetic |
| #3 enums | 0 | n/a — no enums |
| #4 null/undefined | 9 `??`, 1 `||` | COMPLIANT — the `||` at :486 is a boolean OR of two booleans |
| #5 modules | 6 imports | COMPLIANT — extensionless is correct under `moduleResolution: bundler` |
| #6 React/JSX | 0 | n/a — no .tsx |
| #7 async | 24 | COMPLIANT |
| #8 test quality | 5 | COMPLIANT — no `as any`, no mocks, 13 documented `skipIf` |
| #9 build config | 1 | COMPLIANT — `npm run lint` clean, no config touched |
| #10 JSON.parse `as T` | 3 | COMPLIANT with reservation — all three are runtime-validated downstream; recorded as L6 |
| #11 error handling | 2 | 1 pre-existing `(e as Error)` in citations.test.ts, not this diff's |
| #12 perf/bundle | 0 | n/a |
| #13 fix regressions | 1 | COMPLIANT — c4d4428 added the #15 floors and introduced nothing new |
| #14 derived edges | 0 | n/a — no state machine |
| #15 token-not-claim | 34 | 3 VIOLATIONS (weak anchors, L3) + the two guard HOLES I proved by mutation (H3, H4) |
| #16 accessible names | 0 | n/a — no markup |
| #17 stale mechanism claims | 4 | 3 VIOLATIONS — L1 ("Absent on CI"), M5, M6 |
| #18 apparatus fails by passing | 3 | 1 VIOLATION — `loadChecker` duplicated with divergent error semantics (L2) |

**Rules checked:** 8 of 18 applicable; the other 10 have no surface in a test-only node diff.

### Round 1 Reviewer Assessment (REJECTED — superseded by round 3)

**Verdict:** REJECTED

The dossier is, in the overwhelming majority, excellent and independently verifiable. I
re-derived it against the vendored ROM rather than trusting it, and the arithmetic holds
everywhere I looked: all nine `.BYTE` table lengths, all seven countdown seeds in the radix
the ROM spells, all three in-scope frame gates, the eight sound-raising sites, and every
`lengthSeconds` to the last digit. That work is sound and should survive rework intact.

It is rejected for one substantive reason and one structural one, and they are the same
defect seen from two ends. The story's proudest original finding — POKEY voice 1 is
contended — names three contenders when the machine has four, and states a priority order
that the ROM contradicts. The reason it shipped is that `pokeyVoice`, the field that
encodes exactly this, is never once compared against the ROM. The missing guard and the
wrong ruling are the same hole at two levels, which is the strongest possible evidence
that the guard is load-bearing rather than ceremonial.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | The voice-1 contention ruling omits `bonusLife` and inverts the priority. MEASURED: SOUNDS contains four `STA AUDF1` — :2382 bonus, :2392 scorpion, :2414 flea, :2433 march — all converging on the one `STA AUDC1` at :2435. `bonusLife` is tested FIRST (`LDY CHAN4 / BEQ 48$`, :2373-2374), so while a bonus tone is live the arbitration at 48$ (:2396) is never reached: bonus PREEMPTS all three. The doc says three cues and "Priority runs scorpion, then flea, then march." | `sound.md:133-143`; `sound.fixture.json:4` (voiceArbitration); `claims/16-sound.json` SND-088 | Name all four; state priority bonus > scorpion/flea > march; cite :2373-2374, :2382, :2384 |
| [HIGH] | Same paragraph lists `spiderLoop` among the contenders. It writes AUDF3 (:2349) / AUDC3 (:2351) — voice 3, as the fixture's own `pokeyVoice: 3` records — so it never contends and the "clone sounds fuller" divergence does not apply to it; `bonusLife`, which does contend and which our CHANNELS map also gives its own bucket, is absent. One wrong member and one missing member in the sentence cp6-2 acts on. | `sound.md:145-149` | Correct the set to bonusLife/march/fleaLoop/scorpionLoop |
| [HIGH] | [RULE] `pokeyVoice` is never verified against the ROM. Only `0 <= v <= 3` (:481-482); no test in either new file mentions AUDF/AUDC at all. MEASURED: set `segmentKill.pokeyVoice` 0 → 3 (ROM writes AUDF0/AUDC0 at :2423/:2425) → sound-dossier suite 42/42 PASS. Violates lang-review #15. | `sound-dossier.test.ts:481-482` | Cross-check each cue's `pokeyVoice` against the `STA AUDF<n>`/`AUDC<n>` on its own cited lines — this catches both findings above mechanically |
| [HIGH] | [RULE] `fleaLoop.contImmediate` is an uncited, unguarded transcribed constant. `"0xA4"` with `"contCite": null`; `CENTI4.MAC:2415` (`LDA I,0A4`) is cited NOWHERE — not in the doc, the fixture or the 93 claims — while every other `contImmediate` cue carries a `contCite`. The guard at :737 iterates `tableCues()` (:180-182, `freqTable !== null`), excluding fleaLoop by construction. MEASURED: `"0xA4"` → `"0xFF"` → full centipede suite 1075/1075 PASS. Violates AC-2 and #15. | `sound.fixture.json:286`; guard at `sound-dossier.test.ts:737-767` | Add the `:2415` citation + claim; widen the control-byte sweep to every cue with a `contImmediate`, not only table-backed ones |
| [MEDIUM] | [TEST] The whole `voiceArbitration` block is unswept — absent from the `SoundFixture` interface (:151-157) and from `fixtureCitations()` (:228-246, which walks only `.cues`). Proved: six wrong cites + nonsense prose → 42/42 green. This is why the H1 error had nothing to catch it. | `sound.fixture.json:3-14` | Enrol its `cites` in the AC-2 coverage sweep and re-derive them from the ROM |
| [MEDIUM] | [TEST] Narrative-only claims are tautological. The `must` regex Dev's deviation credits exists only in an unshipped throwaway; `check-citations.mjs` has no `must` field and none appears in the claims. Proved on SND-054: retargeted :2298 → the unrelated :2296 with sound.md's citation moved too → 68/68 green, including the test named "a wrong line number must FAIL here rather than read plausibly." | `claims/16-sound.json`; `tools/audit/check-citations.mjs` | Either commit the generator with its `must` check as a tool the suite invokes, or require each claim's cited line to contain a token from the claim's own prose |
| [MEDIUM] | [SILENT] A malformed linespec is silently dropped. The outer regex accepts `[\d,\-]+` but the per-part loop handles only `N` and `N-M` with no else, so `` `CENTI4.MAC:2463-24-64` `` yields ZERO citations — invisible to the coverage sweep and to the :990 spelling guard, which strips all backticked spans first. | `dossier-sweep.ts:82-86` | Collect unparseable parts and assert the list is empty |
| [MEDIUM] | [SILENT] The citation floor is aggregate, not per-file: `>20` across all three (measured brief 32, glossary 24, sound 69). Only sound.md has its own floor (:945). brief.md or glossary.md could drop to zero and the gate stays green — the exact trap AC-7's own commentary names. | `citations.test.ts:423` | Loop a per-file floor over `DOSSIER_FILES` |
| [MEDIUM] | [DOC] The `:2325-2328` header is cited as saying "seven countdown variables over four POKEY voices". It enumerates four CHANs and names no voices at all; CHAN4/5/6 appear nowhere in it. (Inherited from the epic description, not invented here.) | `sound.md:31-33` | Narrow the claim to what the header says, or cite the CHAN4/5/6 sites for "seven" |
| [MEDIUM] | [DOC] `:1286` and `:1289` are cited for the `;1/4 SECOND BOUNDARY` comment, which is on `:1287` — the "range cuts off the dependent line" defect this story's own setup corrected three times. The fixture gets it right with the `:1286-1289` range. | `sound.md:208` | Cite the range |
| [MEDIUM] | [RULE] Four `as string` casts whose loop filter does not cover the cast field, so a future fixture edit crashes with a raw TypeError instead of failing an assertion. :748 is the same mechanism as the fleaLoop hole above. | `sound-dossier.test.ts:554, 569, 726, 748` | Filter on the field being cast, or assert non-null first |
| [LOW] | [DOC] "Absent on CI, so every block that re-opens a byte is skipped there" is false. MEASURED: `CENTI4.MAC` is tracked in HEAD and `deploy.yml:74` checks out `fetch-depth: 0`, so `vendoredAvailable` is TRUE in CI and those blocks DO run. (When the ROM genuinely is absent: 11 of 42 skip and the suite stays green.) The comment understates the gate — a maintainer trusting it would treat its strongest half as decorative. lang-review #17. | `sound-dossier.test.ts:77` | Delete or correct the sentence |
| [LOW] | [RULE] `loadChecker()`/`CheckClaims` duplicated from `citations.test.ts` with DIFFERENT semantics — the new copy has no try/catch, so a missing checker fails with a raw import trace instead of the self-describing message. lang-review #18 "one concept, two helpers"; this diff created the shared module that should hold it. | `sound-dossier.test.ts:70, 264-267` | Extract into `dossier-sweep.ts` |
| [LOW] | [RULE] Weak anchors (#15, all latent — today's text satisfies them honestly): `/still\s+silent/i` over the whole doc would pass "is centipede still silent? No."; `toContain(ch)` accepts the channel name inside a `;` comment where its seedCite sibling correctly anchors to `ST[AXY]`; `/from '\.\/dossier-sweep'/` is unanchored against the whole file. | `sound-dossier.test.ts:446, 570-571, 937` | Anchor to the declaration |
| [LOW] | [SILENT] The invention sweep is the only loop in the file without an `expectPopulated` floor, against the file's own stated rule at :248-255. Relabel all fourteen cues `rom` and it verifies nothing. | `sound-dossier.test.ts:509-520` | Add the floor |
| [LOW] | [DOC] Dev's own Delivery Finding cites `audio.ts:48,52` for the two wrong manifest comments; they are at `:47` (mushroom) and `:50` (fleaKill) — :48 and :52 are segmentKill and headBottom. The substance is right and I confirmed both; only the anchors are off. Also note both manifest comments use bare-colon refs (`(:2169)`, `(:1994-1995)`) that no gate in this repo can see. | session Delivery Findings; `src/shell/audio.ts:47,50` | Correct the anchors before cp6-2 reads them |

**Verified good — checked against the ROM, not against the dossier's account of itself:**

- [VERIFIED] All nine table lengths recomputed by hand from `CENTI4.MAC:2455-2465`: FREQ0 19, CONT0 19, FREQ1 7, CONT1 7, FREQ2 11, FREQ3 20, CONT3 20, FREQ4 8+9=17, FREQ6 20 — every one equals the fixture's `tableLengthBytes`.
- [VERIFIED] "There is no FREQ5" — `grep FREQ5` over the vendored file returns zero hits. The load-bearing negative is true.
- [VERIFIED] All seven seeds in the ROM's own radix: `:2299` `LDA I,13` hex 19, `:1288` `LDA I,07`, `:2133` `LDA I,0B` 11, `:430` `LDA I,14` hex 20, `:1994` `LDA I,17.` DECIMAL 17, `:1811` `LDA I,13`, `:2024` `LDA I,20.` DECIMAL 20. Seed equals table length in all seven — the radix detector works.
- [VERIFIED] Eight sound-raising sites, enumerated independently: every `ST[AXY] CHAN[0-6]` in the program is 18 lines, of which exactly 8 seed a non-zero value (:431, :1289, :1812, :1882, :1995, :2025, :2134, :2300); the rest zero a channel or reseed in place. One of the eight (`:1882`, RESTOR) has no cue name — Dev's finding is correct.
- [VERIFIED] All three in-scope frame gates and the declined fourth: `:2338-2340` LDA FRAME/LSR/BCC, `:2375-2376` AND I,07, `:2438-2439` AND I,3, and the out-of-scope alarm's `:2367-2368` AND I,04. AC-4 satisfied.
- [VERIFIED] Every `lengthSeconds` recomputed against `FRAME_HZ = 15750/263` (`timebase.ts:20`, confirmed present): 10 of 10 exact to floating-point equality. AC-3 satisfied.
- [VERIFIED] The mushroom invention ruling, including label scoping: `JMP 20$` at `:2169` resolves to `20$:` at `:2303` because `SHOOT:` (`:2102`) is the only global label in between, so the mushroom path really does step over the `:2299-2300` seed. `OBSTAC` (`:1701-1739`) contains zero AUD/CHAN writes; `headBottom`'s `:1310` path likewise. All three inventions are correctly ruled.
- [VERIFIED] AC-5 — `git diff` shows 0 files changed under `plugins/centipede/src/`. The manifest and CHANNELS map are untouched.
- [VERIFIED] AC-6 — no sound baker exists, `deploy-assets` does not name centipede, and `sound.md:6` says the silence plainly.
- [VERIFIED] AC-7's mutation proof (`:963-988`) is real: it calls the exported `uncoveredCitations`/`claimCovers` — the same functions the gate calls — per citation, population-guarded. This is the strongest guard in the diff.
- [VERIFIED] The `citations.test.ts` refactor is non-weakening: same regex, same coverage rule, and the `dossier files exist` check got strictly stronger (it now names the missing file instead of asserting one boolean).
- [VERIFIED] `dossier-sweep.ts:19`'s cross-reference is accurate — `plugins/joust/tests/audit/citations.test.ts:603` is still the `DOSSIER_FILES` const.
- [VERIFIED] [SEC] No path traversal: citation-derived `file` components reach only `basename()` string comparison, never a read path. No `child_process`, no new dependency, no credential, no bucket write, and nothing under `docs/` or `tests/` is reachable from the centipede vite build.
- [VERIFIED] [SIMPLE] (subagent disabled — assessed directly.) The extraction of the sweep into a module is justified rather than over-engineered: AC-7 requires the mutation proof to call the same implementation the gate calls, which is unachievable while the sweep is a closure. No dead code or speculative generality found.
- [VERIFIED] [TYPE] (subagent disabled — assessed directly.) `CueRuling`'s nullable fields carry documented invariants and the XOR checks enforce table-vs-computed and table-vs-immediate. The type design is sound; its weakness is the four casts in M7 where the runtime filter and the cast disagree.
- [VERIFIED] [EDGE] (subagent disabled — assessed directly.) Boundary behaviour traced: an out-of-range line index yields `?? ''` and fails its regex loudly rather than throwing; `readDossier` returns `''` for a missing file, which is caught by the `every enrolled dossier file exists` test for enrolled files — the residual gap is M4, an unenrolled-file drop to zero.

### Devil's Advocate

Argue this is broken. Start with the strongest defence: 1075 tests pass, lint is clean, the
orchestrator suite is green, Dev ran eleven mutations against the real artifacts and caught
all eleven, and I re-derived dozens of ROM facts that all held. So what is left to break?

Exactly the thing that defence cannot see. Dev's eleven mutations were chosen by the person
who wrote the artifacts, and they probe the fields that person was thinking about — radix,
gates, table pointers, invention labels. Not one probes `pokeyVoice`, and not one probes
`contImmediate` on the single cue excluded from the control-byte sweep. A mutation battery
authored alongside the artifact tests the author's model of the artifact, not the artifact.
That is why my two mutations survived: they were chosen adversarially, from the filter
predicates rather than from the ruling. "Eleven of eleven caught" is a statement about the
battery's aim, not the suite's coverage — the same lesson Dev drew when the eleventh needed
a second pass, generalised one level further than Dev took it.

Now the confused reader, who is cp6-2. That story is instructed to consume the fixture as
numbers rather than judgement — the whole point of AC-3. It will read `voiceArbitration`
and learn that three cues contend for voice 1 with the march at the bottom, and it will
read `pokeyVoice: 1` on four cues. Those two statements are inconsistent, both are in the
same file, and nothing reconciles them. The likely outcome is a baker that implements
three-way arbitration, silently drops the bonus tone's real preemption, and treats
`spiderLoop` as contended when it is on a different voice entirely. The ruling was written
to stop cp6-2 fabricating authenticity; on this axis it would hand it a fabrication to
implement, with citations attached. Wrong-with-citations is worse than unruled, because it
is unfalsifiable to the next reader.

The malicious-input framing does not apply here — there is no untrusted input — but the
stressed-filesystem one does. Rename `glossary.md` and the coverage sweep loses 24
citations while the aggregate floor of 20 still passes on the remaining 101; only the
existence check saves it, and only because the file is enrolled. Typo a linespec and the
citation vanishes from three guards at once with no diagnostic anywhere. Neither is
hypothetical enough to block on, but both are the same shape as the defect that did ship:
a check whose population can quietly shrink to nothing while the assertion over it stays
honest and green.

Finally, the claim I most wanted to be wrong and could not make wrong: `check-citations.mjs`
has no `must` field, and no claim carries one. The safeguard the deviation note credits for
making a wrong line number fail at authoring time is not in the repository. I verified the
93 claims genuinely do carry `source.verbatim` and are genuinely byte-re-opened — my first
reading of that was wrong and I corrected it — but byte-equality against a line the
generator itself chose cannot detect that the wrong line was chosen. The subagent proved it
by moving a claim wholesale. So the gate's real guarantee is narrower than the story states,
and nothing in the repo records the difference.

**Handoff:** Back to TEA for RED — the findings are testable. The four High items are two
missing guards (pokeyVoice cross-check, contImmediate coverage for non-table cues) and the
two factual corrections those guards would have forced.
## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/centipede/tests/audit/sound-dossier.test.ts` — modified: +12 tests in three
  new round-2 blocks, plus the control-byte sweep widened and `parseCite` hardened
- `plugins/centipede/tests/audit/dossier-sweep.ts` — modified: one scanner, two views
  (`scanProseCitations` → `extractProseCitations` + `allMalformedCitations`)
- `plugins/centipede/tests/audit/citations.test.ts` — modified: per-file citation floor

**Tests Written:** 12 new (1075 → 1087)
**Status:** RED — 8 failing, 1079 passing. `npm run lint` clean;
`npm run test:orchestrator` 372/372.
**Branch:** none — trunk-based, committed straight to `main` (`7b6785a`).

### What the Reviewer proved, and what it means

Two mutations survived the committed suite. They are the spec for this rework:

| Mutation | Round-1 result |
|----------|----------------|
| `segmentKill.pokeyVoice` 0 → 3, while the ROM writes `AUDF0` at `:2423` | 42/42 GREEN |
| `fleaLoop.contImmediate` `"0xA4"` → `"0xFF"`, uncited entirely | 1075/1075 GREEN |

`pokeyVoice` was the only transcribed field in the fixture with no citation and no
ROM cross-check — range-checked `0..3` and nothing else. The control-byte sweep ran
over `tableCues()`, which filters on `freqTable !== null`, so the one cue whose
frequency the ROM *computes* was excluded from it by construction.

**The two holes and the wrong ruling are the same defect.** `voiceArbitration` says
three cues contend for POKEY voice 1. The ROM has four `STA AUDF1` — `:2382` bonus,
`:2392` scorpion, `:2414` flea, `:2433` march — and this same fixture already marks
four cues `pokeyVoice: 1`. Two statements in one file that cannot both be right, and
nothing compared them, because nothing read `pokeyVoice` against the machine at all.

### The eight RED tests

| # | Test | What it forces |
|---|------|----------------|
| 1 | control byte resolves to a real CONT table or immediate | `fleaLoop` gets a `contCite`; the sweep now runs on all rom cues |
| 2 | every ROM cue cites the register write that puts it on its voice | `voiceCite` on all eleven rom cues |
| 3 | pokeyVoice EQUALS the voice the cited write targets | the value must match the ROM, not the author |
| 4 | voiceArbitration.contenders is EXACTLY the set of cues on voice 1 | recovered from the ROM's `STA AUDF1` lines |
| 5 | every cue marked pokeyVoice 1 is a declared contender | the fixture must stop contradicting itself |
| 6 | the ruling cites the gate that decides the PRIORITY | `:2373-2374`, the CHAN4 preemption |
| 7 | the prose names the same contenders the fixture does | drops `spiderLoop` (voice 3), adds `bonusLife` |
| 8 | every ROM comment quoted is REAL and sits on a cited line | `;1/4 SECOND BOUNDARY` is not in CENTI4.MAC |

Test 8 is worth a sentence. The doc quotes `;1/4 SECOND BOUNDARY` as the machine's
own words. The machine says `;IF NOT 1/4 SECOND BOUNDARY`, at `:1287` — a line the
prose never cites, having cited `:1286` and `:1289` around it. The Reviewer logged
the wrong-line half; the quote is *also* a paraphrase, which is the sharper defect.

### What GREEN has to produce

Three artifacts change; **eleven new claims** are needed, because every citation the
fixture adds must be re-openable by the live gate:

`:1287`, `:2349`, `:2357`, `:2373`, `:2374`, `:2382`, `:2392`, `:2415`, `:2423`,
`:2433`, `:2445` — only `:2414` is already claimed.

The eight `STA AUDF` writes, so nobody has to re-derive them: `:2349` spider,
`:2357` shot, `:2382` bonus, `:2392` scorpion, `:2414` flea, `:2423` explosions,
`:2433` march, `:2445` player explosion.

### Mutation battery — 14 of 14 caught

I did not write these guards and assume them. I built a **throwaway corrected
dossier**, drove all 80 audit tests green on it — proving the RED is satisfiable and
not an impossible contract — then applied one mutation at a time and required a
named test to redden. **The throwaway was deleted; the artifacts are Julia's
deliverable, not mine**, and `git status` carries only the three test files.

Both Reviewer mutations that survived round 1 are now caught (#1, #2). So are:
`voiceCite` re-pointed to another cue's register; `voiceCite` deleted; `bonusLife`
dropped from contenders (the original H1); `spiderLoop` added (the original H2); the
preemption cite removed; `contCite` removed again; the prose re-naming `spiderLoop`;
a quoted ROM comment paraphrased; a real quote attributed to the neighbouring line;
`glossary.md` rewritten into invisibility; and all three inventions relabelled `rom`.

**One needed a second pass, and it repeats this story's own lesson.** My first
malformed-linespec mutant edited `` `CENTI4.MAC:2463-2464` `` — a string that appears
in the *fixture* but nowhere in the prose. It was a no-op, and it "survived" for a
reason that had nothing to do with the guard. Re-run against `` `CENTI4.MAC:2438-2439` ``,
which sound.md really carries, it reddens. Note what failed: **only** the new
malformed-citation test. Losing a citation makes the coverage sweep quieter, not
redder — which is exactly the silent failure the guard exists to catch, demonstrated
rather than asserted.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 every guard mutation-tested | the 14-mutation battery above | all caught |
| #15 vacuous loops — population floors | `expectPopulated` added to the invention sweep, the last loop in the file without one; floors on all four new sweeps | failing (RED) |
| #15 bounds looser than measured | contender floor is 4 — the ROM's `STA AUDF1` count, recovered not chosen | failing (RED) |
| #18 fixture whose value IS the expectation | `pokeyVoice` and `contenders` are both recovered from CENTI4.MAC, never restated | failing (RED) |
| #18 one concept, two helpers | `scanProseCitations` is the single parser; the extractor and the malformed-reporter are two views of it, so they cannot disagree about "well-formed" | passing (pin) |
| #17 comments asserting an unrun mechanism | test 8 mechanises it for the dossier's ROM quotes | failing (RED) |
| #1 type-safety escapes | four `as string` casts deleted; `parseCite` widened to `string \| null \| undefined` and names the field | passing |
| #2 readonly params | `claimCovers`/`coveredBy`/`uncoveredCitations` now take `Readonly`/`readonly` | passing |
| #4 null/undefined | the new filters test `typeof x === 'string'`, not `x !== null` — an absent field is `undefined` and slips straight past a null check, which cost me three raw TypeErrors on the first run | passing |
| #3/#5/#6/#7/#9/#11/#12/#14/#16 | no enums, no JSX, no async, no config, no state machine, no markup in the diff | n/a |

**Rules checked:** 9 of 18 applicable; the other 9 have no surface in a test-only diff.
**Self-check:** no vacuous assertions — every new sweep carries a population floor, and
each guard was individually proved to redden. The one apparent survivor was a broken
mutation, confirmed by grepping for the string I thought I had changed.

**Handoff:** To Dev for implementation
## Review Correlation

Sixteen findings, all from the internal Reviewer — no external reviewer, no CI
failure, no automated tooling in this loop. Seven were closed by the round-2 RED
(the test apparatus), five by the round-2 artifacts, and four are still open and
named as such rather than quietly closed. Two of those twelve — H3 and H4 — were
split across both phases, a guard from TEA and a citation from Dev, which is why
the three groups do not partition cleanly and why the earlier version of this
paragraph said "nine / five / two" and contradicted its own Signal Summary.
Corrected at the Reviewer's [LOW] finding on round 2.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| H1 | reviewer | voice-1 ruling omits `bonusLife`, inverts the priority | NOT_APPLICABLE | — | ROM-fidelity fact, not a language pattern — corrected in fixture + prose |
| H2 | reviewer | same paragraph lists `spiderLoop` (voice 3) | NOT_APPLICABLE | — | Corrected; contenders now recovered from the ROM |
| H3 | reviewer | `pokeyVoice` never verified against the ROM | EXISTING_CHECK | #15 (every guard must be mutation-tested) | Dev missed an existing check; guard added by TEA, `voiceCite` added here |
| H4 | reviewer | `fleaLoop.contImmediate` uncited AND excluded from the sweep by `tableCues()` | NEW_CHECK | — | **Added as check #19** — population filtered by a neighbouring field |
| M1 | reviewer | `voiceArbitration` declared in no interface, walked by no sweep | NEW_CHECK | — | Folded into #19 (second bullet: a sweep that walks one region of a structure) |
| M2 | reviewer | narrative claims tautological; the `must` generator is not in the repo | EXISTING_CHECK | #17 (docs asserting a mechanism nobody re-ran) | **OPEN** — not addressed by round-2 RED; carried below |
| M3 | reviewer | malformed linespec silently dropped | EXISTING_CHECK | #18 (helper reimplementing a parser fails toward green) | Fixed by TEA — `scanProseCitations` reports what it cannot parse |
| M4 | reviewer | citation floor aggregate, not per-file | EXISTING_CHECK | #15 (bounds looser than measured) | Fixed by TEA — per-file floor over `DOSSIER_FILES` |
| M5 | reviewer | `:2325-2328` cited as saying "seven variables over four voices" | EXISTING_CHECK | #17 (universal wording for a case-specific truth) | Fixed here — §1 now cites the header for the four channels it names and the CHAN4/5/6 sites for the rest |
| M6 | reviewer | `:1286`/`:1289` cited for a comment on `:1287` | NOT_APPLICABLE | — | Citation discipline; fixed here, and the quote was a paraphrase besides |
| M7 | reviewer | four `as string` casts the loop filter does not cover | EXISTING_CHECK | #1 (type-safety escapes) | Fixed by TEA — `parseCite` widened, casts deleted |
| L1 | reviewer | "Absent on CI … skipped there" is false — `CENTI4.MAC` is tracked | EXISTING_CHECK | #17 | **OPEN** — comment lives in TEA's test file; verified false again this phase (`git ls-files` finds the ROM) |
| L2 | reviewer | `loadChecker`/`CheckClaims` duplicated with different semantics | EXISTING_CHECK | #18 (one concept, two helpers) | **OPEN** — extraction into `dossier-sweep.ts` is TEA's to make |
| L3 | reviewer | weak anchors (`/still\s+silent/i`, `toContain(ch)`, unanchored import regex) | EXISTING_CHECK | #15 | **OPEN (latent)** — today's text satisfies them honestly |
| L4 | reviewer | invention sweep is the only loop with no population floor | EXISTING_CHECK | #15 | Fixed by TEA — `expectPopulated(…, 3, …)` |
| L5 | reviewer | Dev's own delivery finding cites `audio.ts:48,52` | NOT_APPLICABLE | — | Anchors corrected to `:47`/`:50` in the finding above, with the bare-colon note added |

### Signal Summary
- **External findings: 0** — no external reviewer, PR bot or maintainer in this loop
- **CI findings: 0** — CI has not run this branch; the equivalent local gates
  (`lint`, `test:orchestrator`) are green
- **Internal findings: 16** (4 High, 7 Medium, 5 Low)
- **New checks added: 1** — `#19` in `.pennyfarthing/gates/lang-review/typescript.md`
  (project-local; never `pennyfarthing-dist/`), covering H4 and M1
- **Existing checks missed: 10** — #15 ×4 (H3, M4, L3, L4), #17 ×3 (M2, M5, L1),
  #18 ×2 (M3, L2), #1 ×1 (M7). #15 is now missed repeatedly across cp5-1 and cp6-1;
  worth flagging for promotion to an automated gate, which is what #19's last
  bullet begins to do by naming the mutation the battery must include
- **Still open: 4** — M2, L1, L2, L3, all in the test apparatus rather than the
  artifacts. Round-2 RED did not cover them and writing tests is TEA's phase;
  they are recorded here so the Reviewer sees a decision rather than an omission.
  M2 is the substantive one: the claims gate re-opens a line byte-for-byte but
  cannot tell that the WRONG line was chosen, and nothing in the repo records
  that limit.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/centipede/docs/rom-study/sound.fixture.json` — `voiceCite` on all
  fourteen cues, the flea's missing `contCite`, and the `voiceArbitration` block
  rewritten: `contenders` added, the note re-ruled, the preemption cited
- `plugins/centipede/docs/rom-study/sound.md` — §2.5 re-ruled to four
  contenders with the priority gate; §3.2's paraphrased ROM comment corrected;
  §1's over-reaching header citation narrowed (Reviewer [MEDIUM] M5)
- `plugins/centipede/docs/rom-study/claims/16-sound.json` — 93 → 105 claims
- `.pennyfarthing/gates/lang-review/typescript.md` — new check #19, the class
  behind H4 and M1 (project-local file, not `pennyfarthing-dist/`)

**Tests:** 1087/1087 passing in the centipede project (all 8 RED tests green,
none of the 72 previously-passing tests disturbed). `npm run lint` clean,
`npm run test:orchestrator` 372/372.
**Branch:** none — trunk-based, committed straight to `main` (`2a6fbe7` the
artifacts, `34400ff` the two doc findings + checklist check #19).

### The eight RED tests, and what each one cost in artifact

| # | Test | What GREEN had to change |
|---|------|--------------------------|
| 1 | control byte resolves to a table or immediate | `fleaLoop.contCite: "CENTI4.MAC:2415"` — `LDA I,0A4`, the immediate it had carried uncited |
| 2 | every ROM cue cites its voice write | `voiceCite` on all eleven rom cues |
| 3 | pokeyVoice EQUALS the cited write's voice | nothing — the eleven values were already right; they were simply unchecked |
| 4 | contenders is EXACTLY the voice-1 set | `bonusLife` added, `spiderLoop` removed |
| 5 | every pokeyVoice-1 cue is a contender | the same edit, from the other direction |
| 6 | the ruling cites the PRIORITY gate | `CENTI4.MAC:2373-2374` added to `cites` |
| 7 | the prose names the same contenders | §2.5 rewritten |
| 8 | every quoted ROM comment is REAL and cited | `;1/4 SECOND BOUNDARY` → `;IF NOT 1/4 SECOND BOUNDARY`, cited at `:1287` |

Test 3 is the one worth reading twice. Every `pokeyVoice` in the fixture was
already correct — the field the Reviewer proved was unguarded happened to be
right in all eleven cases. What was wrong was the ruling built on top of it, and
that is the shape of this defect: an uncited field does not have to be false to
do damage, it only has to be unreadable by anything that could contradict it.

### What the ruling now says that it did not

**POKEY voice 1 is contended four ways, not three.** The ROM's four `STA AUDF1`
are `CENTI4.MAC:2382` (bonus), `:2392` (scorpion), `:2414` (flea) and `:2433`
(march), converging on one `STA AUDC1` at `:2435`. `spiderLoop` writes `AUDF3`
at `:2349` and was never in this argument.

**The priority came from the wrong half of the routine.** Naming the writers
says who contends; it does not say who wins. `LDY CHAN4 / BEQ 48$` at
`:2373-2374` branches past the whole arbitration while a bonus tone is running —
on the eighth frame the bonus takes the `AUDF1` write itself, on the other seven
it branches to the player-explosion tail at `:2377`. Order: **bonus > scorpion >
flea > march**, and the scorpion and flea share creature slot 12 so they cannot
both be live. The shipped "priority runs scorpion, flea, march" was the outcome
of a gate the ruling never cited.

**The quote was never the machine's.** The doc attributed `;1/4 SECOND BOUNDARY`
to the ROM. `CENTI4.MAC:1287` reads `;IF NOT 1/4 SECOND BOUNDARY` — a branch
*away* from the seed, not a label on it, so the paraphrase reversed the sense of
the test it quoted. The prose had cited `:1286` and `:1289` around it, which is
why the one line carrying the comment was claimed by nothing.

### Mutation battery — 15 applied to the SHIPPED artifacts, 14 caught

Not a throwaway: every mutation below was written into the committed files, the
audit suite run, the failing test names recorded, and the file restored from a
`cp` backup (never `git checkout` — the deliverable was uncommitted at the time,
so a checkout would have reverted the work rather than the mutation).

| Mutation | Caught by |
|----------|-----------|
| `segmentKill.pokeyVoice` 0 → 3 (Reviewer survivor #1) | pokeyVoice EQUALS the voice the cited write targets |
| `fleaLoop.contImmediate` → `0xFF` (Reviewer survivor #2) | the control byte resolves to a real CONT table or immediate |
| `fleaLoop.contCite` deleted | the same |
| `march.voiceCite` → `:2423` (another voice) | pokeyVoice cross-check **+** contender recovery |
| `fire.voiceCite` deleted | every ROM cue cites the register write |
| `bonusLife` dropped from contenders | contender recovery **+** pokeyVoice-1 membership **+** prose agreement |
| `spiderLoop` added to contenders | the same three |
| `:2373-2374` removed from `cites` | the ruling cites the gate that decides the PRIORITY |
| prose re-names `spiderLoop` | the prose names the same contenders |
| prose stops naming `bonusLife` | the same |
| prose paraphrases the ROM comment again | every ROM comment quoted is REAL |
| prose keeps the quote, drops `:1287` | the same test's *uncited* half |
| claim SND-099 (`:2382`) deleted | 4 tests, incl. the AC-7 mutation proof |
| claim SND-097 drifts `2373` → `2372` | 5 tests, incl. the byte gate |
| **`scorpionLoop.voiceCite` → `:2433`** (march's write, **same voice**) | **SURVIVED** |

The survivor is TEA's own Question, now measured rather than predicted, and it
is filed as a Delivery Finding with the number that makes closing it cheap: the
voice write sits 2-6 lines after each cue's own block anchor, while the mutant
sits 47 away. I did not add the test — writing tests is TEA's phase, and the
round-2 contract is met without it.

### Scope held

AC-5 and AC-6 are untouched by this rework: `SOUNDS` and `CHANNELS` in
`src/shell/audio.ts` are byte-identical to what cp5-1 left, no baker exists, and
`just deploy-assets` still does not name centipede. The diff is three files, all
under `docs/rom-study/`. **centipede is still silent.**

**Handoff:** To Reviewer for code review
### Round 2 Reviewer Assessment (REJECTED — every finding fixed in round 3; superseded)

**Verdict:** REJECTED

The mechanical work is right. I re-derived the voice map from the ROM instead of
reading the fixture's account of it, and every one of the eleven `voiceCite` →
register → `pokeyVoice` triples holds; the contender set is exactly the four
`STA AUDF1` writers; the flea's control byte really is the hex A4 at `:2415`, the
same immediate the bonus and scorpion load; the `;IF NOT 1/4 SECOND BOUNDARY`
correction is real, on `:1287`, and the paraphrase it replaced appears nowhere in
the file (`grep -c` → 0). Twelve claims, all byte-verified. 1087/1087, lint
clean, orchestrator 372/372, all run here rather than taken on report.

It is rejected because the rework introduced two NEW false statements about the
machine while correcting the old ones, and both are in prose that no test can
reach — which is the same failure mode as round 1 one level along. Round 1
shipped a wrong ruling with citations attached. Round 2 ships the right ruling
with a wrong mechanism attached, and the sharper of the two errors DENIES the
ROM's own corroboration of the finding this story exists to make.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | [DOC] §1 now asserts the SOUNDS header "names four channels and no voices at all" and that CHAN4/5/6 are "undocumented". Both are false, and the truth is the story's own best evidence. MEASURED: `CENDE4.MAC:193-199` declares the seven countdown variables, and `CHAN1` there is `;INDEX FOR CENTIPEDE SOUND` — the centipede alone. So the header's `CHAN 1=BONUS, CENTIPEDE, ANT AND SCORPION SOUNDS` (`CENTI4.MAC:2326`) CANNOT be that variable. Read as the POKEY voice it plainly is, the header is COMPLETE (POKEY has four voices, and it stops at three), it is CORRECT, and its CHAN 1 line names exactly the four `STA AUDF1` writers this rework spent two rounds recovering — bonus, centipede, ant, scorpion, four for four. The machine documented the voice-1 contention in 1981 and the dossier now says it documented nothing. Worse, the repo already knew: claim SND-004, committed in round 1, reads `:2326` as "four cues over one POKEY voice". §1 and SND-004 are two statements in one story that cannot both be true. | `sound.md:31-41`; `claims/16-sound.json` SND-105 | Re-read the header as the voice map; cite `CENDE4.MAC:193-199` for the seven variables and `CENTI4.MAC:2326` for the contention it names; reconcile with SND-004 |
| [HIGH] | [DOC] The branch sense is stated BACKWARDS in three artifacts. `42$: LDY CHAN4 / BEQ 48$` (`:2373-2374`) branches **to** `48$` — into the arbitration — when CHAN4 is **zero**; the bonus preempts by NOT branching, falling through into its own block. The doc says `:2374` "branches past the whole of `48$` when it is zero", which is inverted on both halves. The conclusion built on it (bonus > scorpion > flea > march) is correct — I verified it independently — but the sentence a reader would use to CHECK that conclusion says the opposite of the machine. MEASURED: rewriting the sentence to its exact inverse leaves the audit suite 80/80 green, so nothing but review stands between this and the next reader. | `sound.md:148-150`; `sound.fixture.json:10` (voiceArbitration.note); `claims/16-sound.json` SND-098 | State it as the ROM does — CHAN4 zero → into `48$`; CHAN4 non-zero → the bonus block runs and `48$` is skipped |
| [MEDIUM] | [DOC] "While a bonus tone is running, that arbitration is never entered at all" is absolute and false on the last tick: `:2379-2380` `DEY / BEQ 48$` drops into `48$` on the very frame the countdown expires. Same wording in the fixture note and SND-098. lang-review #17, universal wording for a case-specific truth — the check the same phase cited when fixing M5. | `sound.md:150-151`; `sound.fixture.json:10`; SND-098 | Name the exception, or drop "never … at all" |
| [MEDIUM] | [TEST] Five claims now carry a `verbatim` that is not unique in the file — `STA AUDF1` at `:2392`, `:2433` (and pre-existing `:2414`), `STA AUDF0` at `:2423`, `:2445`. The byte gate re-opens the line and compares bytes, so swapping two of these claims' line numbers verifies perfectly. The fixture side has the SAME blind spot on the SAME pairs: repointing `scorpionLoop.voiceCite` to `:2433` is the one survivor of Dev's own 15-mutation battery. So a coordinated swap is invisible on both sides at once. This is open finding M2 instantiated by this diff rather than a new class. | `claims/16-sound.json` SND-100/103, SND-102/104; `sound.fixture.json` voiceCite | Dev's measured anchor rule (`voiceCite` within 0-8 lines of the cue's `channelCite`/`computedCite`; measured 2-6, mutant 47) closes the fixture half — it is cheap and it is already specified |
| [LOW] | [DOC] "The ROM writes `AUDF1` in exactly four places … and they are four different cues" — `:2382` is label `44$`, and the declined 15-second alarm jumps there too (`:2370-2371`, `LDA I,10 / BNE 44$`). That write site serves a fifth claimant. §4 declines the alarm but never says it takes voice 1. | `sound.md:139-143`; `sound.md:267-274` (§4) | Note the shared label, or say "four write sites" |
| [LOW] | [DOC] SND-105 carries the [HIGH] misreading: "one of the three channels the SOUNDS header comment never mentions. The header names CHAN0 through CHAN3 only". | `claims/16-sound.json` SND-105 | Rewrite with §1 |
| [LOW] | [DOC] The Review Correlation summary contradicts itself twice: the intro says "two are still open" where the Signal Summary says "Still open: 4"; "Existing checks missed: 8" against its own tally of #15×4 + #17×3 + #18×2 + #1×1 = 10. The partition "nine test apparatus / five artifacts / two open" does not add to 16 with four open and two findings split across both phases. It is the institutional record for this loop, so the arithmetic matters. | session `## Review Correlation` | Recount |

**Verified good — checked against the ROM and against the running suite, not against the diff's account of itself:**

- [VERIFIED] All four `STA AUDF1` recovered independently by scanning `SOUNDS` (`:2322-2451`): `:2382`, `:2392`, `:2414`, `:2433`, converging on the single `STA AUDC1` at `:2435`. Traced each path to `50$` by hand — bonus `:2383-2384`, scorpion `:2393-2394`, flea `:2415-2416`, march falls through `:2434`.
- [VERIFIED] Every `voiceCite` → register → `pokeyVoice` triple: `fire` `:2357` AUDF2 v2; the four kills `:2423` AUDF0 v0; `playerDeath` `:2445` AUDF0 v0; `bonusLife` `:2382` v1; `march` `:2433` v1; `spiderLoop` `:2349` AUDF3 v3; `fleaLoop` `:2414` v1; `scorpionLoop` `:2392` v1. Eleven for eleven, and `:2349` really is the only `STA AUDF3` in the routine, as SND-095 claims.
- [VERIFIED] `contenders` = {bonusLife, fleaLoop, march, scorpionLoop} matches both the ROM and the fixture's own `pokeyVoice` fields — the round-1 contradiction is genuinely closed, in both directions.
- [VERIFIED] The `:1287` correction. `;IF NOT 1/4 SECOND BOUNDARY` is at `:1287`; `grep -c ";1/4 SECOND BOUNDARY"` over the vendored file returns **0**, so the round-1 quote was an invention and not a mis-anchor. The mask `:1286` and the seed `:1288-1289` are cited alongside it.
- [VERIFIED] `fleaLoop.contCite` `:2415` is `LDA I,0A4` = hex A4 = 164 = the fixture's `"0xA4"`, and it is the same immediate loaded at `:2383` (bonus) and `:2393` (scorpion), exactly as SND-101 says.
- [VERIFIED] §1's three new channel citations are the right reads: `:2373` `LDY CHAN4`, `:2436` `53$: LDY CHAN5`, `:2386` `45$: LDY CHAN6`. (The prose ABOUT them is the [HIGH] above; the anchors themselves are correct.)
- [VERIFIED] Twelve new claims byte-verify — the suite's own checker runs them, and I re-read the raw bytes of `:1287`, `:2373`, `:2374`, `:2415`, `:2436` independently.
- [VERIFIED] AC-5 — `git diff 7b6785a..HEAD -- plugins/centipede/src/` is EMPTY. The manifest and CHANNELS map are untouched by the rework.
- [VERIFIED] AC-6 — no baker under `plugins/centipede/tools/` (only `audit/` and `pictures-bake/`), `deploy-assets` still does not name centipede, and `sound.md:6` still says the silence plainly.
- [VERIFIED] The suite, run here: centipede 1087/1087 (audit 80/80), `tsc --noEmit` clean, `test:orchestrator` 372/372.
- [VERIFIED] Checklist #19 landed in the project-local `.pennyfarthing/gates/lang-review/typescript.md` (NOT `pennyfarthing-dist/`), carries cp6-1 provenance in the file's own format, and all four "18 checks"/"#14-#18" references were renumbered. The check itself is well-aimed: it names the population-filter class that produced H4 and M1.
- [VERIFIED] [SEC] Nothing security-relevant in the diff: three data/prose files, one gate checklist, one sprint YAML, one sidecar. No code path, no dependency, no credential, no network or bucket write, and nothing under `docs/` reaches the centipede vite build.
- [VERIFIED] [SIMPLE] No over-engineering. The fixture gained one field and one array; the claims gained twelve entries; no helper, no abstraction, no dead code.
- [VERIFIED] [TYPE] `voiceCite: string | null` matches the eight sibling `*Cite` fields and is enumerated in `fixtureCitations()`, so it is under the AC-2 coverage sweep rather than sitting as unwatched JSON. Inventions carry `null`, consistent with their other cite fields.
- [VERIFIED] [SILENT] No swallowed failure introduced. The one silent-degradation surface in the diff is the claims gate's inability to see a wrong-but-byte-identical line, which is [MEDIUM] above and is reported rather than hidden.
- [VERIFIED] Dev reported the surviving mutation instead of burying it, and reported the four findings the round-2 RED did not cover instead of marking them closed. That is the behaviour this pipeline needs; it is why this review could start from the gaps rather than hunting for them.

### Subagent Results — round 2

The session's user-level instruction for this run forbids spawning Agent-tool
subagents, so none were spawned. That is a session policy, not a subagent
failure, and it does not license a thinner review: every dimension below was
assessed directly, with the evidence recorded in the VERIFIED list above rather
than asserted.

| # | Subagent | Status | Enabled? | Findings | Note |
|---|----------|--------|----------|----------|------|
| 1 | reviewer-preflight | Not run | true | — | Replaced by running the suite, lint and orchestrator here; results quoted above |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Not run | true | 1 | Assessed directly → [MEDIUM] non-unique `verbatim` |
| 4 | reviewer-test-analyzer | Not run | true | 1 | Assessed directly → the prose-inversion mutation (80/80 green) |
| 5 | reviewer-comment-analyzer | Not run | true | 4 | Assessed directly → the two [HIGH]s and two [LOW] doc items |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Not run | true | 0 | Assessed directly → [SEC] VERIFIED above |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Not run | true | 2 | Assessed directly against the 19-check list → #17 ×2 (the absolute wording, the header misreading) |

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)

No `.ts` changed in this phase, so the checklist applies to the artifacts by
analogy — which is how #15 and #18 were applied to this dossier all along.

| Check | Status | Evidence |
|-------|--------|----------|
| #15 guard mutation-tested | pass | 15 mutations on the shipped files, 14 caught with named tests; the survivor is reported, not hidden |
| #17 comments asserting an unrun mechanism | **FAIL** | Two [HIGH]s and one [MEDIUM] are exactly this: statements about the machine that were reasoned out rather than re-read. The header misreading contradicts a claim in the same story |
| #18 apparatus fails by PASSING | pass (with a caveat) | The new guards do bite — proved — but the claims gate cannot see a wrong line whose bytes match, which is [MEDIUM] |
| #19 population filtered by a neighbouring field | pass | Added this phase; the sweep that produced it now runs over `romCues()` and `fixtureCitations()` walks both regions |
| #1 type-safety escapes | pass | No casts added; `voiceCite` is a declared nullable field |
| #2-#14, #16 | n/a | No TypeScript, JSX, async, enum, config or state-machine surface in the diff |

### Devil's Advocate

Argue this should be approved. The strongest case: the ruling is now CORRECT.
Four contenders, verified; the priority order, verified; eleven `pokeyVoice`
values, verified against their own register writes; a fabricated quote replaced
with the machine's real words; twelve claims that byte-open; 1087 tests, lint and
the orchestrator suite all green; and a mutation battery that reports its own
survivor. Everything cp6-2 CONSUMES — `contenders`, `pokeyVoice`, `voiceCite`,
the tables, the lengths — is right. The defects are sentences.

That is the argument, and it is why this is a rejection rather than a rewrite.
The deliverable of this story is not a JSON file, it is a RULING — the story
exists because prose that reads authentic and is not is the exact thing cp6-2
would implement. A dossier whose fixture is right and whose explanation is
inverted teaches the next reader the wrong machine, and it teaches it with
citations, which is the failure the round-1 review named in its own last
paragraph: wrong-with-citations is worse than unruled.

And the header misreading is worse than a slip. The story's central finding is
that four cues share POKEY voice 1. The machine states that finding, in a
comment, at `:2326` — and this diff added a paragraph asserting that the comment
states nothing of the kind, in the same file whose claim SND-004 reads it
correctly. A reader reconciling those two lands on the wrong one about half the
time. The irony is instructive rather than cosmetic: this story rejected round 1
for stating something the machine contradicts, then did it again, in the section
added to fix a finding about over-reading that very comment. The lesson is the
one the round-1 devil's advocate drew and this round proves in the other
direction: a correction chosen from the previous reviewer's framing inherits the
previous reviewer's error. M5 said the header "names no voices at all". It was
wrong, I wrote it, and GREEN hardened it into prose.

What I could not break: the numbers. I tried the seed radices, the table lengths,
the gate masks, the four writers, the single `AUDC1`, the flea's immediate and
every new claim's bytes. They hold. The rework's substance is sound and should
survive intact — three sentences and two claims are what need re-reading.

**Handoff:** Back to TEA for RED. Two of the seven are mechanisable and worth
tests: the header reading can be pinned by requiring §1 to cite
`CENDE4.MAC:193-199` for the seven variables (the declaration that PROVES the
header is not the variable list), and the non-unique-`verbatim` gap closes with
Dev's measured anchor rule. The rest are prose corrections that only a reader can
make — which is the honest limit of this suite, and worth saying in the doc
rather than discovering again next round.
## Dev Assessment (round 3)

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/centipede/docs/rom-study/sound.md` — §1 re-ruled (the header is a
  voice map), §2.5's branch sense corrected and its absolute qualified, §2.5/§4
  record the shared `44$`
- `plugins/centipede/docs/rom-study/sound.fixture.json` — `voiceArbitration.note`
  rewritten to match; `CENDE4.MAC:194`, `CENTI4.MAC:2326` and
  `CENTI4.MAC:2379-2380` added to its `cites`
- `plugins/centipede/docs/rom-study/claims/16-sound.json` — 105 → 108; SND-098
  and SND-105 rewritten (both carried the errors)

**Tests:** centipede 1087/1087 (audit 80/80), `npm run lint` clean.
`npm run test:orchestrator` **389/390 — one failure that is not ours**, proved
below and filed as a Delivery Finding.
**Branch:** none — trunk-based, committed straight to `main` (`1cc4990`).

### The two Highs, and which one matters

**[HIGH] The header the machine got right.** The Reviewer was correct and the
finding is better than a correction: `CENDE4.MAC:194` declares
`CHAN1:	.BLKB 1			;INDEX FOR CENTIPEDE SOUND` — the centipede alone — while the
SOUNDS header's CHAN 1 line reads BONUS, CENTIPEDE, ANT AND SCORPION SOUNDS.
Four cues cannot be one one-byte index, so the header enumerates POKEY **voices**,
and read that way it is exact and COMPLETE: POKEY has four, the header names
four, and its CHAN 1 line lists precisely the four cues §2.5 recovers from the
four `STA AUDF1`. The machine documented this story's central finding in 1981.
Claim SND-004 said so in round 1; the prose contradicted it; §1 now agrees, and
cites `CENDE4.MAC:193-199` for the seven variables plus `CENDE4.MAC:121`
(`NCHAN	=6			;NUMBER OF SOUNDS (SEE CHAN0 THRU CHAN 6)`) for the count.

Worth naming the mechanism, because it is the round's lesson: I wrote that
paragraph implementing round 1's M5 finding, which said the header "names no
voices at all". M5 was half right — the header does not say "seven variables" —
and I inherited its other half without re-opening the file. **A correction
adopted from a reviewer's framing carries that reviewer's error.**

**[HIGH] The branch ran the other way.** `BEQ 48$` at `CENTI4.MAC:2374` is taken
when `CHAN4` is **zero**, and `48$` IS the arbitration — so a zero countdown
means the arbitration runs. The bonus wins by NOT branching. Three artifacts said
it "branches past the whole of `48$` when it is zero", inverted on both halves.
The conclusion (bonus > scorpion > flea > march) was right and independently
correct; the sentence a reader would check it with was backwards.

Mediums and Lows, all fixed: the "never entered at all" absolute is false on the
expiry tick (`CENTI4.MAC:2379-2380`, `DEY / BEQ 48$`, new claim SND-108); `:2382`
is label `44$`, which the declined 15-second alarm also jumps to (`:2369`,
`:2371`), so it serves a fifth claimant — and it would enter **above** the bonus,
since its own test runs first (§2.5 and §4 both say so now); SND-105 rewritten;
the Review Correlation recount done (10 existing-check misses, not 8; the
"nine/five/two" partition corrected to seven/five/four with the two split
findings named).

**The one Medium I did not close:** non-unique claim `verbatim`. It is a test
change and tests are TEA's phase. Dev's measured anchor rule still stands as the
cheapest fix, and the Reviewer agreed: `voiceCite` within 0-8 lines of the cue's
own `channelCite`/`computedCite` (measured 2-6; the surviving mutant sits 47).

### Mutation battery — 8 applied, 4 caught, and the survivors are the finding

| Mutation | Result |
|----------|--------|
| SND-107 deleted (the `CENDE4.MAC:194` proof) | CAUGHT — 4 tests |
| SND-108 deleted (the expiry-tick cite) | CAUGHT — 4 tests |
| SND-106 repointed `CENDE4.MAC:121` → `:122` | CAUGHT — 5 tests, incl. the byte gate |
| SND-107 repointed `:194` → `:195` (CHAN2) | CAUGHT — 6 tests |
| prose drops the `CENDE4.MAC:193-199` citation | survived — losing a citation is quieter, not redder (the known shape) |
| fixture drops `CENDE4.MAC:194` from `cites` | survived — same shape |
| prose re-inverts the branch sense | survived — English; this is exactly what the Reviewer measured, and why this round exists |
| **prose FABRICATES a CENDE4 quote** | **survived — new, and filed** |

That last one earns its place. The ROM-comment guard resolves every quote against
**CENTI4.MAC only** and matches only backticked strings starting with `;`. So
rewriting the CHAN1 declaration's comment to `;INDEX FOR SHOT SOUND` leaves the
suite 80/80 green — and, measured the other way, a TRUE CENDE4 quote written in
the guard's own `;`-form is REJECTED as fabricated ("appear nowhere in
CENTI4.MAC"). Honest quote, wrong verdict. I quoted whole declaration lines so
the text is complete and faithful, but that is a workaround for the guard's
shape, not verification, and I have said so rather than let the shape read as
coverage.

### The orchestrator failure is not ours, and here is the proof

`npm run test:orchestrator` is 389/390. A `git pull --rebase --autostash` ran in
this checkout at 18:15, mid-phase and not by me; it replayed all eight cp6-1
commits cleanly onto upstream `sc1-1` work and brought 18 new orchestrator tests
with it. One fails: `tests/sprint-repo-routing.test.mjs:534`.

It fails **identically on pristine `origin/main`**, checked out detached into a
scratch worktree with none of this story's commits present — so it is not a
regression from this diff, and I did not take that on report. Cause: the test
hardcodes `context-epic-jt8.md` as its non-vacuity example ("jt8 has 4 open
stories at the time of writing"), and every jt8 story is now `done`, so the epic
correctly dropped out of the guard's live scope. It belongs to mg1-4. Filed as a
blocking-for-the-sprint Delivery Finding, with the note that pinning a different
open epic only moves the expiry date.

### Scope held

AC-5 and AC-6 untouched again: `git diff` shows nothing under
`plugins/centipede/src/`, no baker exists, `deploy-assets` still does not name
centipede. **centipede is still silent.**

**Handoff:** To Reviewer for code review
## Subagent Results

Six of nine specialists are enabled on this project (`pf settings get
workflow.reviewer_subagents`); all six were dispatched and all six returned. The
three disabled rows are pre-filled as the gate allows, and each names who covered
its domain instead — a disabled row is not coverage.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 | confirmed 0, dismissed 1 — its numbers are right (1087/1087, lint 0, orchestrator 390/390 on BOTH this tree and pristine `origin/main`) but its headline "Dev's orchestrator claim is factually incorrect" is **wrong and I retract it**: it read the Dev Assessment's 389/390 and never read the Delivery Finding directly below, which already records the fix (`4172a95`) and the 390/390 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (`edge_hunter: false`) — covered by Reviewer: the ROM-side boundary work is F1 (the `:2437` preemption edge, traced by hand through `52$`'s single referent and the `:2416 BNE 50$ ;ALWAYS` fall-through block) and the expiry-tick edge at `:2379-2380`, both re-derived from the vendored source |
| 3 | reviewer-silent-failure-hunter | Yes | findings | 2 | confirmed 2 → F3 (the ROM-comment guard's CENTI4-only population, mutation-proved in BOTH directions with live red/green output) and F7-adjacent `DOSSIER_FILES` note, verified to have dropped nothing today |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3 — re-ran all 8 of Dev's mutation rows independently in an isolated worktree and confirmed every one; then proved F2 three ways (SND-100↔103 swap, SND-102↔104 swap, `scorpionLoop.voiceCite`→`:2433`, all 1087/1087 green) and measured that round 3's two headline prose fixes can BOTH be reverted green |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 → F6 (`:2377` uncited). Its main result is a null one and it is load-bearing: it independently falsified every falsifiable claim in the round-3 delta and found none false, plus counts, arithmetic and an invisible-character sweep all clean |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (`type_design: false`) — covered by Reviewer: the only type surface is the fixture's `voiceArbitration` shape; I confirmed it is declared in the interface and walked by `fixtureCitations()`, which is what round 1 flagged and round 2 fixed. Round 3 adds no field, only three array entries |
| 7 | reviewer-security | Yes | clean | 0 | N/A — and it PROVED the null rather than inferring it from file extensions: built `dist/centipede` and grepped it for `rom-study`/`SND-0`/`CENTI4` (no hits), confirmed zero touches to `src/`, `.github/`, `justfile`, `scripts/`, and re-checked the `vendoredRoot` options-bag against the `injected-seam-fails-open-to-prod` pattern |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (`simplifier: false`) — covered by Reviewer: round 3 adds three claims, three cite entries and rewrites two claim bodies. No helper, no abstraction, no dead code; the diff is 88 insertions across three data/prose files |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 3 (F4, F5, and a depth note folded into F2's family), dismissed 0, deferred 1 (`claimCovers` range granularity — verified to produce no live inaccuracy). Its sweep of every citation FILE/LINE/EXTENT in the delta returned a clean null, and F4 is the sharpest single finding of the round |

**All received:** Yes (6 enabled dispatched, 6 returned; 3 disabled pre-filled with the Reviewer coverage that replaced each — accounted for exhaustively, nothing outstanding)

**Total findings:** 7 confirmed, 1 dismissed (with rationale), 1 deferred

## Reviewer Assessment

**Verdict:** APPROVED (round 3)

**The bar this story has been held to, and it now clears it.** Rounds 1 and 2 were
both rejected for the same thing: the dossier told its reader something false about
the machine. Round 1 shipped a wrong ruling with citations attached; round 2 shipped
the right ruling with a wrong mechanism attached. **Round 3's dossier does not state
anything false about the machine** — and that is not my reading alone. Three
independent passes (mine from the vendored source, reviewer-comment-analyzer, and
reviewer-rule-checker's FILE/LINE/EXTENT sweep) each tried to falsify every
falsifiable claim in the delta, and each returned a clean null.

Both [HIGH]s are genuinely fixed, and I re-derived both from the ROM rather than
reading the diff's account of itself:

- **The header is a voice map, and the ruling is now RIGHT.** I tested it the way a
  ruling should be tested — against its alternative. Under the voice reading all four
  header lines hold exactly: voice 2 has one `STA AUDF2` (`:2357`, the shot), voice 3
  one `STA AUDF3` (`:2349`, the spider), voice 1 exactly four (`:2382`, `:2392`,
  `:2414`, `:2433`) matching BONUS/CENTIPEDE/ANT/SCORPION one-for-one, and voice 0 two
  (`:2423`, `:2445`) which is why that line says ALL EXPLOSIONS. Under the variable
  reading it fails on two lines, not one. The story argues it from CHAN1 alone and is
  correct to; it is stronger than it knows, which is finding F7.
- **The branch sense is now stated as the machine runs it**, in all three artifacts
  round 2 named. `:2374 BEQ 48$ ;IF NO BONUS SOUND` is taken when CHAN4 is zero and
  `48$` is `:2396`, the arbitration — so the bonus wins by NOT branching. Confirmed
  independently by rule-checker.

Both [MEDIUM]s and all three [LOW]s from round 2 are closed except the one Dev
declined and said so: the Review Correlation recount now closes in both directions
(7+5+4=16; #15x4+#17x3+#18x2+#1x1=10), SND-105 is rewritten, and the shared `44$`
label is recorded in §2.5 **and** §4 with the alarm's two exits (`:2369`, `:2371`)
cited correctly — round 2's own `:2370-2371` was the looser pair.

Nothing here is a Critical or a High. What follows is real, and routed.

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] [DOC] | **F1 — voice 0 is contended and the ruling never says so.** `BEQ 52$ ;IF NO PLAYER EXPLOSION` (`:2437`) is the voice-0 twin of `BEQ 48$ ;IF NO BONUS SOUND` (`:2374`). `52$` has exactly one referent and `:2416 BNE 50$ ;ALWAYS` blocks fall-through, so playerDeath preempts all four kill cues outright. Our shell splits them (`'impact'` vs `'alert'`), so the clone rings both where the cabinet rings one | `sound.fixture.json` `voiceArbitration`; `sound.md` §2.5 | Delivery Finding, **blocking for cp6-2** |
| [MEDIUM] [TEST] [RULE] | **F2 — non-unique `verbatim` (round 2's open M2), now measured rather than argued.** test-analyzer swapped SND-100↔SND-103 and SND-102↔SND-104 line numbers and repointed `scorpionLoop.voiceCite` to the march's site: 1087/1087 green all three times. Round 2's own `pokeyVoice` guard checks the register the cited line writes, never that it is *that cue's* write | `claims/16-sound.json`; `sound.fixture.json` | Open, routed to TEA. Not held against round 3 — see the deviation audit |
| [MEDIUM] [SILENT] [RULE] | **F3 — the ROM-comment guard's population excludes CENDE4.MAC**, the file this story started citing. Proved both ways: a fabricated CENDE4 quote passes 80/80, a TRUE CENDE4 quote in `;`-form is rejected as fabricated. Check #19, whose own origin is this story's H4/M1 | `tests/audit/sound-dossier.test.ts:86-89`, `:1348` | Disclosed by Dev, bounded (the real gate is file-agnostic), no shipped quote affected. Routed |
| [MEDIUM] [DOC] [RULE] | **F4 — a FOURTH artifact still inverts the branch sense**: assertion label `'CENTI4.MAC:2374 should branch past the arbitration'`. Round 2 named three and round 3 fixed three; this survived because the diff is doc-only | `tests/audit/sound-dossier.test.ts:1246` | Routed. The assertion and its block comment are both correct; only the failure message inverts |
| [LOW] [DOC] | **F5 — SND-098 says the expiry tick is "two lines below"**; it is at `:2379-2380`, five and six below the cited `:2374`. `sound.md:175` gets it right | `claims/16-sound.json` SND-098 | Routed |
| [LOW] [DOC] | **F6 — `:2377` is leaned on by the note but absent from `cites`** | `sound.fixture.json` | Routed (pre-existing) |
| [LOW] [DOC] | **F7 — §1 under-reads its own best second proof.** "The remaining three variables are missing from that header" and SND-105's "absence" are true of the *variables* and steer away from the fact that all three cues ARE in the header | `sound.md` §1; SND-105 | Routed with F1 |

**Verified good — checked against the ROM and the running suite, not against the diff's account of itself:**

- [VERIFIED] Every citation in the round-3 delta, FILE/LINE/EXTENT. I read both ROM files with universal newlines (`newline=None`, `latin-1`) per the cp2-16 lesson, and probed the line on each side of every range: `CENDE4.MAC:193-199` is bounded by `BONUSM` (192) and `TB:` (200) — the seven CHAN declarations exactly; `:2379-2380` bounded by `DEC CHAN4` and `LDA Y,FREQ4-1`; `:2373-2374`, `:2325-2328`, `:2375-2376`, `:2438-2439` all exact. **No over- or under-reach anywhere**, independently confirmed by rule-checker.
- [VERIFIED] The two new CENDE4 claims byte-open: `:194` is the CHAN1 declaration commented `;INDEX FOR CENTIPEDE SOUND`, `:121` is `NCHAN =6 ;NUMBER OF SOUNDS (SEE CHAN0 THRU CHAN 6)`. The claims gate resolves them because `resolveInTree()` (`tools/audit/check-citations.mjs:88-102`) keys on the claim's own `file` field with no CENTI4 hardcoding — so the round's new file is genuinely gated, not merely cited. `check-citations.mjs` → **481/481 verified**.
- [VERIFIED] `claims/16-sound.json` holds exactly **108** entries, SND-001..SND-108 contiguous, zero duplicate ids, zero gaps — 105→108 matches the commit message.
- [VERIFIED] The AUDF/AUDC census, swept over the WHOLE file rather than the section: `STA AUDF1` appears in exactly four places and `STA AUDC1` in exactly one (`:2435`), so "exactly four, converging on one" is literally true and not a section-scoped approximation.
- [VERIFIED] The radix trap navigated correctly in both directions — `LDY I,20.` (`:2389`) is DECIMAL 20 and the fixture records `lengthFrames: 20`; `LDA I,0A4` (`:2393`, `:2415`) is HEX A4 and the fixture records `"0xA4"`.
- [VERIFIED] Zero bare-colon citations in `sound.md` — every reference spells `CENTI4.MAC:` or `CENDE4.MAC:`, so none can evade the gate per the `bare-colon-citations-evade-gates` lesson.
- [VERIFIED] AC-1 — fourteen cues, each with an origin, note and voice. AC-3/AC-4 — `playerDeath` gates on `AND I,3` (`frameGate: 4`, cited `:2438-2439`), `bonusLife` on `AND I,07` (gate 8, `:2375-2376`), `spiderLoop` on the LSR (gate 2): non-uniform, per cue, as AC-4 demands.
- [VERIFIED] AC-5/AC-6 — `git diff bea395b..HEAD -- plugins/centipede/src/` is EMPTY, no baker, `deploy-assets` still does not name centipede. **centipede is still silent.**
- [VERIFIED] [SEC] Nothing security-relevant, and security PROVED it rather than inferring it: `dist/centipede` built and grepped clean of `rom-study`/`SND-0`/`CENTI4`, no workflow/justfile/script/bucket touched, claim `file` fields are bare filenames with `resolveInTree` containment above them.
- [VERIFIED] [SIMPLE] No over-engineering: three claims, three cite entries, two rewritten claim bodies. No helper, no abstraction, no dead code.
- [VERIFIED] [TYPE] `voiceArbitration` is declared in the interface and walked by `fixtureCitations()` — round 1's flag is closed, and round 3's three new cites ride the same sweep (rule-checker re-ran it, 53/53).
- [VERIFIED] [EDGE] The expiry-tick edge is real and now recorded: `:2379-2380 DEY / BEQ 48$` drops into the arbitration on the frame the tone ends, which is why round 2's "never entered at all" was false. SND-108 pins it.
- [VERIFIED] Suite re-run by me serially, after every mutation worktree was removed and `git status` was clean: centipede **1087/1087**, `tsc --noEmit` clean, `test:orchestrator` **390/390** (fail 0), measured 19:08.
- [VERIFIED] No sibling checkout merged cp6-1 — `git log HEAD..origin/main` carries only sc1-1 and jt9-1 work, so this is not a superseded round.
- [RETRACTED] My preflight's claim that Dev's orchestrator report was "factually incorrect" is wrong, and Dev is owed the correction: the 389/390 was accurate when measured at 18:20, the fix landed at 18:26 in `4172a95`, and **Dev had already appended the resolution and the 390/390 to their own Delivery Finding before I ever read it.** The specialist read the assessment and not the finding four lines below.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)

No `.ts` changed in round 3, so the checklist applies to the artifacts by analogy, as
it has since round 1. Checks #2-#14 and #16 are n/a — no TypeScript, JSX, async, enum,
config or state-machine surface in a three-file JSON/Markdown diff.

| Check | Status | Evidence |
|-------|--------|----------|
| #1 type-safety escapes | pass | No casts, no `any`, no `@ts-` directive added; `tsc --noEmit` clean |
| #13 fix-introduced regressions | **FAIL** | F4 — the fix closed the three named instances of the inverted branch sense and a fourth survived in `sound-dossier.test.ts:1246`. This is the check's exact shape: a fix that touched three places and missed a fourth of the same class |
| #15 guard mutation-tested | pass (with a measured limit) | 8 mutations applied, 4 caught, 4 survivors reported not buried; test-analyzer re-ran all 8 independently and confirmed each. The limit is stated honestly rather than discovered: the dossier's CITATIONS are byte-verified, its CONCLUSIONS are not — both headline prose fixes revert green |
| #17 comments asserting an unrun mechanism | pass for the dossier, **FAIL** for F4/F5 | The two round-2 [HIGH]s are why this check failed last round; three independent passes found no false statement in round 3's dossier. F4 (a backwards failure message) and F5 ("two lines below" for five) are the surviving instances, both outside the ruling |
| #18 apparatus fails by PASSING | **FAIL** (open, carried) | F2 — the byte gate compares text that is identical at two lines, so a coordinated swap verifies perfectly. Proved three ways this round rather than reasoned |
| #19 population filtered by a neighbouring field | **FAIL** on F3, pass on `voiceArbitration` | F3 is textbook #19: the guard's implicit population is "quotes resolvable in CENTI4.MAC", excluding CENDE4.MAC by construction, and the excluded case was mutation-proved in both directions. The `voiceArbitration` half that ORIGINATED #19 is now compliant — enrolled and swept |

### Devil's Advocate

Argue this should be rejected a third time, because the case is not weak. The story's
own charter is that prose which reads authentic and is not is the thing cp6-2 would
implement, and after a round convened specifically to stop stating one branch
backwards, a fourth artifact still states it backwards — in a failure message, which
is read at precisely the moment a human is reasoning about that branch. A reviewer who
named "three artifacts" and did not grep the test files handed Dev an incomplete
finding, and the incompleteness is now visible. Worse, F1 says the ruling missed an
entire second voice contention that the machine spells out in the same instruction
shape one screen down, using evidence the fixture already contains. A dossier whose job
is "what the ROM actually sounds like", which enumerates voice contention as its
centrepiece and finds one of the two, is incomplete on its own terms. And F2 has now
been open across three rounds while the artifact it protects grew by fifteen claims.

Here is why that argument loses. Every one of those items is either outside the
document cp6-2 consumes, or an omission rather than a falsehood — and this story has
been rejected twice on a precise standard: the dossier told its reader something false.
Three independent readers, working from the vendored source rather than from each
other, could not find a false statement in it this time. F4 is a test's failure message
whose assertion and comment are both correct. F5 is a distance, in a claim whose sense
is right. F1 and F7 are things the ruling does not say, not things it says wrongly, and
the `voiceArbitration` record is itself an acknowledged beyond-AC addition — Dev logged
it as a deviation because the schema never asked for it. All seven ACs are met and I
verified each.

The decisive point is what a fourth round would actually produce. This review measured
that the dossier's conclusions are unguarded English: both of round 3's headline fixes
revert to their wrong forms with 1087/1087 still green. A fourth round would therefore
add more prose that no test can hold, verified only by another careful reading — the one
I have just done. F1's value is not realised as a paragraph; it is realised in cp6-2,
where `playerDeath` on `'alert'` beside the kills on `'impact'` becomes a channel
decision a test can finally pin. Routing it there as blocking is strictly stronger than
another sentence here. And F2 is open because a pf routing defect sent a rejection to
`finish` and then to `green`, so TEA never ran; blocking Dev for declining to write
TEA's tests from the GREEN phase would punish exactly the honesty this pipeline needs.

What I could not break: the numbers, again, and harder than last round. I swept the
whole file for `STA AUD*` rather than the section, probed both sides of every cited
range, tested the voice map against its alternative, and re-checked the radix in both
directions. They hold.

**Handoff:** To SM (Ruby Rhod) for finish-story. F1 is filed **blocking for cp6-2** so
the baker cannot wire voice 0 in ignorance; F2 routes to TEA; F3, F4, F5, F6 and F7 are
non-blocking and named with their fixes. Note for the finish: `sprint/epic-cp6.yaml`'s
`review_findings` still carries round 2's REJECTED narrative and needs replacing with
this verdict, and its embedded `sound.md:148-150` anchor is stale now that the file grew
289→318 lines.
## Impact Summary

**Blocking: 0.** Three review rounds; rounds 1 and 2 REJECTED, round 3 APPROVED. Both
round-2 Highs are closed and were re-derived from the vendored ROM rather than taken on
report, and three independent passes (Reviewer from source, comment-analyzer,
rule-checker's file/line/extent sweep) each tried to falsify every claim in the round-3
delta and each returned a clean null. Nothing outstanding blocks this story. *(This
section was written by hand — the finish writer emitted none, the known
`pf-finish-impact-summary` failure.)*

**Shipped — the ruling, not the sound.** A machine-readable POKEY dossier for centipede
in three artifacts: `docs/rom-study/sound.md` (the prose ruling), `sound.fixture.json`
(what cp6-2 consumes) and `claims/16-sound.json` (**108** claims, SND-001..108
contiguous, every one byte-re-opened against the vendored 1981 source by the live
citation gate — 481/481 dossier-wide):

- **All fourteen SOUNDS cues ruled on individually** (AC-1), each naming its ROM table
  and channel or labelled an invention with no source — nothing silently authentic.
- **Six frequency tables transcribed and never a seventh**, with the radix read correctly
  in both directions (`LDY I,20.` decimal, `LDA I,0A4` hex) — the trap that has bitten
  this fleet before.
- **Per-cue length, loop-vs-one-shot and frame gating derived from the ROM's own
  countdown windows** (AC-3, AC-4), non-uniform and per cue: the spider's every-other-
  frame LSR, the bonus `AND I,07`, the player explosion `AND I,3`. cp6-2 reads numbers,
  not judgements.
- **The headline ROM finding: the `SOUNDS` header is a POKEY VOICE map, not the CHAN
  variable list.** `CENDE4.MAC:194` declares `CHAN1` as the centipede index alone while
  the header's CHAN 1 line names four cues, so the two cannot be the same thing. Read as
  voices the header is exact and complete, and its CHAN 1 line names precisely the four
  `STA AUDF1` writers — **the machine documented the voice-1 contention in 1981** and this
  dossier rediscovered it the long way round.
- **POKEY voice 1 is contended four ways and the march loses** — bonus > scorpion > flea >
  march, with the bonus winning by NOT branching (`:2374 BEQ 48$ ;IF NO BONUS SOUND`), and
  the one frame's exception on the expiry tick recorded rather than smoothed over.
- **AC-7 enrollment:** the dossier is swept, not merely written beside the sweep —
  `DOSSIER_FILES` generalised into `tests/audit/dossier-sweep.ts`, mutation-proved so that
  deleting a citation's claim reddens the gate.

**Scope held (AC-5, AC-6).** Zero changes under `plugins/centipede/src/`; the manifest and
CHANNELS map are exactly as cp5-1 left them; no baker exists and `deploy-assets` still does
not name centipede. **centipede is still silent, and the dossier says so plainly.**

**Routed forward — seven findings, none blocking this story:**

- **F1 — BLOCKING FOR cp6-2.** POKEY voice **0** is contended too and the ruling never says
  so. `:2437 BEQ 52$ ;IF NO PLAYER EXPLOSION` is the voice-0 twin of the bonus gate; label
  `52$` has exactly one referent and `:2416 BNE 50$ ;ALWAYS` blocks fall-through, so a live
  player explosion preempts all four kill cues outright. The fixture already holds every
  ingredient (five cues at `pokeyVoice: 0`, both write sites claimed as SND-102/SND-104) but
  `voiceArbitration` lists only the voice-1 four. Our shell splits them (`'impact'` vs
  `'alert'`), so the clone rings both where the cabinet rings one — and cp6-2 wires exactly
  those channels.
- **F2 → TEA.** Non-unique `verbatim`: swapping SND-100/SND-103 and SND-102/SND-104 line
  numbers, and repointing `scorpionLoop.voiceCite` to the march's write site, all leave
  1087/1087 green. Open because a pf routing defect sent the round-2 rejection to `finish`
  and then to `green`, so TEA never ran — not because it was declined.
- **F3.** The ROM-comment guard resolves quotes against `CENTI4.MAC` only, so it cannot see
  the `CENDE4.MAC` this story started citing. Proved both ways; disclosed by Dev; the real
  citation gate is file-agnostic, so no shipped quote is affected.
- **F4.** A fourth artifact still inverts the branch sense — `sound-dossier.test.ts:1246`'s
  assertion label. Round 2 named three files and round 3 fixed three; this survived because
  the round-3 diff is doc-only.
- **F5/F6/F7 (Low).** SND-098's "two lines below" is five; `:2377` is leaned on but uncited;
  and §1 under-reads its own second-best proof — `;CHAN 0=ALL EXPLOSIONS` corroborates the
  voice reading as strongly as the CHAN1 line does, because voice 0 carries both explosion
  variables.

**Why approved rather than a fourth round.** None of the residue is the dossier stating
something false — the standard rounds 1 and 2 were rejected against. And the review measured
that the dossier's *conclusions* are unguarded English (both round-3 headline fixes revert
with the suite green), so a fourth prose round could only be verified by another careful
reading. F1 earns more in cp6-2, where it becomes a channel decision a test can finally pin.

**Verification at finish:** centipede 1087/1087, `tsc --noEmit` clean, orchestrator 390/390.
This finish also swept epics **jt5** (11/11) and **jt8** (6/6) into `sprint/archive/` — the
expected `archive_epics` behaviour, not a side effect to revert.
