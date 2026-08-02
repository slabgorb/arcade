# Story sw8-18 Context

## Title
Correct the sw8 ST.UX citation and prose defects from sw8-8 review rounds 2+3 -- 11 filed (4 since drifted) plus a 12th created by sw8-17 -- and add the comment-citation guard for the three a mechanical checker can catch

## Metadata
- **Story ID:** sw8-18
- **Type:** chore
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** sw8

## Problem

sw8-8's reviewer found eleven citation and prose defects across the star-wars ST.UX work
and filed them as sw8-18. Every one of them is a claim about a line of source — either the
1983 assembler under `reference/atari-source/star-wars-1983/`, or another file in this repo,
or the epic's own design spec — and the story asks for two things: fix them, and add the
mechanical guard whose absence let all of them survive two green review rounds.

The story was filed with its entire body in the `title` field, no description and no
acceptance criteria. That has been repaired; the description now carries the measured
findings and this file's ACs are the authoritative set.

## What was MEASURED at setup (2026-08-02)

The whole story is line-number claims, so every one was re-opened against the current tree
and the vendored ROM before handoff. Three things came out of it that change the work.

### The ROM premises all hold, line-exact

Verified in `reference/atari-source/star-wars-1983/`:

| Claim | Verified at |
|---|---|
| `.SBTTL MOVE STARS IN SOME DIRECTION` | WSMAIN.MAC:2243 |
| `.SBTTL MOVE THE PLAYER` | WSMAIN.MAC:2292 |
| `SMVSP1:` / `SMVSP2:` / `SMVNXT:` / `S1MV:` | WSMAIN.MAC:2522 / 2523 / 2524 / 2525 |
| `STD ST.UX ;STARS RELATIVE MOVEMENT` (space wave) | WSMAIN.MAC:2528 |
| `S1MVHP: ;MOVE DURING HYPER`, `JSR LSLD8`, `STD ST.UX` | WSMAIN.MAC:2531 / 2533 / 2534 |
| `.REPT 0` … `.ENDR` | WSMAIN.MAC:2271 … 2290 |
| `SMVDX1:` (first line inside the REPT) | WSMAIN.MAC:2272 |
| every `LDD ST.UX` in WSMAIN.MAC | :2245, :2266, :2273, :2279, :2285 |
| `ST.UX:: .BLKB 2 ;VIEWER X POSITION` | WSGLOB.MAC:465 |
| `LDD ST.UX ;STARS RELATIVE MOVEMENT` | WSSTAR.MAC:98 |

Filing items 1, 2, 3, 4, 5, 6, 7, 8 and 11 are still true, at the lines the filing gives.
Do not re-derive them; do re-check them immediately before editing, because this story has
been open across sw8-17, sw8-21 and uf1-4.

### 1. Four of the story's OWN citations have drifted

The defect the story exists to fix, committed by the story. Use the right-hand column:

| Filing says | Actually at | Drift |
|---|---|---|
| item 9 — sim.ts:2161-2165 prose, :2166 retirement | sim.ts:2193-2197, :2198 | +32 |
| item 10 — tie-status.ts:130-131 "never a camera" | tie-status.ts:143-144 | +13 |
| item 10 — render.ts:357-358 condensed form | render.ts:395-396 | +38 |
| item 10 — tie-sights-status.test.ts:189 "only READER" | tie-sights-status.test.ts:192 | +3 |

The claims themselves survive at the corrected lines — sim.ts:2193-2197 really is five lines
of present-tense prose introducing a re-export, with :2198 saying it was retired.

### 2. Items 1, 8 and 10 are ONE edit, and item 10's evidence over-counts by three

All three target the same bullet list, `gameRules.ts:232-241`, and the same ROM span.

