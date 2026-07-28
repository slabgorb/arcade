---
story_id: "uf1-5"
jira_key: "uf1-5"
epic: "uf1"
workflow: "trivial"
---
# Story uf1-5: star-wars speech catalogue — correct the stale deferred-count comment and inventory the 10 untriggered lines

## Story Details
- **ID:** uf1-5
- **Jira Key:** uf1-5
- **Workflow:** trivial
- **Repos:** star-wars
- **Branch:** chore/uf1-5-speech-catalogue-deferred-count
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-28T13:00:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-28T12:25:06Z | 2026-07-28T12:27:52Z | 2m 46s |
| implement | 2026-07-28T12:27:52Z | 2026-07-28T12:47:20Z | 19m 28s |
| review | 2026-07-28T12:47:20Z | 2026-07-28T13:00:05Z | 12m 45s |
| finish | 2026-07-28T13:00:05Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Gap** (non-blocking): two of the SHIPPED trench voice cues emit only HALF of the ROM's
  phrase sequence, so this is a live fidelity divergence rather than a deferred line. `SPKSTR`
  is `TSTR: .BYTE 10.,4,10.` — breath, "the Force is strong in this one", breath — and `SPKYAU`
  is `TYAU: .BYTE 11.,8` — "Yahoo!" then "you're all clear kid" (SNDSPK.MAC:68, :78). We cue
  the bare second phrase in both cases, which is exactly why `vaderBreathing` and `yahoo` look
  like un-cued catalogue lines: they are not missing mechanics, they are the missing halves of
  cues we already fire. Affects `star-wars/src/core/events.ts` (a `SpeechEvent` carries ONE
  `line`, so a sequence needs either multiple events on the frame — `pushFarewell` already does
  this for REM/FOR/ALW — or a sequence-valued cue). *Found by Dev during implementation.*

- **Improvement** (non-blocking): the two shield-ladder lines are the cheapest of the ten to
  wire — the ROM speaks them off shields REMAINING after a hit (`DO1GAS`, WSGAS.MAC:85-94:
  `S.GAS == 2` → SPKR2T "R2, try and increase the power", `S.GAS == 0` → SPKLOS "I've lost R2"),
  and our sim already funnels every shield loss through one place. Affects
  `star-wars/src/core/sim.ts` (`loseShield` returns post-hit lives and currently cues no speech;
  it would need the events array threaded in, as its callers already hold one).
  *Found by Dev during implementation.*

- **Question** (non-blocking): `SP.WAV` parity gates which Darth-sighted line is spoken
  (WSMAIN.MAC:3849-3865), and I could not confirm from this pass whether `SP.WAV` is 0-based
  like `BS.WAV` — which sw7-2 had to reconcile for the trench lines (U-007/U-008), where a
  1-based reading INVERTED the sets and dropped a line. The annotations therefore say
  "SP.WAV even/odd" rather than "human even/odd wave" so they cannot be misread. Affects
  `star-wars/src/core/events.ts` (whoever wires the Darth lines must settle the base FIRST —
  the identical trap cost sw7-2 a correction). *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): the refuted blocker triple survives in a LIVE, present-tense claim —
  "Lines that need mechanics the sim lacks (R2 damage, Vader-on-tail, wingmen) are DEFERRED".
  Two of the three are now known wrong (no line needs wingmen; SPKHAV is the Darth-sighted latch,
  not an on-tail state). This story swept synonyms of the corrected COUNT exhaustively but not
  synonyms of the corrected BLOCKERS, which Dev corrected voluntarily beyond AC-3. Affects
  `star-wars/tests/core/speech-cues.test.ts` (lines 24-26 — one sentence, ideally just pointing at
  the `DEFERRED` block in events.ts so it cannot rot twice). *Found by Reviewer during code review.*

