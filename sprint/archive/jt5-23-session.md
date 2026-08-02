---
story_id: "jt5-23"
jira_key: "jt5-23"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-23: What ARE G1DEC/G2DEC? CUE_SOURCES now cites two decision-block families with no model of either

## Story Details
- **ID:** jt5-23
- **Jira Key:** jt5-23 (local tracking only — no Jira integration; CLAUDE.md: "No Jira — issue tracking is local via `sprint/` YAML files")
- **Epic:** jt5 — Joust audio — the sound subsystem joust shipped without
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 3
- **Priority:** p1
- **Stack Parent:** none (`depends_on` unset)
- **Branch:** main
- **PR:** none
- **Branch Strategy:** trunk-based — work lands directly on the default branch. `.pennyfarthing/repos.yaml` sets `branch_strategy: trunk-based` for the single `arcade` entry, and CLAUDE.md states "trunk-based — commit straight to `main`... There are no per-game remotes, no `develop` branches and no per-game PRs." The `feat/jt5-23-g1dec-g2dec-decision-block-families` ref is NOT a work branch: it is pushed at `main`'s tip with zero commits ahead, purely as the sibling-visibility signal a concurrent checkout probes with `git branch -r | grep jt5-23`. It is deleted at finish, gated on a zero count.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-02T14:40:42Z
**Round-Trip Count:** 1
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-02T13:50:23Z | — | — |

## Story Acceptance Criteria

1. The port records WHAT the two decision-block families are, citing the ROM selection site verbatim: JOUSTRV4.SRC:1025-1029 (LDX #G1DEC / LDA GOVER / BGT / LDX #P1DEC / STX PDECSN,Y), mirrored for player 2 at :1041-1045. The recorded model states that G1DEC/G2DEC bind when GOVER is greater than zero (the attract-mode self-playing demo) and P1DEC/P2DEC bind otherwise (real play), and cites the corroboration on both sides: P1JOY (:7247) reads the WCPIAB hardware joystick MUX, while G1JOY/G2JOY (:601-616) live in the attract region beside ATTRCT CLR GOVER (:712).

2. The recorded model states that the G/P pairing exists ONLY for the two knights: the ROM defines exactly two G-blocks (G1DEC :5542, G2DEC :5546) against seven P-blocks (P1DEC :5550 through P7DEC :5574), so the P prefix on P3DEC-P7DEC (buzzards, pterodactyl) does NOT denote real-play-versus-attract the way it does on P1DEC/P2DEC. Those five creature blocks have no G-variant.

3. A test pins the selection mechanism against the vendored source so the recorded meaning cannot silently rot - the same verbatim-line idiom already used by plugins/joust/tests/audio-transporter-split.test.ts:459-470. Mutating the cited line or the owning label reddens it.

4. playerWingUp and playerWingDown re-anchor their callSite from line 5544 (G1DEC, the attract-demo binding) to line 5552 (P1DEC, real play), so CUE_SOURCES cites ONE decision-block family for every knight cue. A test asserts both cues cite the P-family row and that the row really opens with SNPLWU,SNPLWD.

5. The false claim in the shipped jt5-3 comment at audio-manifest.ts:326 - These four cite the G-BLOCK row (:5544) - is corrected. Only playerWingUp and playerWingDown ever cited :5544; enemyWingUp and enemyWingDown cite :5560, which is P3DEC's sound row and has no G-variant at all. The count of cues affected by the G/P question is two, not four.

6. The recorded rationale explains why the pre-jt5-23 citation was ALSO true - SNPLWU,SNPLWD open all four knight rows (:5544, :5548, :5552, :5556) identically - so the re-anchor reads as a precision gain and not as the correction of a wrong citation.

## SM Setup Assessment (2026-08-02)

### Claim probes — story was unowned

`git fetch --prune` then `git branch -r | grep -Ei "jt5"` returned **no** remote branch for any
jt5 story. The sibling-session sweep `ls /Users/slabgorb/Projects/a-*/.session/*-session.md`
returned exactly one file — `a-3`'s `uf1-15-session.md` — so the glob resolved (it did not
silently no-op) and no checkout holds jt5-23. Board was clean and the probes agree with it.

### The description was measured before setup — eight citations verified, TWO claims refuted

Standing rule: a description's falsifiable claims get copied forward as current fact, so they
are measured first. This description was unusually dense with them.

**Verified exactly, all eight:** G1DEC :5542 with its sound row :5544; G2DEC :5546/:5548;
P1DEC :5550/:5552; P2DEC :5554/:5556; that the rows differ in exactly two places; that the 8th
sound slot is a bare `0` in the G-blocks and `SNPTREF` in the P-blocks; `SNPTREF` at :8122; and
that `SNPLWU,SNPLWD` open all four rows identically. Recorded per the standing rule that a
"no corrections" result is itself a measurement worth writing down — the next reader should not
re-run this sweep.

**Refuted (1) — the story's own headline premise is overstated.** "CUE_SOURCES now cites two
decision-block families with **no recorded reason a reader could check**" is not true today:
`audio-manifest.ts:326-332` records a checkable reason for the split, and `:218-223` records the
mechanical difference. This is the single most consequential finding of setup, because the
*natural* RED test — assert that a rationale exists — **passes on arrival**. Left uncorrected,
TEA writes a vacuous guard and the story ships green having proved nothing. What is genuinely
unrecorded is what the families **mean**; both comments say only "Nothing in this port models
the G/P distinction."