Item 10 refutes "WSSTAR.MAC:98 is its only reader" by citing `LDD ST.UX` at
:2245/:2266/:2273/:2279/:2285. But :2273, :2279 and :2285 sit **inside** the `.REPT 0` block
that runs :2271-:2290 — assembled out, exactly as `gameRules.ts:240` already correctly says,
and that block is item 8's own subject. Only **:2245** (`SMVBNR`, banner) and **:2266**
(`SMVHIS`, high-score display) are live read-modify-write increments. The refutation stands on
those two. A fix that cites all five as live readers reintroduces the defect class inside the
correction, in the very sentence that corrects it.

Worth stating in the fix rather than relying on silently: both live readers are attract-mode
phases, not gameplay. That does not rescue "only reader" — an attract-mode read is a read —
but a reader who checks will notice, and the comment should get there first.

There is a further coupling. Item 10's own survival argument is "the tombstone's fuller
phrasing survives, the condensation does not". The tombstone's bullet at :232-234 **carries**
the condensation ("Its ONLY reader in the whole tree is the star generator"); the bullet that
discloses the WSMAIN writers is :238-240, which is items 1 and 8's defect. So the survival
argument only becomes true once 1 and 8 are fixed. Sequencing matters.

### 3. The condensation is at NINE sites, not the three filed

The same false "only reader" claim, found by grepping the claim rather than the filed list:

- `src/core/gameRules.ts:232-234` — the tombstone itself
- `src/core/tie-status.ts:13-14` ("never a viewer") and `:143-144` ("never a camera")
- `src/shell/render.ts:395-396`
- `tests/core/tie-sights-status.test.ts:192`
- `tests/core/space-eye-is-cockpit.test.ts:9`
- `tests/core/incoming-fire-reaction-window.test.ts:275-276`
- `tests/core/tie-fire-visibility.test.ts:137`
- `docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md:33-34`

Fixing three of nine copies of one false sentence is not a shippable deliverable, so AC2
covers all nine. SM ruled this rather than asking; if TEA disagrees, say so in the RED handoff.

Separately: the "never a viewer" wording at tie-status.ts:13-14 has to reconcile with
`WSGLOB.MAC:465`, which literally reads `;VIEWER X POSITION`. The tombstone's own line
`gameRules.ts:237` already handles this ("names the QUANTITY, not a consumer") — reuse that
formulation rather than inventing a second one.

### 4. A TWELFTH item, created by sw8-17 after filing

sw8-17 shipped (`aa7faec`, then `6de564d`). `deathStarPlacement` now moves the station
laterally: `render.ts:327-332`, `const x = Math.tan(deathStarOffAxis(t)) * -z`. But:

- `tests/shell/render.space-camera.test.ts:86-88` still says the port "cannot reproduce it
  today", that `deathStarPlacement` "seats the station at x = 0 and moves it only in DEPTH",
  and that "closing that gap is sw8-17, which must port the station's own lateral motion"
- `:94` still says "the x = 0 the station has today"
- the design spec `:41-43` carries the same forward reference to sw8-17 as outstanding

This is three lines below item 7's own target, in a file the story already opens. Ruled in
scope at setup.

## The guard, re-specced (USER RULING, 2026-08-02)

The filing's title claimed the guard "would have caught them" and its root cause claimed that
is why all eleven survived. **Measured, that is false**, and the user ruled that the AC be
re-specced honestly and the story kept whole (5 points, up from 3).

Under the filing's own spec — extract `<file>:<line-span>` from source comments and re-open
them — the guard catches **item 7 only**:

- **item 8**'s citation is the bare-colon form `.REPT 0, :2273-2290`. A `<file>:<line-span>`
  extractor never sees it; the filename is implied by the preceding line. This is a known
  repo-wide trap, not a one-off.
- **item 4**'s is a bare filename, `bounded-eye-combat.test.ts`, with no line at all.
- **item 2**'s span `WSMAIN.MAC:2523-2531` still *contains* its quoted verbatim
  (`LDD FRAME / JSR LSLD7 / STD ST.UX`), so even a verbatim-matching checker passes it. Its
  defect — the span omits the `SMVSP1:` label and overruns into `S1MVHP:` — is a property no
  span-existence or verbatim check can express.