- **Conflict** (non-blocking): audit finding U-018's `title` and `reasoning` attribute
  SPKSTA/SPKIMO to "wingman/formation choreography" and SPKHAV to a "Vader/enemy-on-your-tail
  state", which the ROM contradicts — all three have exactly one call site, the `Q.RTHV`
  Darth-first-visible latch (WSMAIN.MAC:3849-3865). The repo now holds two contradictory live
  statements about the same seven lines. Independently flagged by the rule-checker. Affects
  `star-wars/docs/audit/findings/pair-audio.json` (re-spell U-018 per the star-wars convention that
  findings are re-spelled when reality moves; `ours` is null so no citation breaks).
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): the `DEFERRED` inventory in events.ts is unguarded — the new
  suite pins the union↔marker partition and two literal counts, but nothing reads the block. Proven
  by mutation: a wiring that updates union, marker AND the pinned counts leaves the block listing a
  now-wired line, suite green. Affects `star-wars/tests/shell/audio.test.ts` (scrape the block's
  names and assert equality with the complement — ~4 lines, and it retires the hardcoded 13/10 that
  would otherwise invite number-bumping). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Left four classes of stale phrasing UNCORRECTED, against a literal reading of AC-4**
  - Spec source: context-story-uf1-5.md, AC-4
  - Spec text: "Every other phrasing of the stale count across the repo, the sprint epic files
    and the context mirrors is corrected, not only the one string quoted here."
  - Implementation: swept both repos for every synonym (`other 19`, `19 are deferred`,
    `23-line`, `only 4 of`, `4 of 23`, `exposes 4`, `[wired]`). Corrected the two live source
    sites. Deliberately did NOT rewrite: (a) `docs/sw2-6-disassembly-fidelity-audit.md` — its
    two "only 4 of 23" claims are left verbatim under dated `⚠ SUPERSEDED (uf1-5)` blocks,
    the convention that doc already uses twice for sw5-4; (b) the archived sessions
    (`sw2-5`, `sw2-6`, `epic-sw3`, `context-epic-sw3`) — "the other 19" was TRUE when written,
    so "correcting" it would make the historical record false; (c) `sprint/epic-uf1.yaml` and
    `sprint/context/context-story-uf1-5.md` — they quote the stale sentence as the DEFECT and
    then assert the correct value ("Deferred is therefore 10, not 19"), so the stale count
    never appears there as a claim.
  - Rationale: AC-4's purpose is that no reader can be MISLED, not that a string vanishes.
    Rewriting a point-in-time audit or an archived session is evidence laundering — the
    red-baron frozen-evidence precedent. A dated supersede satisfies the purpose and keeps
    the trail. `23` itself is NOT stale anywhere (the catalogue really is 23 lines), so the
    five files carrying "23-line"/"23-phrase" were correctly left alone.
  - Severity: minor
  - Forward impact: none — but a Reviewer applying AC-4 literally will find four surviving
    matches. They are enumerated here so the call can be judged rather than discovered.

- **Added a test and a `[deferred]` marker; the story said "prose and inventory only"**
  - Spec source: context-story-uf1-5.md, AC-1 / AC-2 / AC-5
  - Spec text: "so the number cannot drift again without the list drifting visibly with it";
    "This story is prose and inventory only — it wires no new line and needs no new mechanic."
  - Implementation: added one `describe` (4 tests) to `tests/shell/audio.test.ts` pinning the
    `[wired]` set against the `SpeechLine` union, and gave every catalogue key an explicit
    `[wired]`/`[deferred]` marker (AC-2 only demanded `[wired]` accuracy).
  - Rationale: "cannot drift again" is not deliverable in prose — prose is exactly what rotted
    here. The complementary marker turns "unmarked" from ambiguous into a test failure. No
    production behaviour is touched, so AC-5 holds: all 23 `key: value` pairs are byte-identical
    (proved by a sorted diff of the map before/after).
  - Severity: minor
  - Forward impact: a future story wiring a deferred line must move it out of the events.ts
    DEFERRED block AND re-mark it in audio.ts, or the suite fails. That is the intent.

- **Replaced the comment's named blockers rather than only its number**
  - Spec source: context-story-uf1-5.md, AC-3
  - Spec text: "annotated with the mechanic it waits on (R2 damage, Vader-on-tail, wingmen,
    or another named gap)"
  - Implementation: derived every blocker from the 1983 source instead of inheriting the
    story's three families. "wingmen" is now dropped entirely — no deferred line needs wingmen.
  - Rationale: the ROM speaks `imOnTheLeader` (which reads like wingman chatter) from the
    Darth-first-sighted latch, not from any wingman. The sw2-6 audit had already flagged the
    same memo as wrong for the trench lines. AC-3 explicitly allows "another named gap".
  - Severity: minor
  - Forward impact: positive — the annotations now cite the routine that speaks each line.