**Refuted (2) — "the four wing cues citing G1DEC :5544" is FALSE; it is two.** Enumerated
mechanically from the manifest: `playerWingDown` and `playerWingUp` cite `line: 5544`;
`enemyWingDown` and `enemyWingUp` cite `line: 5560`, which is **P3DEC's** row. The shipped
comment at `audio-manifest.ts:326` makes the identical error ("These four cite the G-BLOCK
row") and is plainly where the story inherited it — a false sentence in a comment propagating
into a backlog item, which is exactly the unguarded-prose failure mode. Correcting it became
AC5, and the AC4 re-anchor was scoped to **two** cues rather than four.

### SM answered the headline question — handed on as a CLAIM TO VERIFY, not as settled fact

The story prescribed the method ("grep the FDB consumers of each label and the DECSN/PDECSN
selection"), and it produced a clean answer in minutes, so it would be wasteful to withhold it.
`JOUSTRV4.SRC:1025-1029` (mirrored :1041-1045) reads `LDX #G1DEC  ASSUME GAME SIMULATION` /
`LDA GOVER` / `BGT` (keeps G) / `LDX #P1DEC` / `STX PDECSN,Y`. So `GOVER > 0` selects the
G-block. Corroborated on both sides rather than from the ROM's comment alone: `P1JOY` (:7247)
opens `LDA WCPIAB` "SELECT HALF OF MUX" — the real hardware joystick — while `G1JOY`/`G2JOY`
(:601-616) sit in the attract region beside `ATTRCT CLR GOVER` (:712). **G-blocks are the
attract-mode self-playing demo; P-blocks are real play.** It explains both enumerated
differences at once, including why the abort cue is silent in a demo nobody can abort.

It is labelled a claim deliberately. A pre-setup measurement becomes the context's Background
and outranks the story, so an SM error arrives wearing the word MEASURED. TEA verifies it.

**The nuance a naive statement gets wrong, and AC2 exists for it:** there are exactly **two**
G-blocks against **seven** P-blocks (P1DEC..P7DEC). The duality is knights-only, so the `P`
prefix on P3DEC–P7DEC does not mean "real play" — buzzards have no joystick and no attract
variant.

### Two rulings taken from the user, both with the census attached

An either/or in an AC makes RED unspecifiable, so both were settled before setup rather than
after a discarded RED.

1. **Re-anchor** `playerWingUp`/`playerWingDown` to `P1DEC :5552`. Worth recording *why the
   recommendation changed*: the shipped comment argues for leaving them, and that argument was
   correct when `:5544` was merely "an arbitrary but true row". Once `:5544` is known to be the
   **attract-demo** binding, a cue fired by a human in real play citing the demo block is
   misleading even though the bytes are identical. The measurement flipped the answer — which
   is precisely what the story asked it to do.
2. **Prose + a ROM-citation guard**, not a structured `family` field on `CUE_SOURCES`. The
   structured option was priced honestly as stronger but past 3 points, and declined.

### One observation SM could not settle — passed on as a question, not a guess

`plugins/joust/src/core/demo.ts` is 1602 lines and emits its own cue stream, and `SNPTREF` is
modelled by **no cue at all** (it survives only inside verbatim strings). So there is no
*current* audible G/P divergence — nothing is broken today. Whether `demo.ts`'s cue stream
should cite the G-family is a real question this story does not close. TEA should rule it in
scope or file it; a descoped finding must end with a filed story id or a named existing owner.

### Setup bookkeeping

- The story carried **no** acceptance criteria. Six were authored from the corrected premise and
  the two rulings, written to `sprint/epic-jt5.yaml` with `--add-ac`, then mirrored into the
  session and context. Byte-exactness was confirmed by parsing the YAML and testing `in` against
  both files — not by grep, which has produced false zeroes here before.
- The context file was authored by hand rather than generated, because the generator renders the
  raw description verbatim and would bury the corrections. It carries a do-not-regenerate note.
- The epic was re-parsed after every mutation: 23 stories intact, no story with a wrong `repos`,
  no conflict markers anywhere under `sprint/`.
- The description's original text was **appended to, not rewritten**, so what was filed stays
  legible beside what was measured.
- No dev-server port probe was run: this story changes citations, comments and a vitest guard,
  and has no served-page acceptance criterion.
## Delivery Findings
<!-- Append-only. Never edit another agent's entries. -->

### TEA (test design)

- **Question** (non-blocking): SM's open question — whether `demo.ts`'s cue stream should cite the
  G-family — is answered NO FOR THIS STORY, and the reasoning is worth keeping. Every AC here is
  about `CUE_SOURCES` and the recorded model in `audio-manifest.ts`; none reaches `core/demo.ts`,
  and no cue in the port models `SNPTREF`, so there is no audible G/P divergence to fix today.
  Affects nothing in this story's diff (recorded so the question is not re-opened cold).
  *Found by TEA during test design.*

- **Improvement** (non-blocking): `plugins/joust/src/core/demo.ts:183` and `:1310` cite
  `P1DEC`/`P2DEC` (`:5551`, `:5555`) for the `EGGS1`/`EGGS2` cells — the REAL-PLAY block, cited
  from the module that IS the demo. Measured: `:5543`/`:5551` are byte-identical, as are
  `:5547`/`:5555`, so both citations are TRUE and nothing is broken. But this is the same latent
  imprecision jt5-23 removes for the wing cues, one subsystem over, and it will read as an
  inconsistency the moment the G/P model lands in the manifest. Affects
  `plugins/joust/src/core/demo.ts` (two comments need the G/P duality noted, or a deliberate note
  that the cells are family-independent). **Needs a filed story — checked and NOT owned by
  `ad1-4`:** that story's mechanism is wiring an attract MODE, and doing it exactly as titled
  would not correct a citation. *Found by TEA during test design.*

- **Gap** (non-blocking): `ad1-4` ("joust attract simulation — wire GOVER_ATTRACT (0x7f), the
  ROM's game-SIMULATION mode, then opt in") is a TITLE WITH AN EMPTY BODY — `description` is
  null and `acceptance_criteria` is empty. Its title names the exact mechanism this story
  measured, so whoever picks it up will re-derive `GOVER`, the `:1025-1029` selection site and
  the two-G-blocks-against-seven census from scratch. Affects `sprint/epic-ad1.yaml` (ad1-4's
  description should carry this story's measured model and point at the record the manifest is
  about to gain). *Found by TEA during test design.*


### Dev (implementation)

- **Improvement** (non-blocking): `JT51-009` in `plugins/joust/docs/rom-study/claims/audio.json`
  carries TWO false clauses, both PRE-EXISTING and neither caused by this story. (1) It says
  SNPCR1 "is bound to the knight through **P1DEC's** decision block rather than a direct load
  (**JOUSTRV4.SRC:5544**)" — but :5544 is **G1DEC's** row; P1DEC's is :5552. That is the exact
  label-names-one-family-while-the-line-names-the-other misattribution jt5-6 corrected in the
  manifest and left uncorrected in the dossier. (2) It says "P2 carries its own table SNPCR2
  (:8119), **which jt5-1 collapses onto this one**" — jt5-6 UN-collapsed that; `player2Materialise`
  now exists and cites SNPCR2 itself, so the clause describes a port that no longer exists.
  Both ship GREEN because the citation gate re-opens the `source` line only and never reads
  `claim` prose — a limit `tools/audit/check-citations.mjs:36-42` states about itself.
  Affects `plugins/joust/docs/rom-study/claims/audio.json` (JT51-009's claim text). Deliberately
  NOT fixed here: no AC names it and no test demands it, so fixing it would be unrequested scope.
  **Needs a filed story.** Suggested correction, verified against the ROM: replace "P1DEC's
  decision block rather than a direct load (JOUSTRV4.SRC:5544)" with "a decision-block binding
  rather than a direct load (P1DEC :5552)", and drop the "which jt5-1 collapses onto this one"
  clause. *Found by Dev during implementation.*

### Reviewer (audit)

- **Question** (non-blocking): `JOUSTRV4.SRC:645-650` carries an `IFN DEBUG` guard asserting a
  `PDECSN` pointer lies in `[P1DEC, P7DEC]`, `SWI`-ing with "THIS IS NOT A DECISION BLOCK"
  otherwise. `G1DEC`/`G2DEC` (`:5542`/`:5546`) sit BELOW `P1DEC` (`:5550`), so on its face a
  G-block pointer fails that range test. I did NOT establish whether the path is reachable while
  a G-block is installed — it is inside `GAMOVR` and debug-only — so this is offered as a
  question with the check named, never as a claim. Affects nothing in this port today; it is
  potential ROM-fidelity quarry for `ad1-4` (the attract-simulation story), and it is
  independent structural evidence that the G/P split is real. *Found by Reviewer during audit.*

- **Confirmation** (non-blocking): Dev's `JT51-009` finding is CORRECT and I re-verified both
  halves independently — `:5544` is G1DEC's row while the claim says P1DEC's, and
  `player2Materialise` exists in the manifest citing SNPCR2 `:8119`, so "which jt5-1 collapses
  onto this one" describes a port that no longer exists. Dev was right not to fix it here (no AC
  names it). Affects `plugins/joust/docs/rom-study/claims/audio.json` — **this must end with a
  filed story id at finish, not an archive note.** *Found by Reviewer during audit.*

## Design Deviations

### TEA (test design)

- **AC1's "the port records" is tested against `audio-manifest.ts` specifically**
  - Spec source: context-story-jt5-23.md, AC1
  - Spec text: "The port records WHAT the two decision-block families are, citing the ROM
    selection site verbatim"
  - Implementation: every prose assertion reads `plugins/joust/src/shell/audio-manifest.ts`
    and no other file
  - Rationale: that is where both existing G/P comments live and where the citations the story
    is about are declared; a tree-wide scan would let the record land anywhere and still pass,
    including in a test file
  - Severity: minor
  - Forward impact: if Dev prefers to record the model in a doc under `docs/rom-study/`, these
    tests must be re-pointed — the record's LOCATION is pinned, its wording is not

- **AC2 is tested as "names at least TWO distinct creature blocks" rather than as its prose**
  - Spec source: context-story-jt5-23.md, AC2
  - Spec text: "the P prefix on P3DEC-P7DEC (buzzards, pterodactyl) does NOT denote
    real-play-versus-attract the way it does on P1DEC/P2DEC"
  - Implementation: the guard counts distinct `P[3-7]DEC` symbols in comment text and requires
    two or more, instead of matching the sentence
  - Rationale: a single-symbol check was written first and a mutation SURVIVED it — the
    unrelated sentence citing `:5560` for the enemy wings also says `P3DEC`, so deleting the
    knights-only claim left the test green. Stating an excluded RANGE requires naming its span;
    mentioning one block does not
  - Severity: minor
  - Forward impact: a record that excludes the creature blocks without naming two of them (e.g.
    "the five creature blocks") reddens and must name the range

- **AC6 is tested by PROXIMITY (one 12-comment-line window) rather than by presence**
  - Spec source: context-story-jt5-23.md, AC6
  - Spec text: "The recorded rationale explains why the pre-jt5-23 citation was ALSO true —
    SNPLWU,SNPLWD open all four knight rows (:5544, :5548, :5552, :5556) identically"
  - Implementation: some window of comment lines must contain the wing-table names AND a G-block
    row AND a P-block row together
  - Rationale: two successive presence-based drafts were VACUOUS. The first scanned the whole
    file, where `SNPLWU,SNPLWD` opens the `verbatim:` of four citations; the second scanned
    comments, where jt5-3's unrelated GOFLIP/GOFLAP sentence names `SNPLWU/SNPLWD` too. The claim
    is about identity ACROSS the families, so the tables and both families must be discussed in
    one place — and neither pre-existing sentence can satisfy that
  - Severity: minor
  - Forward impact: Dev must keep the explanation contiguous; splitting it across distant
    comments reddens even if every fact is present

### Dev (implementation)

- **Corrected a claim file no acceptance criterion names**
  - Spec source: context-story-jt5-23.md, AC4
  - Spec text: "playerWingUp and playerWingDown re-anchor their callSite from line 5544 (G1DEC,
    the attract-demo binding) to line 5552 (P1DEC, real play)"
  - Implementation: also edited `JT53-006` in `plugins/joust/docs/rom-study/claims/audio.json`
  - Rationale: that claim asserted :5544 was "the jt5-3 call site for both player wing cues".
    AC4 makes that sentence FALSE, and the citation gate would have passed it forever — it
    re-opens the `source` line and never reads claim prose. Shipping AC4 without this edit means
    shipping a falsehood the story itself created. The claim's `source` (file, line, verbatim) is
    byte-unchanged; only the prose moved
  - Severity: minor
  - Forward impact: none — the claim is now true about :5544 AND records where the citation went

- **Edited the jt5-6 comment block, which no acceptance criterion names**
  - Spec source: context-story-jt5-23.md, AC1
  - Spec text: "The port records WHAT the two decision-block families are"
  - Implementation: rewrote the closing sentence of the jt5-6 comment at `audio-manifest.ts:218-223`
  - Rationale: it read "Nothing in this port models the G/P distinction — see the session's
    Delivery Findings", which AC1 makes false by construction. Leaving it would have left the file
    asserting the absence of the thing sitting 100 lines below it
  - Severity: minor
  - Forward impact: none — it now points at the record instead of denying it exists

### Reviewer (audit)

**TEA's three deviations — all ACCEPTED.**
- *AC1 tested against `audio-manifest.ts` specifically* → ✓ ACCEPTED: pinning the record's
  LOCATION while leaving its wording free is the right trade, and the forward impact is stated.
- *AC2 tested as "names at least TWO distinct creature blocks"* → ✓ ACCEPTED: driven by a
  survived mutation, and the rationale (an unrelated `:5560` sentence also says `P3DEC`) is
  reproducible — I re-ran it.
- *AC6 tested by PROXIMITY* → ✓ ACCEPTED, and it is the strongest guard in the suite. Two
  presence-based drafts were vacuous; the window form is the only one that expresses "identical
  ACROSS the families".

**Dev's two deviations — both ACCEPTED.**
- *Corrected `JT53-006`, which no AC names* → ✓ ACCEPTED: AC4 falsified that claim's "call site"
  clause, and the citation gate re-opens `source` only (`tools/audit/check-citations.mjs:36-42`
  says so about itself), so it would have shipped green forever. Fixing a falsehood your own
  change creates is not scope creep. Verified the `source` line/verbatim are byte-unchanged.
- *Edited the jt5-6 comment block, which no AC names* → ✓ ACCEPTED: "Nothing in this port models
  the G/P distinction" is falsified by AC1 by construction.

**UNDOCUMENTED deviation found by Reviewer — none.** Every file touched is accounted for by an
AC or a logged deviation. The diff is two files and I traced each hunk to an AC.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/joust/tests/audio-decision-block-families.test.ts` — the G/P decision-block model,
  the two re-anchored knight wing citations, and the corrections to the shipped record.

**Tests Written:** 21 tests covering 6 ACs — **10 failing, 11 green-on-arrival (all declared below)**
**Status:** RED (ready for Dev)

### The RED / green split, and why 11 tests pass on arrival

| Group | Red | Green | What the green ones are |
|---|---|---|---|
| ORACLE | 0 | 7 | Facts about the frozen 1982 source |
| AC1 | 3 | 0 | — |
| AC2 | 1 | 1 | Guard: the record must not invent a `G3DEC` |
| AC3 | 1 | 0 | — |
| AC4 | 2 | 2 | Guards: the verbatim must move WITH the line; the enemy cues must NOT move |
| AC5 | 1 | 1 | Guard: two knight wing cues, not four — structural, from `CUE_SOURCES` |
| AC6 | 2 | 0 | — |

Every AC has at least one failing test. The seven ORACLE tests assert what `JOUSTRV4.SRC` says
at the selection site, the census and the four knight rows. They cannot fail today and are not
padding: every RED assertion below is phrased as "a P-block", "the selection site", "the
census", and if the oracle were wrong this story would record a falsehood while all ten RED
tests went green against it. Pinning line numbers against the vendored tree is safe in a way
that pinning them against a live file is not — it is immutable history, never edited. Where the
subject IS a live file (the manifest's own citations) the tests assert by RESOLUTION instead:
they open the cited line and ask which block owns it, so a legitimate renumber cannot break them
and a citation that stops pointing at its subject must.

### Mutation battery — 9 designed, 9 caught, 0 survived, 0 anchor misses

Run against a throwaway implementation, source restored from a `cp` backup between each.

| # | Mutation | Caught by |
|---|---|---|
| M1 | verbatim left on the G row while the line moves | AC4 re-opens |
| M2 | enemy wing cues dragged onto the knight block | AC4 enemy cues do not move |
| M3 | record invents a `G3DEC` | AC2 no invented symbol |
| M4 | identical-rows explanation deleted | AC6 proximity |
| M5 | `PDECSN` dropped from the record | AC1 names the symbols |
| M6 | `WCPIAB` corroboration dropped | AC1 attract vs real play |
| M7 | selection cited by a bare branch line only | AC3 cited lines re-open |
| M8 | creature blocks no longer named | AC2 range, not passing mention |
| M9 | the re-anchor reverted (the story's own defect) | AC4 (4 tests red) |

**The battery is what made this suite honest, and it took three rounds.** M4 and M8 both
SURVIVED the first run, and both were the same defect: a claim about what the record SAYS,
asserted against a surface where something else could satisfy it. M4's assertion scanned the
whole file for `SNPLWU,SNPLWD` — a string that opens the `verbatim:` of four call-site
citations, so it was reading the DATA and scoring it as the PROSE and **could never fail**.
Scoping to comments fixed M8 but not M4, because jt5-3's unrelated GOFLIP/GOFLAP sentence names
`SNPLWU/SNPLWD` as well. Only a proximity window — the tables and both families' rows discussed
together — expresses the actual claim. Two vacuous tests found and fixed; had the battery been
skipped, the suite would have shipped with an AC6 guard that no implementation could ever fail.

Two mutations also ANCHOR MISSED on the first run (`line: 5560,` and `line: 5552,` each occur
three times, not once). A mutation that fails to apply is indistinguishable from one that was
caught and scores the suite as safer than it is, so the battery asserts its anchor count and
prints `ANCHOR MISS` loudly rather than skipping silently.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | How it is covered | Status |
|------|-------------------|--------|
| #1 type-safety escapes | Zero `as any` / `as unknown as` / `@ts-ignore` / non-null assertions. Three `as {callSite: Citation}` casts written in the first draft were replaced by `isRom()`, a type predicate whose narrowing IS a runtime `kind` check, plus `romEntries()` | clean |
| #2 generics/interfaces | `Readonly<Record<…>>` on the manifest surface; `KNIGHT_WING_CUES` is `as const` | clean |
| #4 null/undefined | `lines[n - 1] ?? ''` in `owningLabel`, `m ? m[1] : ''` in `manifestComments` — every index read has a defined fallback | clean |
| #5 module/declaration | Mirrors the manifest's types rather than importing them, preserving the module's import-freedom (the sample bake reads it under plain node) | clean |
| #8 test quality | Every test carries a meaningful assertion; **2 vacuous tests found and fixed** by the battery (see above). Negative assertions (`.not.`, `toBe(false)`, `toEqual([])`) are each paired with a precondition so they cannot pass on an empty stream | clean |
| #3, #6, #7, #9–#14 | N/A — no enums, no JSX, no async control flow beyond `await import`, no build config, no user input, no state machine in this diff | n/a |

**Rules checked:** 6 of 6 applicable rules have coverage. **Self-check:** 2 vacuous tests found and fixed.

### What Dev needs to know

1. **`audio-manifest.ts` may gain NO imports.** Its own header says so and
   `audio-transporter-split.test.ts:652-658` enforces it — the deploy-time sample bake reads
   this module under plain `node`. Everything this story needs is prose plus two literal edits.
2. **`framesFor` reads `source.source.verbatim`, never `callSite`** (verified at
   `audio-manifest.ts:535-540`), so re-anchoring a call site cannot shift a frame window or a
   baked `.wav` length. The re-anchor is citation-only.
3. **Nothing else in the tree pins the wing cues to `:5544`.** Checked explicitly: the
   `8125`/`8126` references in `audio-flap.test.ts` and `audio-priority.test.ts` are to the
   TABLE definition, not the call site. `audio-flap.test.ts:244` quotes ROM line 5544's content
   as a ROM fact — that stays true and must NOT be "fixed".
4. **The two surfaces are deliberately different.** `:5544` must remain discussed in the comment
   (AC6) while disappearing from every `callSite` (AC4). One test asserts exactly this pairing,
   so satisfying AC6 by deleting the discussion, or AC4 by scrubbing the number everywhere, each
   redden the other.
5. A throwaway implementation satisfying all 21 tests was built, run against the full suite, and
   deleted. It is not a suggested patch — but it proves the ACs are jointly satisfiable, which
   is the one thing a RED phase must not leave in doubt.

### Suite state (attribution)

- Baseline before this story: `--project joust` 98 files / 2385 tests, **all green**.
- With the RED file added: `--project joust --project shared` 126 files / 2934 tests →
  **10 failed, 2924 passed**. Every failure is in this story's new file; no sibling test moved.
- `npm run lint` (`tsc --noEmit`) is **clean**, and `npm run test:orchestrator` was 372/372 when
  measured against the throwaway.
- One thing that looked like a defect and was not: `bake-samples.test.mjs` fails under a direct
  `node --test` invocation (unresolved extensionless import). It is collected and green under
  vitest's joust project — the wrong invocation, not a broken test.

**Handoff:** To Bicycle Repair Man (Dev) for implementation.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/shell/audio-manifest.ts` — the recorded G/P model, the two re-anchored
  knight wing call sites, and the two sentences the record falsified.
- `plugins/joust/docs/rom-study/claims/audio.json` — `JT53-006`'s prose (its `source` is
  byte-unchanged).

**Tests:** 2934/2934 passing across `--project joust --project shared` (126 files, GREEN).
`npm run lint` (`tsc --noEmit`) clean; `npm run test:orchestrator` 372/372.
**Landed on:** `main` — trunk-based, no PR (label deliberately not the token the finish parser
scrapes; see the Story Details field).

### How each AC was discharged

| AC | Discharged by |
|----|---------------|
| AC1 | The record quotes the selection site (:1025-1029, mirrored :1041-1045), names `GOVER` and `PDECSN`, and carries both corroborations — `P1JOY`/`WCPIAB` and `G1JOY`/`G2JOY` beside `ATTRCT` |
| AC2 | A dedicated KNIGHTS-ONLY paragraph: two G-blocks against seven P-blocks, P1DEC :5550 through P7DEC :5574, and why the `P` prefix does not mean real play for five of them |
| AC3 | `audio-decision-block-families.test.ts` re-opens every line the record cites and requires the span to carry the G-load, the `GOVER` test, the P-load and the `PDECSN` store |
| AC4 | `playerWingDown`/`playerWingUp` now cite `line: 5552` with P1DEC's verbatim; the guard resolves the cited line to its owning label rather than comparing numbers |
| AC5 | The "These four cite the G-BLOCK row" sentence is gone, replaced by the measured count — only these two were ever G-cited, the enemy pair cites :5560 (P3DEC) |
| AC6 | The record keeps the identical-rows fact, enumerating all four knight rows, so the re-anchor reads as a precision gain and `audio-flap.test.ts:244` is not "corrected" by a later reader |

### Mutation battery against the DELIVERED code — 11 designed, 11 caught, 0 survived

TEA's battery scored a throwaway with different wording; this one scores what ships.

Two mutations are worth naming because they are the ones a weaker guard passes:

- **D2 — the CONSISTENT wrong family.** Both the line AND the verbatim moved together to G2DEC
  :5548, so nothing is internally inconsistent and every drift-style check ("does the quote match
  the cited line?") sails past. It is caught only by resolving :5548 to its owning label. That is
  the proof the AC4 guard tests *family membership* and not merely *self-consistency*.
- **D3 — the drift.** The line moved and the verbatim did not, which the re-opens guard catches.
  D2 and D3 together show the two guards are complementary rather than redundant.

**Three mutations SURVIVED on the first run and none was a coverage gap — all three were bad
mutations, and proving that mattered more than the raw score.** D4 removed one of *two* `PDECSN`
mentions, D6 and D7 each removed one of *two* selection-window citations; in every case the
record still genuinely had the property the test asserts, so passing was correct. Re-run with
the redundancy removed (`D4b`, `D6b` — both mentions, both citations), **both were caught**.
Per the sidecar rule, a survivor is re-run with the corrected string rather than recorded as a
survivor: reporting 9/12 here would have understated the suite, and reporting 12/12 without the
re-run would have overstated what was actually exercised.

### Notes for the Reviewer

1. **Nothing in the ROM changed and no cue's audio changed.** `framesFor` derives windows from
   `source.source.verbatim` (`audio-manifest.ts:535-540`), never from `callSite`, so re-anchoring
   a call site cannot move a frame window or a baked `.wav`. Verified: `FRAME_DURATIONS` is
   identical before and after (the full suite pins those totals).
2. **`audio-flap.test.ts:244` still quotes ROM line 5544 and still passes.** That is a statement
   about the ROM, not about our citation, and it must stay — the record says so explicitly so a
   later reader does not "fix" it.
3. **The manifest gained no imports.** `audio-transporter-split.test.ts:652-658` enforces this
   (the deploy-time sample bake reads the module under plain `node`); the change is comments and
   two literals.
4. **The two `:5544` surfaces are deliberately different** — discussed in prose (AC6), absent from
   every `callSite` (AC4). One test asserts exactly that pairing, so neither can be satisfied by
   scrubbing or by deleting.
5. **One pre-existing false claim was found and deliberately NOT fixed** — `JT51-009`, logged as a
   Delivery Finding with verified replacement text. It needs a filed story.

**Handoff:** To The Argument Professional (Reviewer).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | assessed by Reviewer directly | none | N/A — mechanical data gathered inline (diff, suite, lint, orchestrator, race probe) |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled | none | N/A |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled | none | N/A |
| 4 | reviewer-test-analyzer | Yes | Skipped / disabled | none | N/A |
| 5 | reviewer-comment-analyzer | Yes | Skipped / disabled | none | N/A — **domain assessed by Reviewer directly; it is where both findings live** |
| 6 | reviewer-type-design | Yes | Skipped / disabled | none | N/A |
| 7 | reviewer-security | Yes | Skipped / disabled | none | N/A |
| 8 | reviewer-simplifier | Yes | Skipped / disabled | none | N/A |
| 9 | reviewer-rule-checker | Yes | Skipped / disabled | none | N/A |

**All received:** Yes (1 assessed inline, 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed, 0 dismissed, 0 deferred

`pf settings get workflow.reviewer_subagents` reports `preflight: true` and the other eight
`false`. **`comment_analyzer` is disabled and this story is almost entirely prose** — the same
structural hole that took jt8-6 to three rejection rounds and mg1-5 to four. That domain was
therefore worked by hand, by opening every ROM line the record cites rather than re-reading the
sentences. Re-reading found nothing; opening the source found both real defects.

## Reviewer Assessment

**Verdict:** REJECTED
**Rounds:** 1
**Blocking:** 1 High

The mechanism is right, the tests are unusually strong, and the citation that AC4 moves is
correct. The rejection is for a **false claim in the permanent record** — in a story whose entire
deliverable is that the record can be trusted.

### Findings

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| 1 | **HIGH** | The `G1JOY`/`G2JOY` corroboration is wrong in both halves: the extent starts inside an unrelated routine and ends before the evidence, and the "attract region" adjacency does not exist | `audio-manifest.ts:344-345` + 3 more |
| 2 | MEDIUM | "a buzzard has no joystick" — the ROM populates that field for buzzards | `audio-manifest.ts:358` |
| 3 | MEDIUM | AC3's resolution guard covers ONE of the record's citation groups; the rest are unguarded, which is how finding 1 shipped green | `audio-decision-block-families.test.ts:390-410` |
| 4 | LOW | A ROM comment is quoted with its double space collapsed | `audio-manifest.ts:348-349` |

---

#### 1. [HIGH] `(:601-616)` cites the wrong span, and "sit in the attract region beside ATTRCT" is false

The sentence reads:

> `G1JOY`/`G2JOY` (:601-616) compute a joystick and sit in the attract region beside
> `ATTRCT CLR GOVER` (:712).

**Both halves fail when the lines are opened.**

*The extent is wrong at both ends.* `:601` is `BNE G2JOY` — a branch **inside `L2EGG`**
(`:597`), an unrelated routine. It is a reference to the label, not the routine. The
G-joystick routine actually begins at `:615`/`:616` and runs to its `RTS` at `:626`. So the
cited span opens in the wrong routine and **stops ten lines before the evidence**: `STD CURJOY`
at `:625` is the only line in the ROM that makes "compute a joystick" true, and it sits outside
the citation. A reader who opens `:601-616` sees the labels, believes the claim, and never
learns the span was chosen wrongly — a truncated extent *manufactures* corroboration.

*The adjacency is false.* `G1JOY`'s routine ends at `:626`. `GAMOVR` occupies `:628-...`.
`ATTRCT` is at `:712` — a different routine, under the ROM's own `* ATTRACT MODE` header at
`:710`, with a whole routine in between. "Sit … beside" asserts a proximity that is not there.

**The decisive evidence was three lines from the label and was not cited.** `:613` reads:

```
*	GAME SIMULATION PLAYER COMMANDS
```

That is the ROM's own section header for `G2JOY`/`G1JOY`, and it states the record's thesis
outright — far stronger than an adjacency argument, and it cannot be misread. The record
reached for a spatial claim when a definitional one was adjacent.

**Why HIGH rather than Medium.** Nothing guards it: the suite is green at 2934/2934 with the
falsehood in place, because AC3's resolution check filters citations to the `:1025-1029` /
`:1041-1045` windows and never opens `:601`, `:616` or `:712`. This is the project's documented
worst case — an unguarded false ROM claim shipping green — and it is the exact defect class this
story exists to remove from the manifest.

**It appears in FOUR places, and the pipeline drafted all of them.** I wrote the first as TEA and
Dev carried it forward; that is worth saying plainly rather than filing it as someone else's slip.

- `plugins/joust/src/shell/audio-manifest.ts:344-345` (the record)
- `plugins/joust/tests/audio-decision-block-families.test.ts:21-22` (file header — says
  "immediately beside", which is worse)
- `.../audio-decision-block-families.test.ts:226` (describe title: "G-blocks live in the attract region")
- `.../audio-decision-block-families.test.ts:235` (assertion message: "and it sits in the attract routine")

**Verified replacement text** (re-derived from the source, not reworded from the original):

> `G1JOY`/`G2JOY` (:615-626, under the ROM's own header `* GAME SIMULATION PLAYER COMMANDS`
> at :613) compute the knight's commands in software — `STD CURJOY` at :625 — with no panel
> read anywhere in the routine.

Note this drops the `ATTRCT`/`:712` clause entirely rather than repairing it. Per the mg1-5
lesson: when a claim fails, stop correcting its values and ask what it should stop asserting.
`:712` remains a legitimate citation for what `GOVER` means at game-over, but it is not evidence
about where `G1JOY` lives. The ORACLE test's `l[711]` assertion may stay — only its message
("and it sits in the attract routine") must go.

#### 2. [MEDIUM] "a buzzard has no joystick" — the field is populated for buzzards

`audio-manifest.ts:357-358` justifies the knights-only claim with "a buzzard has no joystick and
no attract counterpart." The conclusion is TRUE and well-evidenced; this *reason* is not.
`PDECSN` is the same field for every creature, and the buzzard blocks populate it: `P3DEC`
(:5558) opens `AUTOFF,AUTOFF` and `P4DEC` (:5562) opens `LINET,BOUNDR`, in exactly the slots
where `P1DEC` carries `P1JOY,P1JOY`. The ROM calls that field *intelligence* at `:644`
(`LDY PDECSN,X  INTELLIGENCE IS NOW NILL`).

So a buzzard has a decision routine in the joystick field — it simply never reads the panel.
Suggested: "a buzzard's decision field holds an AI routine (`AUTOFF`, `LINET`/`BOUNDR`) rather
than a panel read, so there is no human input for an attract variant to substitute."

#### 3. [MEDIUM] [TEST] The resolution guard checks one citation group out of five

`audio-decision-block-families.test.ts` filters cited line numbers to
`(n >= 1025 && n <= 1029) || (n >= 1041 && n <= 1045)` before re-opening them. Every other
citation the record makes — `:601-616`, `:712`, `:7247`, `:8122`, and the four knight rows —
is asserted in prose and verified by nobody. Finding 1 is the proof this matters: it is a
false citation that the suite reports as green.

This is not a demand to widen the guard tree-wide inside this story. The narrow, honest fix is
to extend the same resolution idiom to the corroboration citations the record leans on — open
`:7247` and assert it contains `WCPIAB`, open the G-joystick span and assert it contains
`CURJOY`, open `:8122` and assert it defines `SNPTREF`. Three assertions, same helper.

#### 4. [LOW] A quoted ROM comment collapses a double space

`audio-manifest.ts:348-349` quotes `"PLAYER ABORTED FADING IN (TRANSPORTER)"`. The ROM
(`:8122`) reads `PLAYER ABORTED FADING IN  (TRANSPORTER)` — two spaces. In a file where
`romComment` fields are byte-exact and a citation gate compares bytes, a quoted string that is
not byte-exact invites a reader to paste it into a search and conclude the line is missing.

### Observations

- `[VERIFIED]` **The selection mechanism is correctly read.** `:1025-1029` is
  `LDX #G1DEC` / `LDA GOVER` / `BGT` / `LDX #P1DEC` / `STX PDECSN,Y`; `BGT` is
  branch-if-greater-than-zero, so "GOVER above zero selects the G-block" is exact, as is the
  mirror at `:1041-1045`. This is the story's central claim and it holds.
- `[VERIFIED]` **The census is exact.** `grep -E '^(G|P)[0-9]DEC\tFDB\t'` returns exactly
  `G1DEC, G2DEC` and `P1DEC … P7DEC`, matching "two against seven (P1DEC :5550 through P7DEC
  :5574)".
- `[VERIFIED]` **"the ONLY sound the two families disagree on" is exact for the same knight.**
  `:5544` vs `:5552` differ solely at slot 8 (`0` vs `SNPTREF`); slot 9 is `SNPCR1` in both.
  I checked slot 9 specifically because it is where the two KNIGHTS differ, which is a
  different axis and an easy conflation.
- `[VERIFIED]` **AC4 changes no audio.** `framesFor` reads `source.source.verbatim`
  (`audio-manifest.ts:535-540`) and never `callSite`, so no frame window or baked `.wav` moves.
  `FRAME_DURATIONS` totals are pinned by `audio-priority.test.ts` and unchanged.
- `[VERIFIED]` **The manifest stayed import-free.** `audio-transporter-split.test.ts:652-658`
  enforces it for the plain-node sample bake; the diff adds comments and two literals only.
- `[VERIFIED]` **`JT53-006`'s `source` is byte-unchanged** — line 5544 with the G-row verbatim;
  only the claim prose moved, and the JSON parses to 36 claims.
- `[GOOD PATTERN]` **AC4 asserts family membership by resolution, not by number.** Dev's own
  battery included the mutation that proves this matters: moving line AND verbatim together to
  G2DEC `:5548` is internally consistent and defeats every drift-style check, and is caught only
  by resolving the line to its owning label. That is the ad1-2 "agreed-upon wrongness" lesson
  applied correctly.
- `[GOOD PATTERN]` **Both batteries reported their own failures honestly.** TEA recorded two
  vacuous tests it had written; Dev re-ran three survivors, found them to be bad mutations
  rather than coverage gaps, and proved it with corrected mutations instead of claiming the
  score. That is why I trusted the batteries enough to spend my time on prose instead.
- `[OBSERVATION — not a finding, needs verification before anyone acts on it]` `:645-650` holds
  a `IFN DEBUG` assertion that a `PDECSN` pointer lies within `[P1DEC, P7DEC]`, `SWI`-ing with
  "THIS IS NOT A DECISION BLOCK" otherwise. `G1DEC`/`G2DEC` (`:5542`/`:5546`) sit BELOW `P1DEC`
  (`:5550`), so on its face a G-block pointer would fail that range check. I did **not**
  establish whether that path is reachable while a G-block is installed (it is in `GAMOVR`, and
  only in debug builds), so this is a question, not a claim. It is interesting because it is
  independent structural evidence that the G/P split is real, and because it would be a genuine
  ROM curiosity if reachable.

### Rule Compliance — TypeScript lang-review checklist

Enumerated against every changed symbol in the diff. The diff adds no types and no functions to
production code; the type surface is entirely in the test file.

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| #1 type-safety escapes | `isRom`, `romEntries`, `load<T>`, all 21 `it()` bodies | compliant — zero `as any`/`as unknown as`/`@ts-ignore`/`!`; the only casts are `as Partial<T>` (the pre-existing loader idiom, mirrored from `audio-rom-citations.test.ts:101`) and `as const`. `isRom` is a predicate whose narrowing IS a runtime `kind` check, satisfying "type predicates without runtime validation inside" |
| #2 generics/interfaces | `CueSource`, `RomCueSource`, `Citation`, `KNIGHT_WING_CUES`, `G_BLOCK_SOUND_ROWS` | compliant — `Readonly<Record<…>>` on the manifest surface, `as const` on the cue tuple. `G_BLOCK_SOUND_ROWS` is a mutable `number[]`; it is module-private and never mutated — LOW, not worth a finding |
| #3 enums | none in diff | n/a |
| #4 null/undefined | `owningLabel` (`lines[n-1] ?? ''`), `manifestComments` (`m ? m[1] : ''`), `vendoredLines`, `cueSources` | compliant — every index read has a defined fallback; `??` used, never `||` |
| #5 module/declaration | the mirrored `Citation`/`CueSource` types | compliant — and required: importing them would break the plain-node bake |
| #7 async | `cueSources()`, the `await import` | compliant — no swallowed rejections; `load` catches and returns `{}` so a missing module surfaces as the explicit "must export CUE_SOURCES" error |
| #8 test quality | all 21 tests | compliant — every negative assertion is paired with a precondition; the two vacuous tests TEA found were fixed before commit |
| #10 security / input validation | no user input in diff | n/a |
| #11 error handling | `vendoredLines`, `owningLabel`, `cueSources` throw self-describing errors | compliant |
| #14 derived edges | no state machine in diff | n/a |


### Specialist domains — assessed by hand (8 of 9 disabled)

Each disabled specialist's domain was worked directly. Tags recorded so the dispatch record is
complete rather than implied.

- `[DOC]` **CONFIRMED — findings 1, 2 and 4.** Every ROM line the record cites was re-opened.
  Two claims failed and one quotation is not byte-exact. This is the domain with no specialist
  and it is where 3 of the 4 findings live.
- `[TEST]` **CONFIRMED — finding 3.** The resolution guard filters to one citation window, so
  four of the record's five citation groups are unverified. Otherwise the suite is strong: 21
  tests, both batteries mutation-proven, negatives paired with preconditions.
- `[EDGE]` **clean.** Boundary review of `owningLabel` (walks to line 0 and throws rather than
  returning a wrong label), `vendoredLines` (missing file throws; the `\r` strip is defensive),
  the `manifestComments` window loop (partial trailing windows are covered), and the absent-tree
  path (`describe.skipIf` with every read inside an `it()`, per the tp1-8 collection trap).
- `[SILENT]` **clean.** No swallowed errors introduced. The one `catch` (`load`) returns `{}`,
  and its caller converts that into an explicit "must export CUE_SOURCES" throw, so a missing
  module cannot masquerade as an empty manifest.
- `[TYPE]` **clean.** `isRom`/`romEntries` replaced three narrowing casts with a predicate that
  performs a real runtime check; the discriminated union is preserved and no field was widened.
- `[SIMPLE]` **clean.** The diff is comments plus two literals in production code. No
  abstraction was added; the record is prose, per the user's explicit ruling against a
  structured `family` field.
- `[SEC]` **n/a.** No user input, no auth, no I/O beyond reading two repo-local files inside
  tests. No tenant-bearing types exist in this codebase.
- `[RULE]` **clean.** Full enumeration in the Rule Compliance table above; the only note is a
  module-private mutable `number[]`, judged LOW and not filed.

### Challenging my own VERIFIEDs

The one I re-opened: I initially marked the corroboration paragraph VERIFIED because `P1JOY`
`:7247` checks out exactly. But the paragraph makes THREE claims, and verifying the first is not
verifying the sentence — the `G1JOY` half is finding 1. Recorded because it is the precise shape
this project keeps rediscovering: a claim checked by re-running the exact quoted string survives,
a claim checked by "the surrounding argument sounds right" does not.

### Devil's Advocate

Argue this change is broken. The strongest case is that it makes the manifest *more* trusted
while making it *less* accurate, which is worse than leaving it vague. Before this story the file
said "Nothing in this port models the G/P distinction" — an honest disclaimer that told a reader
to go and look. It now presents a confident, well-formatted, citation-dense model, and a reader's
willingness to check drops in exact proportion to how authoritative prose looks. One of its
corroborations is false. That is a net loss of truth per unit of confidence, and it is precisely
the trade the story was filed to prevent.

Second: the tests institutionalise the error. `audio-decision-block-families.test.ts` names a
describe block "G-blocks live in the attract region" — so the suite's own vocabulary now asserts
the false claim, and a future reader correcting the manifest will find a green test whose title
contradicts the correction and may back it out. A guard that encodes a falsehood in its NAME is
the `guard-tests-name-uncovered-cases` failure with the polarity reversed.

Third, on scope: the record asserts a demo/real-play split for the two knights, but nothing in
this port's demo actually consumes it. `core/demo.ts` emits its own cue stream and no cue models
`SNPTREF`. So the manifest now documents a distinction the code does not make — which is exactly
the state the story described as the problem, relocated from "no model" to "a model nothing
honours". TEA logged this and it is genuinely out of scope, but a reviewer should say plainly
that the story closes a documentation gap and opens a behaviour question.

Fourth, what would a confused reader do? Open `:601-616`, see `BNE G2JOY` at the top, and either
assume the citation is a range of *references* rather than a routine (learning a bad convention
from the file), or conclude the citation is broken and distrust the neighbouring ones — which are
correct. The blast radius of a wrong citation is not one line; it is the credibility of every
citation beside it.

What survives all this: the mechanism, the census, the slot-8 explanation and the re-anchor are
each independently verified above, and the guards are mutation-proven. The defects are in
supporting prose, they are precisely located, and the replacement text is supplied. This is a
one-round fix, not a redesign.

### What must change to APPROVE

1. Finding 1 in all four locations, using the supplied replacement text (or any wording that
   cites `:613`/`:615-626` and drops the `ATTRCT` adjacency).
2. Finding 2's reason clause.
3. Finding 4's quoted string, or drop the quotes.
4. Finding 3 is MEDIUM and non-blocking — fix it here if the three assertions are cheap, or it
   must be filed rather than dropped.

**Handoff:** back to Dev (rework), then re-review.
## TEA Assessment — round 2 (rework after REJECT)

**Tests Required:** Yes
**Test Files:** `plugins/joust/tests/audio-decision-block-families.test.ts` (extended)
**Tests Written:** 26 total (was 21) — **4 failing, 22 green**
**Status:** RED (ready for Dev)

### The findings were re-verified before any test was written

The Reviewer's four findings were checked against the vendored source rather than accepted —
the more so because the Reviewer and I are the same pipeline and finding 1 was **my** prose,
carried forward by Dev. All four hold:

| Finding | Re-verified |
|---|---|
| 1 — extent + adjacency | `:597` is `L2EGG`, `:601` is `BNE G2JOY` (a *reference*); the routine is `:613` header / `:615`-`:616` entry / `RTS` `:626`; `STD CURJOY` is `:625`; `GAMOVR` `:630` lies between it and `ATTRCT` `:712` |
| 2 — buzzard clause | `P3DEC` (:5558) opens `AUTOFF,AUTOFF`; `P4DEC` (:5562) opens `LINET,BOUNDR` — the same slots where `P1DEC` carries `P1JOY,P1JOY`; `:644` calls the field INTELLIGENCE |
| 3 — guard gap | the AC3 filter is `(n >= 1025 && n <= 1029) \|\| (n >= 1041 && n <= 1045)`; four other citation groups were unguarded |
| 4 — quotation | `:8122` really does carry two spaces before `(TRANSPORTER)` |

### What round 2 adds

Four guards, each the missing half of a finding. They are about the SHAPE of a citation, never
its wording:

1. **The G-joystick citation must be a RANGE that starts on the routine (`:613`/`:615`/`:616`)
   and reaches `:625`.** This is finding 3 aimed at finding 1: a truncated extent manufactures
   corroboration, so the guard demands the span reach the evidence rather than merely mention
   the label.
2. **No `:712` citation within the G-joystick window.** The false adjacency expressed as
   proximity rather than as a banned phrase — `:712` stays citable for what `GOVER` means.
3. **The knights-only reason must name a creature decision routine** (`AUTOFF`/`LINET`/`BOUNDR`),
   because the true statement cannot be made without naming what the field actually holds.
4. **A re-spaced string must not be presented as a quotation.**

I also corrected the same false claim in **my own file** — the header, a describe title and an
assertion message all asserted the attract adjacency. Those were three of the four locations
the Reviewer found.

### Guard battery — 5 mutants caught, 2 CONTROLS correctly stayed green

| # | Mutation | Expected | Got |
|---|---|---|---|
| R1 | extent back to `:601-616` | red | red |
| R2 | extent truncated to `:615-616` | red | red |
| R3 | `ATTRCT` adjacency reintroduced | red | red |
| R4 | creature routines unnamed | red | red |
| R5 | re-spaced quotation reintroduced | red | red |
| R6 | **control** — valid alternative extent `:613-626` | green | green |
| R7 | **control** — valid alternative extent `:616-626` | green | green |

The two controls matter as much as the five kills. A guard that only accepts the one span I had
in mind would be a wording pin wearing a citation's clothes; R6/R7 prove any honest citation of
the routine passes.

### One of my new guards was VACUOUS, and the battery did not catch it

Worth recording because the battery would have scored it as fine. The first draft of guard 4
asked "does the record contain the two-space form?" and bailed early if the phrase was absent.
The phrase *is* present — but the record **wraps it across two comment lines**, so
`/PLAYER ABORTED FADING IN/` never matched across the newline, the guard returned early, and it
passed having checked nothing. I found it by asking why a test I expected to be red was green,
not by mutating.

The deeper lesson changed the guard's design: **internal spacing is not preserved by wrapped
prose**, so "is this quotation byte-exact?" has no well-defined answer in a comment and any
guard claiming to check it is theatre. The well-defined rule is narrower — do not put quotation
marks around a string whose bytes you altered — and that is what now ships. This is the third
vacuous assertion this story has produced, all three of the same family: a claim about PROSE
asserted against a surface where something else (data, another sentence, a line break) decides
the outcome.

### Suite state

- `--project joust --project shared`: **4 failed, 2935 passed** (126 files). Every failure is one
  of the four new guards; nothing else moved.
- `npm run lint` clean. The manifest is byte-identical to the committed version — the throwaway
  that proved satisfiability (26/26) was reverted from a `cp` backup and `git diff` confirms it.

### What Dev must change

All four are in `plugins/joust/src/shell/audio-manifest.ts`; no test needs editing.

1. Replace the `G1JOY`/`G2JOY` sentence. The Reviewer's verified text: cite `:615-626` (or
   `:613-626`/`:616-626`), say the routine computes in software with `STD CURJOY` at `:625`, cite
   the ROM header `* GAME SIMULATION PLAYER COMMANDS` at `:613`, and **drop the `ATTRCT` clause
   entirely** rather than repairing it.
2. Replace "a buzzard has no joystick" with the accurate reason — the decision field holds an AI
   routine (`AUTOFF` for P3DEC, `LINET`/`BOUNDR` for P4DEC) rather than a panel read.
3. Either drop the quotation marks around the SNPTREF description or reproduce it exactly.
4. Nothing to do for finding 3 — the guards ARE the fix, and they are already in.

**Handoff:** To Bicycle Repair Man (Dev) for round-2 GREEN.
## Dev Assessment — round 2 (rework)

**Implementation Complete:** Yes
**Files Changed:** `plugins/joust/src/shell/audio-manifest.ts` only (prose; no data, no types)
**Tests:** 2939/2939 GREEN (126 files, `--project joust --project shared`); `npm run lint` clean;
`npm run test:orchestrator` 372/372.
**Landed on:** `main` (trunk-based, no PR).

### The findings were re-derived from the ROM, not pasted from the review

The Reviewer supplied verified replacement text, and the standing rule here is that the pipeline
drafted the original too — so every line was re-opened before writing:

| Line | Says |
|---|---|
| `:613` | `*\tGAME SIMULATION PLAYER COMMANDS` |
| `:615` / `:616` | `G2JOY` falling through into `G1JOY\tTFR\tU,X` |
| `:625` / `:626` | `\tSTD\tCURJOY` / `\tRTS` |
| `:5558` / `:5562` | `P3DEC…AUTOFF,AUTOFF` / `P4DEC…LINET,BOUNDR` |
| `:644` | `\tLDY\tPDECSN,X\tINTELLIGENCE IS NOW NILL` |
| `:8122` | two spaces before `(TRANSPORTER)` |

### The four fixes

1. **Finding 1.** The corroboration now cites `:615-626`, names `STD CURJOY` at `:625` as what
   makes it a joystick, and cites the ROM's own header at `:613`. The `ATTRCT`/`:712` clause is
   **deleted rather than repaired** — `:712` no longer appears anywhere in the file. It was never
   evidence about where `G1JOY` lives, and the header says the thing outright.
2. **Finding 2.** "a buzzard has no joystick" is gone. The record now says what the field
   actually holds — `AUTOFF` at P3DEC, `LINET`/`BOUNDR` at P4DEC, in the same slots where P1DEC
   carries `P1JOY,P1JOY` — and locates the real distinction: what a creature lacks is a PANEL
   read. It also cites `:644`, where the ROM's own comment calls that field the INTELLIGENCE,
   which is the strongest available evidence that the field is not vacant for creatures.
3. **Finding 4.** The quotation marks are gone; the description is now plainly a paraphrase, so
   nothing invites a byte-search that would fail.
4. **Finding 3** needed no production change — TEA's four new guards ARE the fix, and they are
   what made findings 1, 2 and 4 fail on arrival instead of shipping green.

### Round-2 battery against the DELIVERED text — 7 caught, 2 controls green, 0 survived

| # | Mutation | Expected | Got |
|---|---|---|---|
| E1 | extent back to `:601-616` | red | red |
| E2 | extent truncated to `:615-616` | red | red |
| E3 | `ATTRCT` adjacency reintroduced | red | red |
| E4 | creature AI routines unnamed | red | red |
| E5 | re-spaced quotation reintroduced | red | red |
| E6 | wing re-anchor reverted (round-1 regression) | red | red |
| E7 | "these four" miscount reintroduced | red | red |
| E8 | **control** — valid alternative extent `:613-626` | green | green |
| E9 | **control** — valid alternative extent `:616-626` | green | green |

E6 and E7 are deliberately round-1 regressions: they confirm the round-2 edits did not loosen
anything the first pass established. E8/E9 confirm the new guards accept any honest citation of
the routine rather than the one span I happened to write.

### One defect I introduced and caught before commit

The finding-4 edit left a comment line at 110 characters, well past this file's convention —
the replacement text was spliced without re-wrapping the sentence that followed it. Caught by
scanning the diff's added lines for length rather than by any test; no linter in this repo
enforces comment width. Re-wrapped, re-verified.

### Nothing else moved

The diff is 14 added and 7 removed lines, all inside one comment block. No `CUE_SOURCES` entry,
no type, no citation `line`/`verbatim` field, and no claim file changed in this round — the
round-1 `JT53-006` correction stands as committed. `:712` now appears nowhere in the manifest,
verified by grep.

**Handoff:** To The Argument Professional (Reviewer) for round 2.
## Subagent Results — round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | assessed by Reviewer directly | none | N/A — diff, suite, lint, orchestrator gathered inline |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled | none | N/A |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled | none | N/A |
| 4 | reviewer-test-analyzer | Yes | Skipped / disabled | none | N/A |
| 5 | reviewer-comment-analyzer | Yes | Skipped / disabled | none | N/A — domain assessed by hand again; it is the whole diff |
| 6 | reviewer-type-design | Yes | Skipped / disabled | none | N/A — round 2 touches no types |
| 7 | reviewer-security | Yes | Skipped / disabled | none | N/A |
| 8 | reviewer-simplifier | Yes | Skipped / disabled | none | N/A |
| 9 | reviewer-rule-checker | Yes | Skipped / disabled | none | N/A |

**All received:** Yes (1 assessed inline, 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 blocking confirmed, 0 dismissed, 2 recorded as low observations

## Reviewer Assessment — round 2

**Verdict:** APPROVED
**Rounds:** 2
**Blocking:** none

All four round-1 findings are closed, verified by opening the ROM rather than by reading the
assessment. Round 2 also introduced two NEW universal claims, and both hold.

### Round-1 findings — each verified closed

| # | Finding | Evidence it is closed |
|---|---------|----------------------|
| 1 | HIGH — wrong extent + false adjacency | `grep -c ":712"` on the manifest returns **0** — the clause was deleted, not repaired. The citation is now `:615-626`, which starts on the routine and reaches `STD CURJOY` at `:625`; the ROM header at `:613` is cited. All four locations fixed, including the two in the test file |
| 2 | MEDIUM — "a buzzard has no joystick" | Replaced. The record now names `AUTOFF` at P3DEC (:5558) and `LINET`/`BOUNDR` at P4DEC (:5562), locates them in the same slots as `P1DEC`'s `P1JOY,P1JOY`, and cites `:644` for the ROM's own INTELLIGENCE framing |
| 3 | MEDIUM — guard gap | Four new guards. Each was mutation-proven twice (TEA's R1-R5, Dev's E1-E5) and each corresponds to one finding |
| 4 | LOW — re-spaced quotation | Quotation marks removed; the description is now plainly a paraphrase. `grep -c '"PLAYER'` returns 0 |

The surviving `:601-616` mentions in the test file are all inside explicit CORRECTION narrative
explaining what round 1 got wrong. That is the right place for a retired citation — it is the
record of what the file used to claim, not a live citation — and it matches the `RETIRED:`
convention used elsewhere in the fleet.

### The two NEW claims round 2 introduced — both verified

A fix that adds assertions is a fix that can add defects (checklist #13). Both new universals
were checked rather than assumed:

- `[VERIFIED]` **"no panel read anywhere in the routine."** `:615-626` enumerated in full:
  `TFR`, `LDX PLINK`, `BEQ`, `LDA PID`, `CMPA`, `BNE`, `LDA PFACE`, `STA PFACE`, `LDD #0`,
  `STD CURJOY`, `RTS`. No `WCPIAB`, no PIA reference anywhere in the span. The universal is
  true over the whole cited extent, which is exactly why the extent had to be right first.
- `[VERIFIED]` **"What a creature lacks is a PANEL read."** All three named routines opened:
  `AUTOFF` (:8001) branches on `PPOSX`/`PPOSY`; `LINET` (:3722) on `NSMART`/`WSMART`/`PLAVT`;
  `BOUNDR` (:3787) on `PLAVT`/`PPREV` and `JSR SELPLY`. All position/state AI, none reads the
  panel. `LINET`'s own comment at `:3723` reads "BELOW MINIMUM INTELLIGENCE?", independently
  corroborating the INTELLIGENCE framing the record borrows from `:644`.

### Observations

- `[VERIFIED]` **The G1JOY citation window holds exactly ONE range** (`615-626`), so guard 1's
  existential check cannot be satisfied by a stale sibling today — parsed, not eyeballed.
- `[VERIFIED]` **`AUTOFF`/`LINET`/`BOUNDR` appear nowhere else in the manifest** (lines 361-362
  only), so guard 3 is well-scoped as shipped.
- `[VERIFIED]` **No production behaviour changed in round 2.** The diff is 15 added / 8 removed
  lines, entirely inside one comment block; no `CUE_SOURCES` entry, `line`, `verbatim`, type or
  claim file was touched. `FRAME_DURATIONS` is therefore untouched by construction.
- `[DOC]` **CONSIDERED AND DISMISSED:** the record backticks `` `* GAME SIMULATION PLAYER
  COMMANDS` `` where the ROM has a TAB after the `*`. Having just made Dev remove quotation
  marks over a double space, consistency demanded I look. Dismissed: the altered byte is
  *leading layout* whitespace, and the searchable content is byte-identical, so a reader who
  greps the phrase finds it immediately — unlike the SNPTREF case, where the alteration was
  inside the text. Recorded rather than silently dropped because the next reviewer will spot the
  same thing.
- `[LOW]` **Guard 1 is existential over ranges** — `good.length > 0` passes if ANY range in the
  window qualifies, so a future edit could leave a stale bad range beside a good one and stay
  green. Not worth a round: the window is four lines, one range lives there, and both batteries
  cover the realistic mutations. Worth knowing if that paragraph grows.
- `[LOW]` **Guard 3 scans the whole comment text.** That is the exact shape that produced two
  vacuous guards earlier in this story. It is sound today because those three symbols appear
  only in the sentence under test, but it is the weaker form of the proximity technique TEA
  used for AC6 and could be tightened if the file grows.
- `[TEST]` **The new guards are non-vacuous, proven twice and from both directions.** TEA's
  battery caught R1-R5 and — importantly — included two CONTROLS (`:613-626`, `:616-626`) that
  correctly stayed GREEN. Dev's independent battery on the delivered text repeated all five plus
  two round-1 regression mutants (E6 wing re-anchor reverted, E7 miscount reintroduced), both
  caught. Controls are what separate a citation guard from a wording pin, and I re-ran E8 myself.
- `[EDGE]` clean — `windowAt` returns `''` when the anchor is absent and every caller asserts
  `not.toBe('')` first, so an anchor rename surfaces as an explicit precondition failure rather
  than a silently-passing empty scan.
- `[SILENT]` clean — no error paths added or altered in round 2.
- `[TYPE]` clean — round 2 adds no types; `isRom`/`romEntries` from round 1 unchanged.
- `[SIMPLE]` clean — prose only; no abstraction introduced.
- `[SEC]` n/a — no input, auth or I/O beyond repo-local test reads.
- `[RULE]` clean — see below.

### Rule Compliance — round 2

The round-2 diff adds no TypeScript symbols at all (production change is comment text; the test
additions are four `it()` bodies plus two helpers). Re-enumerated anyway:

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | `commentLines`, `windowAt`, 4 new `it()` bodies | compliant — no casts, no `!`, no suppressions |
| #4 null/undefined | `windowAt` (`findIndex` → `i < 0` guard before `slice`) | compliant — the not-found case is handled and asserted on, not left to `undefined` |
| #8 test quality | 4 new tests | compliant — each has a precondition or a mutation-proven negative; the one conditional guard was rewritten precisely because its early return made it vacuous |
| #13 fix-introduced regressions | the two new universals | compliant — both verified against the ROM above; this is the check that mattered most this round |
| #2, #3, #5-#7, #9-#12, #14 | no instances in the round-2 diff | n/a |

### Devil's Advocate

Argue this should still be rejected. The strongest remaining case is that the record has grown
into a 48-line essay inside a data file, and length is itself a defect surface: every sentence is
an unguarded claim, only some of which any test can see. Round 1 proved that precisely — one
false sentence sat in a green suite. Round 2 added guards for four specific claims, but the
paragraph still asserts things nothing checks: that the demo "has no sound to play there", that
the 8th slot is "the ONLY sound the two families disagree on", that `GOVER` above zero "selects"
rather than merely correlates. I verified each by hand this round, but the next editor gets no
such net, and the guards' existence may create false confidence that the whole block is checked.
The honest statement is that four claims are machine-checked and the rest rest on review.

Second: the deleted `ATTRCT` citation removed a true fact (`:712` really does clear `GOVER` for
attract) from the file. A reader now learns that `GOVER > 0` means simulation but not where
`GOVER` is cleared, so the mechanism is documented from one side only. I judge this correct
anyway — that citation belongs to a story about attract MODE (`ad1-4`), not to a cue manifest,
and re-adding it would re-trip guard 2 — but it is a real loss of context and should be named
rather than pretended away.

Third: the story's premise remains only half-discharged in the sense that matters to a player.
The manifest now documents a demo/real-play split that the port's own `core/demo.ts` does not
implement; no cue models `SNPTREF`. So joust ships an accurate description of a distinction it
does not make. That is legitimately out of scope and TEA filed it, but "the record is now true"
and "the port is now faithful" are different claims and only the first is earned here.

What defeats all three: none is a defect in the delivered diff. The first is an argument for more
guards, which round 2 supplied for exactly the claims that had failed; the second is a scoping
judgment with a named owner; the third is a filed finding. The blocking bar is Critical/High and
nothing here reaches it.

### Deviation Audit — round 2

No new deviations were logged by TEA or Dev this round, and I confirm none was required: every
round-2 change was mandated by a round-1 finding, and no file outside the two already covered by
accepted deviations was touched. The five entries stamped in round 1 stand.

**Handoff:** To The Announcer (SM) for the finish ceremony.
## Impact Summary (compiled by SM at finish, 2026-08-02)

**Story:** jt5-23 — establish what the G1DEC/G2DEC and P1DEC/P2DEC decision-block families ARE,
record it, and rule whether the wing citations follow. 3 points, `tdd`, two review rounds.

**Blocking items outstanding: 0.** Round 1 was REJECTED on one High; round 2 closed it and the
Reviewer re-verified every finding by re-opening the ROM rather than by reading the assessment.
The round-1 rejection text has been rewritten out of the epic's `review_findings`, which now
records the approving round's outcome.

**What shipped**

- `plugins/joust/src/shell/audio-manifest.ts` — a recorded model of the two families: `GOVER`
  above zero selects the G-block (`:1025-1029`, mirrored `:1041-1045`), so G1DEC/G2DEC are the
  attract-mode self-playing demo and P1DEC/P2DEC are real play, corroborated by `P1JOY`'s
  `WCPIAB` panel read (`:7247`) and by the ROM's own header `* GAME SIMULATION PLAYER COMMANDS`
  (`:613`) over the software joystick at `:615-626`. Recorded with the nuance a summary loses:
  two G-blocks against seven P-blocks, so the `P` prefix on P3DEC-P7DEC does not mean real play.
- `playerWingDown` / `playerWingUp` re-anchored from G1DEC `:5544` to P1DEC `:5552`, so
  CUE_SOURCES cites ONE family throughout. The old citation is recorded as having been TRUE.
- Two sentences the change falsified were corrected: the jt5-6 comment claiming nothing models
  the distinction, and claim `JT53-006`, which called `:5544` the wing cues' call site.
- `plugins/joust/tests/audio-decision-block-families.test.ts` — 26 tests.

**No behaviour changed.** `framesFor` derives windows from `source.source.verbatim`, never from
`callSite` (`audio-manifest.ts:535-540`), so no cue's sound, priority, window or baked `.wav`
moved. The manifest stayed import-free, so the plain-node sample bake is unaffected.

**Suite:** 2939/2939 across `--project joust --project shared` (126 files); `npm run lint`
(`tsc --noEmit`) clean; `npm run test:orchestrator` 372/372. No sibling redness to attribute —
a-2's concurrent sw8-23 work is in star-wars and did not touch this tree.

**Findings routed — every one ends with an id, none with an archive note**

| Finding | Disposition |
|---|---|
| `JT51-009` carries two false clauses (wrong label/line pair; a stale "jt5-1 collapses" claim) | **jt5-24** filed (2pt, bug, p2) with the verified replacement text |
| `demo.ts` cites the real-play blocks for EGGS1/EGGS2 from the demo module | **jt5-25** filed (1pt, chore, p3), measured byte-identical so it is precision, not a bug |
| `ad1-4` was a title naming GOVER_ATTRACT with an EMPTY body | Description written: the measured entry point, the PDECSN mechanism, the knights-only scope reduction, the other GOVER consumers, and the unresolved debug-range question |
| The `:645-650` debug-range question | Folded into `ad1-4` as a QUESTION with the check named — deliberately not asserted |
| Whether `demo.ts`'s cue stream should cite the G-family | Answered NO for this story (no AC reaches `demo.ts`); the residue is `jt5-25` |

`ad1-4`'s title claim `GOVER_ATTRACT (0x7f)` was verified before being endorsed —
`GAMSIM LDA #$7F` / `STA GOVER` at `:232-233`. It is correct, and the same routine sets three
lives and two players, which is quarry that story did not have.

**Two low observations carried forward, deliberately not filed:** the AC-guard for the routine
citation is existential over ranges, and the creature-routine guard scans whole comment text
rather than a window. Both are sound as shipped (verified by parsing: one range in the window,
those symbols appear only in the sentence under test) and both are recorded in the Reviewer
assessment. They are notes for whoever grows that comment block, not defects.

**What this story cost, and what it bought.** Three vacuous assertions were written and caught
during it — two by TEA's mutation battery, one by reading why a test that should have been red
was green. All three were the same shape: a claim about PROSE asserted against a surface where
something else (citation data, a neighbouring sentence, a line break) decided the outcome. The
guards that shipped assert by RESOLUTION and by PROXIMITY instead, and carry CONTROL mutations
proving they accept any honest citation rather than one exact wording.