- **item 10**'s span, `WSSTAR.MAC:98`, is **correct**. The false part is the prose around it.

Widened to resolve bare filenames and bare-colon spans against the nearest preceding filename,
the guard reaches items 4, 7 and 8 — three of twelve. The other nine are prose defects: a false
`.SBTTL` attribution, an omitted routine, a duplicate import, a wrong fixture value, a stale
paragraph, a stale forward reference, and the condensation.

That is still worth building — item 7 is the sharpest defect in the story (a citation
invalidated by its own commit) and exactly the recurrence a checker prevents. Build it for what
it catches; document what it does not, so no later reader treats the class as closed.

## Acceptance Criteria

1. gameRules.ts:232-241 is corrected as ONE edit (filing items 1, 8, 10): the tombstone no longer claims WSSTAR.MAC:98 is ST.UX's sole reader -- WSMAIN.MAC:2245 (SMVBNR) and :2266 (SMVHIS) are live read-modify-write increments, and if :2273/:2279/:2285 are named at all they are disclosed as sitting inside the assembled-out `.REPT 0`; :238-239's `.SBTTL MOVE STARS IN SOME DIRECTION` / `SMV*` attribution is replaced by the measured fact that the space-wave writer `SMVSP1/SMVSP2/SMVNXT/S1MV:` (WSMAIN.MAC:2522-2530) sits under `.SBTTL MOVE THE PLAYER` (:2292) and `S1MV` is not an `SMV*` name; :240's `.REPT 0` start is corrected from :2273 to :2271 (`.ENDR` :2290 stands); :241's span is corrected from :2523-2531 to :2522-2530; and the enumeration gains the second MOVE-THE-PLAYER writer `S1MVHP` (`;MOVE DURING HYPER`, `JSR LSLD8`, WSMAIN.MAC:2531-2536).

2. No site in plugins/star-wars asserts that WSSTAR.MAC:98 is ST.UX's only reader. All NINE known sites are corrected, not the three filed: gameRules.ts:232-234, tie-status.ts:13-14, tie-status.ts:143-144, render.ts:395-396, tie-sights-status.test.ts:192, space-eye-is-cockpit.test.ts:9, incoming-fire-reaction-window.test.ts:275-276, tie-fire-visibility.test.ts:137, and docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md:33-34. A repo-wide grep for the claim returns no surviving instance. Any site saying ST.UX is 'never a viewer' reconciles that wording with WSGLOB.MAC:465 `;VIEWER X POSITION`.

3. The remaining prose defects are fixed at their CURRENT lines, re-verified before editing: sim.ts:2193-2197's five-line present-tense re-export paragraph is DELETED rather than appended to, keeping :2198's retirement note; incoming-fire-reaction-window.test.ts:40 no longer refers in present tense to the deleted bounded-eye-combat.test.ts, :45-46 no longer offers 'seat the pilot at spaceEye' as a live option, and :47-48 no longer describes the shipped design as a fenced-off failure mode; space-eye-is-cockpit.test.ts:14-15's `[0,0,0]` is corrected to `[0,768,0]` so it agrees with its own advance() doc at :70-77; render.ts:61 and :63's duplicate `../core/gameRules` import is merged; gameRules.ts:19-20's 'Neither can read sim.ts shipPoint' is reconciled with render.ts:62, which already imports sim.ts.

4. render.space-camera.test.ts:85's design-spec citation is re-anchored from :26-30 to :45-46 -- the longplay observation, pushed down by sw8-8's own 31-line amendment in the same commit (b664763) -- AND the sw8-17 staleness immediately below it is corrected: :86-88 and :94 no longer say the station sits at x = 0, moves only in depth, or that sw8-17 is outstanding, and the design spec :41-43's forward reference likewise. `deathStarPlacement` has moved the station laterally via `deathStarOffAxis` since aa7faec (render.ts:327-332).