### Reviewer (audit)

- **Dev deviation 1 (left four classes of stale phrasing uncorrected)** → ✓ ACCEPTED by Reviewer.
  I re-ran the sweep independently and reached the same partition. The rationale is not just
  defensible, it is **verified**: I checked out the commit that introduced the "other 19" claim
  (`4a1cc3da`, sw2-5) and `SpeechLine` had exactly 4 members there — 23 − 4 = 19. The archived
  sessions were TRUE when written, so "correcting" them would have made the record false. The two
  `docs/sw2-6-…-audit.md` claims are left verbatim under dated `⚠ SUPERSEDED (uf1-5)` blocks, which
  is that document's own convention (it already carries two such blocks for sw5-4). And `23` is
  genuinely not stale anywhere — the catalogue really is 23 lines, pinned by
  `tests/shell/audio.test.ts:191`. No count phrasing survives outside dated supersedes and archives.

- **Dev deviation 2 (added a test and a `[deferred]` marker despite "prose and inventory only")**
  → ✓ ACCEPTED by Reviewer. AC-1 demands the number "cannot drift again", which prose cannot
  deliver — prose is precisely what rotted here. AC-5 is not violated: I diffed the `SPEECH`
  key:value pairs between `origin/develop` and HEAD independently and all 23 are byte-identical,
  and no non-comment line changed anywhere under `src/`. See finding M-1 for the one limit of the
  guard that the comment's own description slightly oversells.

- **Dev deviation 3 (replaced the comment's named blockers, dropping "wingmen")** → ✓ ACCEPTED by
  Reviewer on the merits — I verified the ROM myself and Dev is right: `WSMAIN.MAC:3849-3865` is
  the `Q.RTHV` Darth-first-visible latch, and SPKSTA/SPKIMO/SPKHAV all hang off it, branching on
  `SP.WAV` parity then `P.RND1`. Nothing there is wingman or formation choreography; the old
  attribution appears to have been inferred from the phrase text ("stay in attack formation")
  rather than from the call site. **But accepting the correction surfaces findings M-2 and M-3:**
  having refuted the triple, its live restatements elsewhere in the repo now contradict the
  shipped comment. Dev swept synonyms of the corrected COUNT thoroughly and did not sweep synonyms
  of the corrected BLOCKERS.

## Sm Assessment

Setup complete and verified on disk — not merely reported by the setup subagent.

**Verified:**
- `.session/uf1-5-session.md` exists, `**Phase:** finish (not left on `red`), Workflow Tracking sits
  above every assessment heading so handoff inference can read it.
- `sprint/context/context-story-uf1-5.md` exists with five acceptance criteria.
- `star-wars` is on `chore/uf1-5-speech-catalogue-deferred-count`, cut from `develop`, working tree clean.
- No open PRs on `slabgorb/star-wars` — the merge gate is clear.

**Routing:** `trivial` / phased → setup → **implement** → review → finish. Next agent: Dev (Yoda).
There is no RED phase; Dev implements directly.

**Nature of the work — read this before touching anything.** This is a prose-and-inventory story.
It wires no speech line and needs no new mechanic. The 10 deferred lines are all baked and return
200 on R2 — dead weight in the catalogue, not broken assets. This is explicitly *not* the sw3-5
silent-404 class. Its nearest prior art is sw8-15 (music-bake comment accuracy).

**The one way this story fails.** AC #4 is the whole risk. The wrong-prose rule: grep every
SYNONYM of the corrected claim, not just the named string. A sibling story of exactly this shape
(jt2-8) was REJECTED in review round 1 for correcting only the quoted sentence and leaving the
paraphrases standing. Sweep for every phrasing — `19`, "the other 19", "23-line", "deferred",
`[wired]`, "currently cues" — across:
- `star-wars/src/core/events.ts` (the named site, ~line 154) and `star-wars/src/shell/audio.ts`
  (~line 147, the `[wired]` markers: only 4 of 13 cued lines carry one, so 9 correct wirings
  currently read as unwired),
- `sprint/epic-uf1.yaml` — mirrors carry BOTH a free-text description AND a separate
  acceptance-criteria list; both need correcting,
- `sprint/context/` mirrors and the star-wars `docs/` tree.

**Landmine on the epic shard.** pf writes sprint descriptions as single-quoted YAML scalars. A
scripted edit that inserts a bare apostrophe silently drops the ENTIRE epic shard — UserWarning
only, and `pf sprint status` just under-reports rather than failing. If `sprint/epic-uf1.yaml` is
edited, re-read that shard by path afterward to confirm it still parses before staging it. This
repo has already lost an epic this way (commit 128366c).

**Git discipline.** Use `git -C /Users/slabgorb/Projects/a-3/star-wars` for subrepo operations. A
`cd` inside a command that trips the branch-protection hook is swallowed, and the next command then
runs in the wrong repo. The subrepo's PR targets `develop`, never `main`.

No blockers. No upstream findings at setup.

## Dev Assessment

**Implementation Complete:** Yes
**Branch:** `chore/uf1-5-speech-catalogue-deferred-count` (pushed, `41f7c7f`)
**Tests:** 1957/1957 passing across 185 files (full suite). `tsc --noEmit` clean, `vite build` clean.

**Files Changed:**
- `src/core/events.ts` — header corrected (`19` → the remainder is inventoried, not re-counted in
  prose); new `DEFERRED` block naming all 10 un-cued lines with the ROM routine and mechanism each
  waits on. Comments only.
- `src/shell/audio.ts` — every catalogue key now carries exactly one of `[wired]`/`[deferred]`
  (was 4 of 13 wired lines marked). Comments only; all 23 `key: value` pairs byte-identical.
- `tests/shell/audio.test.ts` — one `describe` (4 tests) pinning the marker set against the union.
- `docs/sw2-6-disassembly-fidelity-audit.md` — two dated `⚠ SUPERSEDED (uf1-5)` notes.
- `docs/audit/findings/pair-audio.json` — U-024 re-anchored `audio.ts:149 → 155`.

**Ground truth was re-derived, not inherited.** The story's numbers were all correct, but I
verified each independently before writing it into source: the union has 13 members; sim.ts holds
exactly ten literal `line:` cues plus `ENTER_PHASE_SPEECH`'s three; the catalogue has 23 keys; the
complement is exactly the 10 named. I also curled all ten deferred `.wav`s on R2 — **10/10 return
200**, so "dead weight, not a broken asset" is now a checked claim rather than a repeated one.

**The blockers are ROM-derived and the story's were partly wrong.** Every "waits on" annotation
cites the routine that speaks the line (`SNDSPK.MAC` + its callers). This dropped **"wingmen"**
entirely — no deferred line needs wingmen; `imOnTheLeader`, `stayInAttackFormation` and
`iHaveYouNow` are all spoken from the one-shot Darth-first-sighted latch (`Q.RTHV`,
WSMAIN.MAC:3849-3865). And two lines are not missing mechanics at all: `vaderBreathing` and
`yahoo` are the missing halves of sequences we already half-emit — filed as a Delivery Finding
because it is a divergence in SHIPPED behaviour, not a deferred line.

**The guard is proven non-vacuous.** Prose is what rotted here, so "cannot drift again" (AC-1)
needed a test, not a sentence. Three mutations, each reverted:

| Mutation | Result |
|---|---|
| Flip one `[wired]` → `[deferred]` | 2 failed — marker set ≠ union |
| Add a line to the union, don't re-mark it (**the exact drift this story fixes**) | 3 failed |
| Strip a marker entirely | 3 failed — key carries no marker |

**Self-review of my own correction prose.** Per the known failure mode (a fix round is where new
false claims are born), I falsified every claim I wrote and **retracted three before commit**:
(1) "phrase 7 has no speaking routine" — false, `SPKR2T` exists at SNDSPK.MAC:40; (2) "the
`speak()` pump absorbed all nine without change" — false, sw7-8 made it serial/queued; sentence
deleted rather than patched; (3) five ROM line citations were off by 1-7 lines and were tightened
to exact instruction spans. I also disambiguated six parity notes: `parity` in `TRENCH_VOICE_CUES`
is **BS.WAV** parity, the inverse of the human wave number, so bare "even wave" would have read as
the opposite of the sim's own table.

**Acceptance criteria:**
| AC | Status |
|---|---|
| 1 — correct count + names the 10, cannot drift | Met — count lives on the list; test enforces |
| 2 — `[wired]` matches reality | Met — 13 wired / 10 deferred, pinned both directions |
| 3 — each deferred line annotated with its blocker | Met — ROM-grounded, per line |
| 4 — every other phrasing corrected | Met with 3 documented exceptions (see Design Deviations) |
| 5 — no behaviour change, suite green | Met — map byte-identical; 1957/1957 |

**Handoff:** To review (Obi-Wan Kenobi). The judgment call worth his attention is AC-4: four
stale-count matches survive on purpose — two under dated SUPERSEDED notes in a point-in-time audit,
and the rest in archived sessions where the old number was true when written. Rationale and the
full enumeration are in Design Deviations.

## Subagent Results

Both enabled subagents returned before this assessment was written. Toggles read from
`pf settings get workflow.reviewer_subagents` — only `preflight` and `rule_checker` are enabled.

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1957/1957, build PASS, 98 citations correct / 0 lost, no debug residue, tree clean, no PR created |
| 2 | reviewer-rule-checker | Yes | clean | 0 violations (14 rules / 26 instances) + 1 advisory (U-018 stale) | Advisory CONFIRMED and adopted as finding M-3; all six factual claims independently verified |
| 3 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (2 enabled returned, 7 disabled via settings)
**Total findings:** 1 confirmed, 0 dismissed, 0 deferred — the rule-checker's U-018 advisory was
confirmed against the ROM and adopted as M-3. The other two Mediums (M-1, M-2) are my own, found
by mutation-probing the new guard and by sweeping synonyms of the corrected blockers.

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. Three Mediums, all documentation-consistency rather than
correctness; per the blocking rule they do not block, and per proportionality a comment cluster on
a 1-point p3 chore is a follow-up, not a fourth round. The shipped artifact is correct: I could not
find a single false statement in the delivered comments, and I tried hard to.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | The `DEFERRED` prose block is unguarded. The test pins the union↔marker partition and two literal counts (13/10) but never reads the block; nothing in the repo does. A future wiring that also updates those counts leaves the inventory stale with a green suite — the same rot this story fixed. The block's own sentence ("wiring a line without moving it out of this block fails the suite") is true only because the counts trip first, not because the block is checked. | `src/core/events.ts:181-183` | Follow-up: scrape the block's names in `audio.test.ts` and assert equality with the complement — that makes the sentence structurally true and retires the hardcoded 13/10 |
| [MEDIUM] | Live, present-tense restatement of the blocker triple this story refuted: "Lines that need mechanics the sim lacks (R2 damage, Vader-on-tail, wingmen) are DEFERRED". Two of the three are now known wrong. | `tests/core/speech-cues.test.ts:24-26` | Follow-up: one sentence, pointing at the `DEFERRED` block |
| [MEDIUM] `[RULE]` | Audit finding U-018's reasoning attributes SPKSTA/SPKIMO to "wingman/formation choreography" and SPKHAV to a "Vader/enemy-on-your-tail state" — both refuted by the ROM reading this story rests on. Repo now holds two contradictory live statements. | `docs/audit/findings/pair-audio.json` (U-018 `reasoning`, and its `title`) | Follow-up: re-spell per the star-wars convention (findings are re-spelled when reality moves, not frozen). `ours` is null, so no citation breaks |

### Rule Compliance

Language: TypeScript. Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (14 numbered checks).
This diff adds **no** enums, interfaces, generics, functions, constructors, or async code — it is
comments plus four test assertions — so most checks have zero governed instances. Enumerated:

- **#1 type-safety escapes** — 3 instances (2 `?raw` imports, 4 `it()` bodies, the comment edits).
  Compliant: no `as any`/`as unknown`, no `@ts-ignore`/`@ts-expect-error`, no `!` non-null
  assertions. `marked` is explicitly typed `(marker: 'wired' | 'deferred') => string[]`.
- **#4 null/undefined** — 4 instances (the `.split('\n\n')[0]` slice, the `.length` arithmetic, the
  `filter`/`includes` complement, the `matchAll` `m[1]` maps). Compliant: capture group 1 is
  required by each regex, so no undefined-index path is introduced.
- **#5 module/declaration** — 2 instances. Both `?raw` text imports follow the file's own existing
  `mainSrc`/`speechDataSrc` precedent (`audio.test.ts:18,22`).
- **#8 test quality** — 4 instances. Compliant and specifically non-vacuous: the suite carries an
  explicit "guards the guard" case, and the complement test asserts set-equality, not just a count.
- **#13 fix-introduced regressions** — full re-scan, none.
- **#2, #3, #6, #7, #9, #10, #11, #12** — zero governed instances in this diff.
- **ADDITIONAL — the core/shell hard boundary (CLAUDE.md)** — 8 instances, the FORBIDDEN table at
  `tests/core/events.test.ts:323`. This is the check that mattered most, because the diff adds ~40
  comment lines to a core file and that guard **regex-scans comments as source**. I ran all eight
  patterns against `events.ts` myself (0 hits each) and the guard suite passes 45/45. Notably the
  new prose says "enters the player's view" rather than ending a sentence on the word "window" —
  the exact trap that has reddened this suite before.

### Observations

- `[VERIFIED]` **No production behaviour change (AC-5).** Evidence: I extracted the `SPEECH`
  key→value pairs from `origin/develop:src/shell/audio.ts` and from `HEAD`, sorted and diffed —
  23 pairs, byte-identical, zero differences. Separately, filtering the `src/` diff for any line
  that is not a comment and not an unchanged `key: 'value',` returns **nothing**. Complies with
  AC-5 and with the CLAUDE.md core/shell boundary.
- `[VERIFIED]` **All 13 `[wired]` annotations are accurate**, not just the marker set. Checked each
  against its cue site: `sim.ts:779` run start, `:1448` port kill, `:1505` port-miss gated on
  `lives > 0` ("and the run survives" — correct), `:1658-1660` the farewell trio in spoken order,
  `:1678-1681` the four trench cues, `ENTER_PHASE_SPEECH:1621-1622` for the three phase-entry lines
  (`redFiveImGoingIn` genuinely precedes `lookAtTheSizeOfThatThing` in the array, so "leads SIZ"
  holds).
- `[VERIFIED]` **The trench parity translations are right, and this was a live trap.** `parity` in
  `TRENCH_VOICE_CUES` is *BS.WAV* parity — the inverse of the human wave number. Dev caught the
  ambiguity and wrote "human EVEN/ODD"; I checked all four against `sim.ts:1678-1681` and each
  inverts correctly. Had they been left bare, the annotations would have read as the exact opposite
  of the table three files away — and sw7-2 already lost a line (U-007) to this same inversion.
- `[VERIFIED]` **The archives were correctly left alone.** I checked out `4a1cc3da`, the commit that
  introduced the "other 19" claim: `SpeechLine` had exactly 4 members there, so 23 − 4 = 19 was
  TRUE when written. Rewriting those files would have manufactured a falsehood.
- `[VERIFIED]` **Citation hygiene.** `reanchor-citations.mjs` dry-run reports 98 correct / 0
  re-anchored / 0 lost, and every `+`/`-` line in `docs/audit/findings/` that is not `"line":` is
  empty — the anti-laundering rule holds. The single bump (U-024, 149→155) is caused by the
  `audio.ts` comment insertion, exactly as expected.
- `[RULE]` **Confirmed:** rule-checker independently verified all six factual claims — the 13-member
  union and its 10+3 cue split, the 23-key catalogue and its exact partition, zero value changes,
  every ROM citation byte-for-byte (`TSTA=10,14,10`, `TIMO=10,3,10`, `THAV=10,12,10`, `TSTR=10,4,10`,
  `TYAU=11,8`, `TBRE` commented out, and the `Q.RTHV`/`Q.GHIT`/`Q.SHK`/`Q.PBB`/`DO1GAS` spans), and
  that `grep` across the whole ROM tree finds exactly one call site each for SPKSTA/SPKIMO/SPKHAV —
  the Darth-visible latch. The "no deferred line needs wingmen" correction is sound.
- `[MEDIUM]` The three findings above.

**Data flow traced:** `stepGame` emits `{type:'speech', line}` as pure DATA (`sim.ts:779…1698`) →
`GameState.events` → the shell's generic pump (`main.ts:229`) → `speak(event.line)` → `SPEECH[name]`
→ lazy fetch under the R2 speech prefix. Safe because `line` is a compile-time-closed union, so
there is no runtime string path from user input into the map index — the index can only ever be one
of 13 literals the compiler already admitted. This diff touches none of that flow; it annotates its
endpoints.

**Pattern observed:** the `?raw` source-scrape guard (`audio.test.ts:243-260`) is the repo's
established idiom for pinning facts that have no runtime form — the same technique already used for
`BAKED_NAMES` at `audio.test.ts:64` and for the core-purity FORBIDDEN table at
`events.test.ts:317-332`. Correctly applied here, including a guards-the-guard case against the
empty-scrape failure mode that makes set-equality assertions vacuously true.

**Error handling:** unchanged and not in scope — `speak()` degrades silently on fetch/decode failure
(`audio.ts` doc comment, and the "safe no-op" tests at `audio.test.ts:184`). The ten deferred lines
are not a failure path: I re-verified Dev's claim by curling all ten from R2 and confirming they
still serve, so a future wiring cannot 404. This is genuinely not the sw3-5 silent-404 class.

### Devil's Advocate

Let me argue this commit is worthless or harmful. **First, the strongest attack: it is a comment
change that shipped a new guard, and guards that pin literal counts are how you manufacture
busywork.** The test hardcodes 13 and 10 in two places. The next person to wire a speech line will
hit a red suite for reasons unrelated to their change and will "fix" it by bumping numbers until
green — which is precisely how the block goes stale (M-1). That is a real cost, and I weighed
rejecting on it. It survives because the alternative — no guard — is what produced this story: the
markers rotted for two whole epics (sw3-4, sw7-8) with nobody noticing. A guard that forces a
deliberate edit beats prose that rots silently, even when the guard is count-shaped. **Second: is
the new prose itself false anywhere?** This is the failure mode that has bitten this repo — a fix
round that deletes three false claims and adds seven. I hunted specifically for it. Dev's own
assessment admits retracting three claims pre-commit ("phrase 7 has no routine" — false, `SPKR2T`
exists; "the pump absorbed all nine without change" — false, sw7-8 made it serial; five citations
off by a few lines). That is the right behaviour, but it means the prose was demonstrably wrong
three times before it was right, so I did not take the fourth version on trust: I re-derived the
union count, the cue split, the partition, and had the rule-checker verify every ROM citation
against the source independently. All hold. **Third, a confused maintainer.** Someone reads
"[deferred] Darth first sighted, SP.WAV even" and wires it against the human wave number, inverting
the pair — exactly sw7-2's U-007 bug. Dev anticipated this and filed it as an open Question; the
annotations deliberately say "SP.WAV", not "wave". Mitigated as well as a comment can. **Fourth,
the audit corpus.** Editing a cited file shifts line numbers and can launder findings. I checked:
one legitimate line-only bump, every non-`"line":` diff line empty. **Fifth, the deepest problem:**
this story refuted a claim ("wingmen") that lives in two *other* live files, and corrected neither
— M-2 and M-3. So the repo is now internally inconsistent in a way it was not before the commit.
That is genuinely a mark against it. But the inconsistency resolves in favour of truth: the
authoritative source comment is now correct and the stragglers are stale, whereas before,
everything was uniformly wrong. Making one file right is not made worse by the others still being
wrong. Filed as follow-ups, not blockers.

**Handoff:** To SM for finish-story.