5. A guard re-opens citations embedded in ordinary source comments across plugins/star-wars (src, tests, and docs/superpowers/specs), handling all THREE citation forms: `<file>:<line>` and `<file>:<line-span>`; a bare `:<line-span>` resolved against the nearest preceding filename in the same comment; and a bare `<file>` with no line at all. It fails on a reference to a file that does not exist, and on a cited span whose quoted verbatim is no longer inside it. It reuses tools/audit/check-citations.mjs rather than duplicating its verbatim machinery.

6. The guard is mutation-proven against the three filing items it claims to catch: restoring item 4's reference to the deleted bounded-eye-combat.test.ts, item 7's :26-30 spec span, and item 8's bare-colon ':2273-2290' each reddens the suite INDEPENDENTLY. Each mutant is recorded verbatim in the test's own comment so the next reader re-runs the exact string rather than reconstructing the intent.

7. The guard's documentation states plainly what it does NOT catch -- prose defects whose cited spans are correct or absent, which is nine of the twelve items in this story (the false attribution, the omitted routine, the duplicate import, the wrong fixture value, the stale paragraph, the stale forward reference, and the 'only reader' condensation, whose span WSSTAR.MAC:98 is itself correct) -- so no later reader treats the defect class as closed.

## Technical Approach

**Extension point, not greenfield.** `plugins/star-wars/tools/audit/check-citations.mjs` with
`plugins/star-wars/tests/audit/citations.test.ts` already re-opens citations and already does
verbatim matching against a real file. It reads only structured findings from
`docs/audit/findings/*.json` (`{file, line, verbatim}`); nothing walks an ordinary source
comment. The story's root-cause claim is therefore confirmed. Reuse that machinery.

Three citation forms must be handled (AC5), because the story's own defects use all three:

1. `<file>:<line>` and `<file>:<line-span>` — the ordinary form
2. a bare `:<line-span>` resolved against the nearest preceding filename in the same comment
3. a bare `<file>` with no line — needed for the dangling-file case (item 4)

Two failure modes: a reference to a file that does not exist, and a cited span whose quoted
verbatim is no longer inside it.

Suggested scan scope: `plugins/star-wars/src`, `plugins/star-wars/tests`, and
`plugins/star-wars/docs/superpowers/specs`. Whether it should run cabinet-wide is a real
question and deliberately NOT settled here — raise it in the RED handoff rather than widening
silently, since every other game carries the same comment style and the blast radius is large.

**Sequencing that matters:** fix items 1 and 8 (the gameRules bullet list) BEFORE item 10, or
item 10's survival argument is written against a tombstone that does not yet support it.

**The guard will redden things this story did not enumerate.** That is the point of it, but it
means the guard should land last, and whatever it finds beyond the twelve items is a finding to
record — not necessarily to fix in this story. Say which you did in the handoff.

## Scope

**In scope:** the twelve items (eleven filed + the sw8-17 staleness), re-anchored to their
current lines; the condensation at all nine sites; the comment-citation guard for the three
forms above, mutation-proven; and the guard's honest documented limits.

**Out of scope:** running the guard cabinet-wide over the other six games and the lobby
(raise it, do not do it); re-litigating the ST.UX ruling itself, which sw8-8 settled and this
story only corrects the citations for; and any change to `deathStarPlacement`'s behaviour —
sw8-17 shipped it and this story only corrects prose that describes it as outstanding.

## Notes for the phases

- Every line number in this file was re-opened at setup on 2026-08-02, but four of the
  filing's own citations had already drifted once. **Re-verify immediately before editing.**
- `bounded-eye-combat.test.ts` is confirmed absent from the tree.
- The suite baseline before this story: run it and record the number; a sibling's in-flight RED
  phase can redden `main` on this trunk-based repo, and that must be attributed rather than
  inherited.
- No visual or served-lobby check is involved, so the dev-server port question does not arise
  for this story.
