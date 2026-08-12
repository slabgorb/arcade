---
story_id: "jt11-6"
jira_key: "jt11-6"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-6: High-score entry UX: persistence wiring is verified CORRECT (game writes and lobby reads the same joust-high-scores key via shared highScoreKey - highscore.ts:118-120,497,580-588; lobby chain tiles.ts:109 -> storage.ts:42-43 -> readLocalTableRaw; qualify gate afterGameOver cabinet.ts:119-122 wired to the persisted table main.ts:375, pinned by highscore-wiring.test.ts:72-84). The felt bug is the commit gate: nothing saves until exactly 3 initials entered AND FLAP (Space) pressed on a rising edge (main.ts:483-488) - abandoning the entry screen writes nothing. Fix: on-screen instruction on the entry screen (which keys cycle letters, PRESS FLAP TO CONFIRM) + a ROM-style entry timeout that auto-commits the current initials so a walked-away qualifying score still persists. Verify the ROM entry-timeout behavior in JOUSTRV4.SRC before choosing the timeout law - cite it.

## Story Details
- **ID:** jt11-6
- **Jira Key:** jt11-6
- **Epic:** jt11
- **Workflow:** tdd
- **Type:** bug
- **Points:** 2
- **Priority:** p1
- **Repos:** arcade
- **Branch:** feat/jt11-6-highscore-entry-ux-instructions-timeout
- **Stack Parent:** none

## ROM Research

**Status:** Initial search completed on JOUSTRV4.SRC

**ROM Source Location:** `/Users/slabgorb/Projects/a-3/reference/williams-source/joust/JOUSTRV4.SRC` (8139 lines)

**Findings:** Searched JOUSTRV4.SRC for explicit high-score name entry screen timeout constants and timing variables. Found:
- Message page timeout: 30 seconds (line 782: `LDA #30  TIME OUT (IN SECONDS) FOR THIS MESSAGE PAGE`)
- Attack sequence timeouts: various frame counters
- Timeout logic for game events and sequences
- **NOT FOUND:** Explicit timeout law for high-score name entry screen in JOUSTRV4.SRC

**Next Step for TEA/Dev:** High-score name entry GAMEND routine is referenced at line 688 (`JMP GAMEND`) but defined as external (EQU.SRC / SHORTEQU.SRC: `GAMEND RMB 3`). The actual name entry screen logic and any timeout may be in:
1. A separate loaded ROM module not in this checkout
2. Another version of the Joust ROM source
3. A legacy high-score hardware module

Recommend checking other joust ROM revisions (JOUSTRV1-V3.SRC) or obtaining the GAMEND module source before implementing the timeout law. Document the chosen timeout behavior with a ROM citation in code comments per existing audit standards.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T20:32:57Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T19:51:10Z | 2026-08-12T19:54:48Z | 3m 38s |
| red | 2026-08-12T19:54:48Z | 2026-08-12T20:08:07Z | 13m 19s |
| green | 2026-08-12T20:08:07Z | 2026-08-12T20:12:29Z | 4m 22s |
| review | 2026-08-12T20:12:29Z | 2026-08-12T20:26:57Z | 14m 28s |
| red | 2026-08-12T20:26:57Z | 2026-08-12T20:30:27Z | 3m 30s |
| green | 2026-08-12T20:30:27Z | 2026-08-12T20:31:36Z | 1m 9s |
| review | 2026-08-12T20:31:36Z | 2026-08-12T20:32:57Z | 1m 21s |
| finish | 2026-08-12T20:32:57Z | - | - |

## Acceptance Criteria

### (A) On-screen entry instructions
- Add visible text on the high-score name-entry screen (the 'highscore' cabinet mode, rendered by renderHighscoreScreen main.ts:232-238)
- Text: instructions on which keys cycle letters (e.g. "A-Z UP/DOWN") and "PRESS FLAP (SPACE) TO CONFIRM"
- Placed legibly on-screen without obscuring the entry prompt or table rows
- Verify by rendering the screen with and without entry in progress

### (B) ROM-cited entry timeout that auto-commits initials
- **BLOCKING RESEARCH STEP:** Locate and cite the ROM high-score name entry timeout law in JOUSTRV4.SRC (or alternate source if not found in V4)
  - Path: `/Users/slabgorb/Projects/a-3/reference/williams-source/joust/JOUSTRV4.SRC`
  - If not found: document search in session, specify alternate source, cite that source
- Timeout must be expressed in **core ticks** (not wall milliseconds), fed by the game sim's own frame clock
  - Storage: `entry` state in highscore.ts or a countdown added to CabinetState when entering 'highscore' mode
  - Signature: add timeout accumulator field to the entry state or cabinet state (not Date.now())
- On every shell frame while cabinet.mode === 'highscore':
  - Decrement the timeout counter by 1 tick
  - When timeout reaches 0 AND entry.initials.length === 3: auto-commit via commitEntry (same gate as manual flap confirm)
- Test: seeded-replay with entry state, verify auto-commit occurs at the expected tick count
- Verify the ROM cite is placed as a comment with line numbers and the exact timing value chosen

## Sm Assessment

**Setup complete — routing to TEA (red).**

- Story jt11-6 (2pt, p1, bug, workflow `tdd`) claimed and set `in_progress`.
- Pre-setup probe: no remote branch and no PR (open, merged or closed) for jt11-6 —
  the story is genuinely free, not shipped-hot from a sibling checkout. No open PRs
  anywhere, so the merge gate is clear.
- Branch `feat/jt11-6-highscore-entry-ux-instructions-timeout` cut from `develop`
  (gitflow; PR targets `develop`). `**Branch:**` recorded in Story Details so the
  finish parser can scrape it.
- Session and context files both exist and both carry ACs (A) and (B) — verified by
  reading them, not by trusting the setup subagent's report.

**What TEA needs to know before writing the RED test:**

1. **AC(B) has a research precondition that may be unsatisfiable as written.** See the
   blocking Delivery Finding below: the H.S.T.D. name-entry routine is reached by
   `JMP GAMEND` in every Joust revision, and `GAMEND` is a system-ROM vector
   (`EQU.SRC:237`), so the entry screen — and any timeout on it — is Williams system-ROM
   code that is not in this checkout. Sweep the whole `reference/williams-source/joust/`
   directory before concluding anything; if the law is genuinely absent, take one of the
   two recorded options and log the choice in Design Deviations. Do **not** invent a
   timeout value and dress it as a ROM cite.
2. **Core/shell boundary is the hard rule here.** The timeout is a countdown in **sim
   ticks** driven by the game's own frame clock — never `Date.now()`. `plugins/joust/src/core/`
   is scanned by a purity test; a wall-clock read in core fails it.
3. **The commit path must stay single.** AC(B) says auto-commit goes through the same
   `commitEntry` gate as the manual FLAP confirm — a second write path would let the two
   drift.

No blockers to starting. The only open question is AC(B)'s citation, and it is TEA's to
resolve at the top of the red phase.

## Tea Assessment

**RED is in place and the blocking research is CLOSED.** Two new suites, 21 failing
tests, every failure a self-describing "not built yet" from the module loaders — no
collection errors, no import failures, and `npm run lint` (tsc --noEmit) is green
because both suites declare the not-yet-existing surface locally and load it through
a runtime-assembled specifier (the tp1-8 idiom). The orchestrator suite is green
(478/478). Nothing outside the two new files fails.

### The research the story blocked on — answered, and the answer moves the story

`JOUSTRV4.SRC` does not contain the entry timeout, and setup's "not found" was right
about the file and wrong about the conclusion. Every joust revision only *jumps* to
the routine (`JMP GAMEND  CHECK FOR H.S.T.D.`, `JOUSTRV4.SRC:688`), and `GAMEND` is a
3-byte vector into the shared Williams system ROM (`EQU.SRC:237`). **That system ROM is
vendored here** — `TB12REV1.SRC` / `TB12REV3.SRC`, the same file `core/highscore.ts`
already cites for the ENTINT cursor cycler. So the law was measurable all along:

- **The supervisor** is `AMODE` (`TB12REV1.SRC:49`, `TST ANYONE` — "did anyone make the
  table?"). It puts up the congrats (MSBZB $69 `'NICE JOUSTING!'`, `MESSEQU.SRC:126`)
  and the instruction line (MSENT3 $6B, `MESSEQU.SRC:128`), then supervises.
- **The shipped duration** is `CLR .SAVEA,U` + `1$ PCNAP 30` (`TB12REV1.SRC:77-78`).
  `CLR` seeds 0, so the first `DEC` wraps to $FF → **256 × 30 = 7680 ticks**. The line's
  own comment says "WAIT FOR 2 MIN 9 SEC"; at joust's `FRAME_HZ` that is 127.8 s. ✓
- **The trap**, and the reason this needed a gate rather than a glance: the *previous*
  law is still in the listing on `********`-commented lines — `LDA #$FF (OLD TIME
  255*20=5100TICKS = 1MIN 25 SEC)`. A reader who takes the first `LDA #$FF` ships 5100.
  A test asserts the constant is 7680 **and not** 5100, and asserts the old line really
  is comment-prefixed, so the discrimination is measured rather than asserted.
- `TB12REV3.SRC` carries the identical block, pinned by its own test — the citation is
  not revision-specific.

### The deviation this forces, stated plainly

**On expiry the ROM does not commit.** `2$ PKILL $42,$FF` kills the entry process and
BRANCHES BACK to `JMP VATTRT` (`BRA 3$` at `TB12REV1.SRC:91`, whose target sits ABOVE
it at `:87` — not a fall-through), and the initials only reach CMOS *after*
ENTINT returns carry-set (the `CMOSMV` stores, `TB12REV1.SRC:1650-1660`). **So the felt
bug is faithful** — the 1982 cabinet drops a walked-away score exactly as this port
does. The story's fix is therefore a deliberate deviation, not a fidelity repair, and
the RED encodes it that way: keep the ROM's **duration**, change the **expiry action**
to an auto-commit, and pad the unentered letters with the ROM's own convention (the
`LDB #20 / LDA #CSPC` space fill that pre-loads the buffer, `TB12REV1.SRC:1901-1905`).
Dev must log this in Design Deviations; it is not implicit.

Two consequences the ACs did not anticipate, both now pinned:

1. **AC(B) as written said "auto-commit *when* `initials.length === 3`".** That is the
   bug, not the fix — a walk-away after two letters still evaporates. The suite pins the
   story's own sentence instead ("auto-commits *the current initials*"): `timeoutInitials`
   pads `''` → `'   '` and `'AB'` → `'AB '`. A test proves the space-named row still
   passes `isHighScoreRow`, so it survives the round trip to the lobby — otherwise the
   padding would be decorative and the score still lost.
2. **The instruction line is a SHELL string, not a ROM transcription.** MSENT3 exists,
   but it reads `'USE -MOVE- TO SELECT LETTER    -FLAP- TO ENTER LETTER'` — it names a
   cursor cycler jt10-7 deliberately did not port (joust types letters via
   `@shared/name-entry`). Transcribing it verbatim would instruct a control the browser
   cabinet does not have. The precedent for exactly this case is jt11-1's `START_PROMPT`,
   a presentation string living in the shell beside its layout; `ENTRY_INSTRUCTIONS`
   follows it. That also keeps `core/highscore.ts`'s ROM-string citation gate untouched.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Check | How it is covered |
|-------|-------------------|
| 1 — type-safety escapes | No `as any`, no `@ts-ignore`. The one `as unknown as` double-cast in a draft was removed by declaring `commitEntry` on the local module interface (committed separately). The two `as LaidOutText` narrowings follow an `expect(...).not.toBeNull()` on the same value. |
| 2 — generics/interfaces | Module surfaces are explicit interfaces, not `Record<string, any>`; every buffer field is `readonly`; table params are `readonly T[]`. |
| 4 — null/undefined | `instructions` is a real `T \| null` union and BOTH poles are asserted (`null` with no prompt, non-null while entering) — no optional-chaining papering. The loader rejects `undefined` explicitly so a missing export cannot read as "present but null". |
| 5 — modules | Every relative import carries the `.js` extension; `import type` is used for type-only imports (`LaidOutText`, `Rgba`). |
| 8/test quality | Every test names the mutant it kills. No `let _ =`, no `assert(true)`, no `is_some`-shaped assertion. Constants are **re-derived** (`ITERATIONS * NAP_TICKS`, `255 * 20`) rather than pasted, and the citation gate carries a live discriminator: a synthetic wrong line number must fail the resolver. |

Project-rule coverage beyond the checklist: the purity boundary is pinned twice
(core reads no clock/timer; main.ts adds no second clock), the comment-line-refs guard
is respected (no `<file>.ts:<line>` in the new comments — ROM cites only), and the
derived test-file count in joust's README was re-derived 178 → 180, which
`audio-seam-scope`'s guard demanded the moment the files landed.

### What Dev must decide (and what is already decided)

Decided by the suite: the constant (7680), where it lives (core, in ticks), what an
expired entry commits (space-padded current initials), that persistence stays a
**single** call site (`highScores.save(` and `commitEntry(` are each asserted to appear
exactly once, so the auto-commit reuses the manual gate rather than growing a second
path), and that the manual FLAP confirm keeps its rising-edge + completeness guard.

Left to Dev: the exact wording of `ENTRY_INSTRUCTIONS` (the tests pin its content laws
— names `A-Z`, names `SPACE`, names `FLAP`, upper case, every character has a FONT35
glyph, and it fits inside the 292px logical width) and its Y position on screen, which
is a human smoke test at `/joust/` exactly as every other line on this screen is.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[SM, setup] Question — blocking-for-AC(B): the ROM entry-timeout may not exist in the Joust game source at all.**
  Setup's search was scoped to `JOUSTRV4.SRC` only; the vendored tree is 47 files
  (`reference/williams-source/joust/`), including `ATT.SRC`, `MESSAGE.SRC`, `SUMMER.SRC`,
  `SYSTEM.SRC`, `JOUSTRV1-3.SRC`, `EQU.SRC`/`SHORTEQU.SRC`. Widening the search one step
  says why V4 came up empty: the entry screen is **not Joust code**. Every revision only
  jumps to it — `JOUSTRV1.SRC:646`, `JOUSTRV2.SRC:681`, `JOUSTRV3.SRC:692`
  (`JMP GAMEND  CHECK FOR H.S.T.D.`) — and `GAMEND` is a 3-byte system-ROM vector,
  `EQU.SRC:237` / `SHORTEQU.SRC:237` (`GAMEND RMB 3  GAME OVER H.S.T.D. CHECK AND ENTER
  ROUTINE`). The H.S.T.D. check-and-enter routine lives in the shared Williams system ROM,
  which is not in this checkout.
  **TEA/Dev: do not conclude "no ROM law" from the V4 search alone — sweep the whole
  directory first.** If it is genuinely absent, AC(B) cannot be satisfied as written
  ("cite JOUSTRV4.SRC"); pick and record ONE of: (a) cite the nearest measured in-tree
  precedent (e.g. the 30s message-page timeout, `JOUSTRV4.SRC:782`) and say plainly in
  the code comment that it is an analogue, not the H.S.T.D. law; or (b) cite external
  Williams system-ROM source if located. Either way the comment must state which, and the
  choice belongs in Design Deviations.

- **[TEA, red] RESOLVED — option (b): the Williams system ROM is vendored, and the law is
  measured.** `TB12REV1.SRC` / `TB12REV3.SRC` in the same directory ARE the H.S.T.D.
  check-and-enter ROM (`core/highscore.ts` already cites TB12REV1 for ENTINT). `AMODE`
  supervises the entry with `CLR .SAVEA,U` + `1$ PCNAP 30` = 256 × 30 = **7680 ticks**
  (`TB12REV1.SRC:77-78`), ≈ 2 min 8 s at joust's `FRAME_HZ`, which is the "2 MIN 9 SEC"
  the line's own comment claims. No analogue was needed and none was used. The
  30-second message-page timeout (`JOUSTRV4.SRC:782`) is unrelated and is NOT cited.

- **[TEA, red] Conflict — non-blocking, for the epic: the "felt bug" is FAITHFUL, so
  jt11-6 ships a deliberate deviation rather than a fidelity fix.** The ROM's expiry
  path is `PKILL $42,$FF` → `JMP VATTRT` (`TB12REV1.SRC:87-89`) and the initials reach
  CMOS only after ENTINT returns carry-set (`TB12REV1.SRC:1650-1660`) — the 1982 cabinet
  also drops a walked-away qualifying score. Keeping the ROM's duration while changing
  the expiry ACTION to an auto-commit is a UX ruling, not a transcription; the unentered
  letters take the ROM's own CSPC space fill (`TB12REV1.SRC:1901-1905`) so the row is
  blank-named rather than absent. Dev logs this in Design Deviations.

- **[TEA, red] Gap — non-blocking: AC(B)'s literal wording contradicts the story's own
  sentence, and the suite follows the story.** AC(B) says auto-commit "when timeout
  reaches 0 AND `entry.initials.length === 3`", which would drop exactly the walk-away
  the story exists to save ("auto-commits the current initials so a walked-away
  qualifying score still persists"). The tests pin the story's version. If the owner
  actually wants the 3-letter precondition, this suite is the thing to change first.

- **[TEA, red] Improvement — non-blocking, follow-up candidate: the congrats banner
  MSBZB $69 `'NICE JOUSTING!'` (`MESSEQU.SRC:126`) is shown by the same `AMODE` block
  that runs this timeout (`TB12REV1.SRC:66`) and this port shows nothing equivalent.**
  Out of jt11-6's scope (it is neither an instruction nor a timeout) and deliberately
  not tested here — it is a one-string screen addition for whoever owns the next
  high-score-screen story.

## Dev Assessment

**GREEN.** joust 3531/3531 (180 files, up from 178), orchestrator 478/478,
`npm run lint` (tsc --noEmit) clean, `node scripts/build-app.mjs joust` builds. All 21
of TEA's new tests pass; nothing was skipped, loosened or deleted to get there.

**What shipped**

- `core/highscore.ts` (pure, ticks — no clock): `ENTRY_TIMEOUT_TICKS = 7680` carrying
  the AMODE derivation in its doc comment (256 × `PCNAP 30`, `TB12REV1.SRC:77-78`, with
  the superseded `********` 255×20 law named so the next reader does not re-make the
  mistake); `ticksLeft` on the entry buffer, seeded by `beginEntry`, spent by
  `tickEntry` (floored at 0, returning the same object once exhausted — the existing
  no-op-identity idiom), read by `isEntryExpired`; `timeoutInitials` padding with the
  ROM's CSPC space fill. `enterInitial` now spreads the buffer, so typing carries the
  remaining budget instead of dropping it to `undefined`.
- `shell/highscoreScreen.ts`: `ENTRY_INSTRUCTIONS = 'TYPE A-Z   SPACE (FLAP) TO CONFIRM'`
  (34 chars → 136px of the 292px logical width; every character has a FONT35 glyph),
  laid out in FONT35 and non-null exactly while a prompt is showing.
- `main.ts`: one `tickEntry` per pumped frame in the highscore branch; on expiry the
  padded initials commit and the cabinet returns to attract. Both exits call a single
  `commitHighScore(initials)` helper, so `commitEntry(` and `highScores.save(` each
  appear exactly once in the file. The instruction line paints at y 222, under the
  prompt at 210 (FONT35 is 5 rows, the screen is 240).

**The one pre-existing test I had to touch, and the probe that justifies it**

jt10-7's `highscore-wiring.test.ts` pinned the literal call site
`commitEntry(highScoreTable, entry.initials, entryScore, entryWave)`. Folding both
exits into `commitHighScore` moves the initials to that helper's parameter, so I
widened the SECOND operand only — `(?:entry\.)?initials` — and added two assertions
that the initials still come from the buffer by both routes (`commitHighScore(entry.initials)`
and `commitHighScore(timeoutInitials(entry))`), so the widened operand cannot be
satisfied by a stray local. **The edit was vindicated by mutation, not by argument:**
swapping `entryScore`/`entryWave` in the helper reddens exactly that test and nothing
else (measured), which is the mutant the guard was written to kill. Restored by edit,
not by `git checkout` — the tree is clean.

**Not verified by me, and it is the one thing left**

The pixels. AC(A) asks for a look at the screen with and without an entry in progress;
the layout, the font, the fit and the null/non-null poles are all unit-pinned, but the
Y position (222) is a placeholder in the same sense as every other line on this screen
— jt10-7's heading/rows/prompt positions are all "tuned by a human smoke test". Reaching
the screen at `/joust/` needs a real qualifying game (the attract demo self-plays and
routes to attract), so it is a human step, not one I could automate cheaply. Flagged
for the Reviewer rather than claimed.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — domain covered by me (mutation battery M1-M9 + the hidden-tab trace) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — domain covered by me (save path, NaN-budget trace) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — domain covered by me (the mutation battery IS this review's test analysis) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — domain covered by me + rule-checker TS #1/#2/#5 |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — domain covered by me (one commit path, three call sites, no dead code) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (5 sites) | confirmed 3, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled specialists returned, 5 disabled rows pre-filled and covered by the reviewer directly)
**Total findings:** 9 confirmed (1 High, 4 Medium, 4 Low), 0 dismissed, 0 deferred — 2 of the 9 are out-of-scope and filed as follow-ups rather than fixed here.

### The mutation battery (standing in for the four disabled specialists)

Re-runnable: `scratchpad/mutate.py` applies each mutant to the working tree, runs
`npx vitest run --project joust`, and restores. Measured 2026-08-12 against
commit `2fc41632`:

| Mutant | Result |
|---|---|
| M1 `ENTRY_TIMEOUT_TICKS = 5100` (the commented-out old law) | **dies** — 2 red |
| M2 `tickEntry` spends 2 ticks | **dies** — 1 red |
| M3 `enterInitial` returns `{ initials }` (drops the budget) | **dies** — 1 red |
| M4 `timeoutInitials` stops padding | **dies** — 2 red |
| M5 `tickEntry` loses its floor (goes negative) | **dies** — 1 red |
| M6 instructions shown even with no prompt | **dies** — 1 red |
| M7 the pump never ticks the entry | **dies** — 1 red |
| M8 expiry ALSO gated on `isEntryComplete(entry)` | **SURVIVES — 3531/3531 green** |
| M9 the instruction line is laid out but never painted | **SURVIVES — 3531/3531 green** |

M8 is the finding. M9 is the known limit of any source-scan guard on a canvas
paint (the house convention: screen positions are a human smoke test) — recorded,
not charged against this story.

## Reviewer Assessment

**Verdict:** REJECTED

**Data flow traced:** a `k` keydown → the window listener's `cabinet.mode === 'highscore'`
guard → `enterInitial(entry, e.key)` → `@shared/name-entry`'s `stepNameEntry` (A–Z
uppercased, capped at 3) → a new buffer carrying the SAME `ticksLeft` → next pumped
frame `tickEntry` spends one tick → either the FLAP rising edge with a complete buffer
or `isEntryExpired` → the single `commitHighScore` → `commitEntry` → `insertHighScore`
(descending, capped at 10) → `highScores.save` → `localStorage['joust-high-scores']` →
the lobby. Safe because the name can only ever be A–Z uppercase or the ROM's space
fill — never arbitrary text — and `[SEC]` confirmed the lobby reads the numeric score
only and never renders `row.name` (`lobby/src/shell/tiles.ts`), so the padded name
reaches no DOM.

**Pattern observed:** the one-commit-path helper — `commitHighScore` at
`plugins/joust/src/main.ts:445-449`, with the suite asserting `commitEntry(` and
`highScores.save(` each appear exactly once in the file. That is the right shape for
"two triggers, one effect", and it is the reason the auto-commit cannot drift from the
manual confirm. Good pattern, and pinned rather than merely written.

**Error handling:** `highScores.save` already wraps `setItem` in try/catch (pre-existing,
unchanged). The new numeric path cannot produce a degenerate budget: `ticksLeft` is
seeded only from `ENTRY_TIMEOUT_TICKS` and copied by spread, and all three construction
sites are `beginEntry()` (`main.ts:401`, `:436`, `:449`) — so the `NaN` budget that
would make the screen immortal is unreachable, enforced by a required field rather than
a runtime check. `[RULE]` #21 agrees.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[TEST]` | **The story's central law is not guarded.** Adding `&& isEntryComplete(entry)` to the expiry branch restores exactly the bug this story exists to fix — a walked-away 0- or 2-letter entry evaporating — and the whole suite stays green (mutant M8, measured). The wiring suite proves `timeoutInitials(entry)` is *mentioned* in the branch, never that an INCOMPLETE buffer commits. TS checklist #15 makes this mandatory, not stylistic: "Every guard must be mutation-tested: delete the mechanism and require red." | `plugins/joust/tests/highscore-entry-jt11-6-wiring.test.ts` (AC-B, "auto-commits the space-padded initials") | Pin the expiry condition's SHAPE — e.g. assert the branch matches `else if (isEntryExpired(entry))` with no completeness term ANDed in. Re-run M8 and require red. |
| [MEDIUM] `[RULE]` | **The TEA-authored contract file still describes the pre-jt11-6 module** (TS #24 — "a retirement applied where the AC named it, and nowhere else"). `HighScoreEntryBuffer` still reads `{ readonly initials: string }`, its doc still says "A fresh empty initials buffer: `{ initials: '' }`", and `HighscoreModule` never gained `ENTRY_TIMEOUT_TICKS` / `tickEntry` / `isEntryExpired` / `timeoutInitials`. Structural typing hides it, so lint is green and nothing forces the update. | `plugins/joust/tests/helpers/highscore-contract.ts:63-65`, `:93`, `:67-120` | Add `ticksLeft` and the four new members to the contract and fix the `beginEntry` doc. |
| [MEDIUM] `[DOC]` | `isEntryComplete`'s docstring calls itself "**the** commit gate". Since this diff there are TWO commit paths and the timeout's deliberately bypasses it — committing an incomplete buffer is the entire story. | `plugins/joust/src/core/highscore.ts:159` | Reword to name it the MANUAL-confirm gate and point at the timeout's path. |
| [MEDIUM] `[DOC]` | The `entry` state comment still documents only the manual path: "the flap RISING edge commits once the buffer is complete." The second path is added a few lines below in this same diff. | `plugins/joust/src/main.ts:397` | Add the auto-commit clause. |
| [LOW] `[RULE]` | `catch (e)` casts the strict-mode `unknown` straight to `Error` to read `.message`, with no `instanceof` narrowing (TS #11). Benign in practice — every throw in both try-blocks is already `new Error` — but it is a stated rule. | `highscore-entry-jt11-6.test.ts:141`, `highscore-entry-jt11-6-wiring.test.ts:88` | `catch (e: unknown)` + narrow, or `String(e)`. |
| [LOW] `[TYPE]` | `screen.instructions as LaidOutText` casts `null` away with no preceding null check in those two test bodies (TS #1). The sibling test at `:140` does check first, so the file is inconsistent with itself. Fails loudly rather than silently, hence Low. | `highscore-entry-jt11-6-wiring.test.ts:157`, `:163` | Hoist the `not.toBeNull()` assertion, or extract a checked helper. |
| [LOW] `[DOC]` | **Flow wording I re-ran and disagree with `[DOC]` about.** Both the test header and the session deviation say the expiry "**falls into** `JMP VATTRT`". It does not fall through: `2$ PKILL $42,$FF` (`TB12REV1.SRC:89`) → `PCNAP 3` (`:90`) → `BRA 3$` (`:91`) → and `3$ JMP VATTRT` sits **above** it at `:87`. The comment-analyzer read the citation RANGE as correct (it is) and passed the verb; jt5-7 exists in this repo precisely because a positional word ("below the cue") was false while its citation was fine. | `plugins/joust/tests/highscore-entry-jt11-6.test.ts` (header), session Design Deviations | Say "branches back to `JMP VATTRT`". Fix every phrasing, not the first one. |

### Out of scope — file, do not fix here

| Severity | Issue | Evidence |
|----------|-------|----------|
| [MEDIUM] `[EDGE]` | **You cannot see what you type.** Nothing paints the in-flight buffer: `layoutHighscoreScreen(colour, table, entryPrompt)` never receives `entry.initials`, `entryPrompt` is fixed once at `main.ts:437`, and the only other use of the buffer is the commit at `:524`. The ROM echoes every character (`ENTRET BSR OUTHSC  WRITE THE CHARACTER`, `TB12REV1.SRC:1267`, plus the `WRCUR` cursor at `:1287`). This is a jt10-7 gap, not a regression — but AC(A)'s new line now says "TYPE A-Z" to a player who will see nothing happen, which makes the gap worse than it was this morning. | verified by reading the render path, not inferred |
| [LOW] `[EDGE]` | **The countdown only advances while the tab renders.** It is spent inside `pumpFrames`, driven by `requestAnimationFrame`, and `MAX_CATCHUP_SECONDS = 0.25` (`main.ts:482`) discards hidden time — so hiding or closing the tab, the most literal reading of "walked away", still loses the row. There is no `pagehide`/`visibilitychange` commit. The fix works for the visible-cabinet case, which is the arcade case. | traced; honest limitation, not a defect in the ACs as written |

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md)

Checked exhaustively by `[RULE]` across 43 rules / 61 instances; 40 clean, 3 violations
(all above). The ones I re-verified myself rather than taking on report:

- **#15 source-text guards** — `highscorePumpBranch()` slices the PUMP branch and
  discriminates it by `prevHsFlap`, so it cannot silently match the render `else if`
  or the keydown guard, both of which test the same mode. Compliant, and the right
  pattern. The M8 gap is a #15 *completeness* failure, not a scoping one.
- **#26 assertions whose terms are all local** — `ENTRY_TIMEOUT_TICKS` is asserted both
  against a re-derivation (`ITERATIONS * NAP_TICKS`) and a separate hard literal
  (`7680`), with `FRAME_HZ` imported from core for the seconds range. Compliant.
- **#20 a quantity measured from an artifact the same diff changes** — the README's
  178 → 180 count is re-derived by `audio-seam-scope`'s own guard, which is what
  reddened when the files landed. Compliant, and it is why the count is right.
- **#14 derived edges inside one branch** — `tickEntry` is called from exactly one
  place, so the expiry threshold is computed where the only thing that moves it is
  visible. Compliant.
- **Core purity (CLAUDE.md's hardest rule)** — `[RULE]` ran the real AST scanner
  (`tests/purity.test.ts`, 44/44) over the new core code, not a string search.
  Compliant, mechanically.
- **ROM citations resolve** — `[DOC]` re-opened all eight independently and I
  separately confirmed `TB12REV1.SRC:70`, `:87-89`, `:1650-1652`, `:1901-1902`. Every
  line number lands on the claimed instruction. Compliant — with the one verb nit above.

### Devil's Advocate

Argue the code is broken. Start with the strongest case: **this story ships a feature
whose success condition nobody can observe.** The player is now told "TYPE A-Z", types
three letters, sees absolutely nothing appear on screen, and must then guess that SPACE
commits an invisible buffer. If they guess wrong and wait, a timer they cannot see —
with no on-screen countdown, no ROM-style cursor, no echoed character — silently writes
a row whose name is three spaces. Every visible symptom of that is identical to the
original bug the story was filed against: "I got a high score and nothing happened."
The tests cannot catch this because they assert on layout DATA, and the one thing that
would reveal it — pixels — is explicitly deferred to a human smoke test that has not
been run. Second: the "walked away" case that motivated the story is, most literally, a
closed or hidden tab, and that case is exactly the one the implementation cannot serve,
because rAF stops and the 0.25s catch-up cap throws hidden time away. So the feature
serves the player who wanders off while *watching* the screen, which is the narrower
half of the problem. Third: a confused user who types one letter and leaves now
displaces a real named entry from a 10-deep board with a blank row — the ROM would have
dropped it, and no test asserts that the blank row is preferable to the ROM's silence;
it was a ruling, not a measurement. Fourth: the guard suite would not stop any of this
from regressing — M8 proves a future edit can restore the original bug with the suite
green. What survives the argument: the persistence chain, the citation, the constant,
the single commit path, and the purity boundary are all genuinely, mechanically pinned.
What does not survive is the claim that the story's *user-visible* goal is verified. It
is asserted, and one of my findings and both out-of-scope items say so plainly.

**Handoff:** Back to TEA for the guard, then Dev — the primary finding is a missing
mutation-proven guard (TEA's domain), and the prose and test-hygiene items ride along.

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev, green] The expiry ACTION deviates from the ROM; the DURATION does not.**
  Spec (the story): "a ROM-style entry timeout that auto-commits the current initials".
  ROM: `AMODE` runs the same 7680-tick leash but on expiry does `2$ PKILL $42,$FF`
  (`TB12REV1.SRC:89`) and BRANCHES BACK to `JMP VATTRT` (`BRA 3$` at `:91`, whose
  target sits ABOVE it at `:87` — not a fall-through), and the initials only reach CMOS after
  ENTINT returns carry-set (`TB12REV1.SRC:1650-1660`) — so the 1982 cabinet also drops a
  walked-away qualifying score. Shipped: the ROM's duration, an auto-commit on expiry.
  Why: a browser cabinet has no attendant and no second chance, and preserving the score
  is the entire story. The code comment at the wiring site says which half is transcribed
  and which half is ours, so a later reader cannot mistake the auto-commit for fidelity.

- **[Dev, green] The instruction line is a PRESENTATION string, not MSENT3 verbatim.**
  Spec/AC(A): "instructions on which keys cycle letters … PRESS FLAP TO CONFIRM". ROM:
  MSENT3 $6B `'USE -MOVE- TO SELECT LETTER    -FLAP- TO ENTER LETTER'` (`MESSEQU.SRC:128`,
  put up by AMODE at `TB12REV1.SRC:70`). Shipped: `'TYPE A-Z   SPACE (FLAP) TO CONFIRM'`
  in `shell/highscoreScreen.ts`. Why: jt10-7 deliberately did not port the MOVE/FLAP
  cursor cycler (joust uses the fleet's `@shared/name-entry` keyboard verb), so the ROM
  line would name a control that does not exist here. Precedent: jt11-1's `START_PROMPT`,
  a presentation string in the shell naming real browser keys. Keeping it out of core
  also keeps `core/highscore.ts`'s verbatim-ROM-string citation gate honest.

- **[Dev, green] Widened one operand of jt10-7's arg-order guard, with a mutation to
  vindicate it.** (see Reviewer audit below) `highscore-wiring.test.ts`'s "threads (table, initials, score, wave)"
  test matched the literal `entry.initials` at the call site; both exits now share one
  `commitHighScore(initials)` helper, so the second operand was widened to
  `(?:entry\.)?initials` and two assertions were added pinning the buffer at both
  callers. Probe: swapping `entryScore`/`entryWave` inside the helper reddens that test
  alone — the mutant it exists to kill still dies. Nothing else in the guard moved.
### Reviewer (audit)

- **Deviation 1 (expiry auto-commits where the ROM abandons)** → ✓ ACCEPTED by Reviewer.
  I re-opened the evidence rather than taking it on report: `2$ PKILL $42,$FF`
  (`TB12REV1.SRC:89`) → `PCNAP 3` → `BRA 3$` → `3$ JMP VATTRT` (`:87`), and the initials
  reach CMOS only after the entry completes (`LDY #GODINT` `:1650` → `JSR CMOSMV` `:1652`).
  The ROM really does drop a walked-away score, the story really does ask for the
  opposite, and the deviation is scoped to the ACTION while the DURATION stays
  transcribed. Correctly logged, and the code comment at the wiring site says which half
  is ours. One wording nit filed as a Low finding: "falls into" should be "branches back
  to" — see the assessment.
- **Deviation 2 (ENTRY_INSTRUCTIONS is a presentation string, not MSENT3 verbatim)** →
  ✓ ACCEPTED by Reviewer. MSENT3 names MOVE/FLAP cursor cycling that jt10-7 deliberately
  did not port, so transcribing it would instruct a control that does not exist; the
  jt11-1 `START_PROMPT` precedent is real and the string correctly lives in the shell,
  which keeps core's verbatim-ROM-string citation gate honest.
- **Deviation 3 (widened jt10-7's arg-order guard)** → ✓ ACCEPTED by Reviewer. I re-ran
  the vindicating mutation independently: swapping `entryScore`/`entryWave` inside
  `commitHighScore` reddens that test and only that test. The widening is confined to
  the second operand and two new assertions pin the buffer at both callers, so the
  mutant the guard exists to kill still dies.
- **UNDOCUMENTED deviation — none found.** I checked AC(B)'s literal "auto-commit …
  when `initials.length === 3`" against the shipped behaviour: the code commits ANY
  buffer, which contradicts the AC's wording but implements the story's own sentence.
  TEA logged that as a Delivery Finding before writing the tests, so it is documented,
  not slipped through. Severity: none.

## Delivery Findings

### Reviewer (code review)

- **Gap** (blocking): the auto-commit of an INCOMPLETE buffer — the story's central
  behaviour — is unguarded; mutant M8 (`&& isEntryComplete(entry)` in the expiry branch)
  keeps the suite green. Affects `plugins/joust/tests/highscore-entry-jt11-6-wiring.test.ts`
  (pin the expiry condition's shape and re-run M8 to red). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the TEA contract file was not carried forward with the module
  it documents. Affects `plugins/joust/tests/helpers/highscore-contract.ts` (add
  `ticksLeft` and the four new members; fix the `beginEntry` doc). *Found by Reviewer during code review.*
- **Gap** (non-blocking): two comments now describe only one of the two commit paths.
  Affects `plugins/joust/src/core/highscore.ts` (`isEntryComplete`'s "the commit gate")
  and `plugins/joust/src/main.ts` (the `entry` state comment). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): four test-hygiene sites match stated TypeScript rules —
  `catch (e)` cast to `Error` without narrowing (#11, two sites) and `as LaidOutText`
  without a preceding null check (#1, two sites). Affects both new test files.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking, OUT OF SCOPE — needs its own story): the in-flight initials are
  never painted, so a player types and sees nothing; the ROM echoes every character
  (`TB12REV1.SRC:1267`) and draws a cursor (`:1287`). Pre-existing since jt10-7, but
  jt11-6's new "TYPE A-Z" line makes the silence actively misleading. Affects
  `plugins/joust/src/shell/highscoreScreen.ts` + `main.ts` (thread the buffer into the
  layout and paint it). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, OUT OF SCOPE — needs its own story): the entry countdown
  only advances while the tab renders (`requestAnimationFrame` + `MAX_CATCHUP_SECONDS`
  discards hidden time), so a hidden or closed tab still loses the row. A `pagehide` /
  `visibilitychange` commit would close it. Affects `plugins/joust/src/main.ts`.
  *Found by Reviewer during code review.*
## Tea Assessment — rework round 2 (2026-08-12)

Reviewer's HIGH finding is closed, and closed the way it was found: by mutation.

**The guard that was missing.** `the expiry commits UNCONDITIONALLY — completeness is
the MANUAL gate and only the manual gate` (wiring suite). It extracts every `if`
CONDITION in the pump branch that tests `isEntryExpired`, asserts the COUNT first (#15's
empty-set trap — if the branch stops testing expiry at all, that fails here rather than
passing over nothing), then asserts the condition is exactly `isEntryExpired(entry)` with
no `isEntryComplete` and no hand-rolled `length` term. Because a completeness check could
also be smuggled one line deeper, it additionally pins `isEntryComplete(` to exactly ONE
call site in main.ts — the manual confirm.

**Re-measured, not asserted** (`scratchpad/mutate.py` sibling run):

| Mutant | Before | Now |
|---|---|---|
| M8 `&& isEntryComplete(entry)` ANDed into the expiry condition | survived, 3531 green | **dies** — 1 red |
| M8b the same check smuggled INSIDE the expiry body | (not previously tried) | **dies** — 1 red |
| M10 the expiry branch stops testing expiry at all | (not previously tried) | **dies** — 2 red |

**The rest of the list, TEA's half:**
- `[RULE]` TS #11 — both loaders now narrow through a `detail(e: unknown)` helper
  (`e instanceof Error ? e.message : String(e)`) instead of casting.
- `[RULE]` TS #1 — the three `as LaidOutText` casts are gone; `requireInstructions()`
  narrows the union and throws a self-describing error, so no test body asserts away the
  `null` pole another test in the same file is checking.
- `[RULE]` TS #24 — `tests/helpers/highscore-contract.ts` now states the real module:
  `ticksLeft` on the buffer, `ENTRY_TIMEOUT_TICKS` / `tickEntry` / `isEntryExpired` /
  `timeoutInitials` declared and doc'd, `beginEntry`'s doc corrected, and — the part that
  makes it bite rather than decorate — the loader VALIDATES the three new functions and
  the new number, so the contract is what fails when the module drifts. Its
  `isEntryComplete` doc no longer calls itself "the commit gate".
- `[DOC]` the "falls into `JMP VATTRT`" wording is corrected in the test header and in my
  own assessment above: `BRA 3$` at `TB12REV1.SRC:91` branches BACK to `:87`. I also
  re-checked the citation range itself (`:87-89`) — that was always right; only the verb
  was wrong, which is exactly the jt5-7 shape.
- One stray typo fixed while in there: a loader message said `TB12REV1.SRC:77-79`; the
  loop is `:77-78`.

**Still open, and they are Dev's files (green):** the two source comments — 
`core/highscore.ts`'s `isEntryComplete` docstring ("the commit gate") and `main.ts`'s
`entry` state comment (documents only the manual path) — plus the "falls into" phrasing
in Dev's own Design Deviation entry, which I did not edit under the append-only rule.

Suite: 3532 passed (180 files), `npm run lint` clean.
## Dev Assessment — rework round 2 (2026-08-12)

The two comment findings are closed; both were true defects, not nits — each described
a one-path world that this story made two-path.

- `core/highscore.ts` — `isEntryComplete` no longer calls itself "the commit gate". It
  now names itself the MANUAL-confirm gate and says plainly that the timeout path does
  not consult it, because committing an INCOMPLETE buffer is that path's entire purpose.
  A reader who trusted the old sentence would have "fixed" the timeout by adding the
  completeness check — which is precisely the mutant TEA's new guard now kills.
- `main.ts` — the `entry` state comment gained the second commit path, the tick budget,
  and the fact that both roads still funnel through `commitHighScore`, so the "exactly
  one write" invariant is discoverable from the state's own docstring rather than only
  from the test that pins it.
- My Design Deviation entry's "falls into `JMP VATTRT`" is corrected in place to the
  measured control flow (`BRA 3$` at `:91` → `:87`, above it). The Reviewer was right
  and the comment-analyzer's pass on it was the near-miss: the citation range was
  correct, only the verb was false — the jt5-7 failure shape exactly.

Verification after the rework: joust 3532/3532 (one more than round 1 — TEA's new
guard), `npm run lint` clean, orchestrator 478/478, `node scripts/build-app.mjs joust`
builds. Nothing in the shipped behaviour changed this round; the diff is comments plus
TEA's guard and contract work.

Still not verified by me, unchanged from round 1: the pixels. The instruction line's Y
(222) remains a human smoke test, and the Reviewer's two out-of-scope findings — the
invisible in-flight initials and the hidden-tab countdown — are for SM to file.
## Subagent Results — round 2 (rework verification)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — re-run directly by me this round (joust 3532/3532, lint clean, orchestrator 478/478, joust builds) |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — covered by my round-2 mutation battery |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — the fix diff adds no error paths |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — the round-2 battery IS the test analysis |
| 5 | reviewer-comment-analyzer | Yes | findings (round 1) | 2 | both confirmed in round 1, both verified FIXED this round |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — the two `as` findings it would have raised came from rule-checker and are fixed |
| 7 | reviewer-security | Yes | clean | none | N/A — the fix diff is comments, a contract file and one guard; no data-flow change |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — no new abstraction introduced |
| 9 | reviewer-rule-checker | Yes | findings (round 1) | 3 (5 sites) | all three confirmed in round 1, all verified FIXED this round |

**All received:** Yes (round-1 results carried forward with each finding re-verified against the round-2 tree; no new specialists needed for a comments-and-guard diff)
**Total findings:** 0 new, 6 of 6 prior findings closed, 2 out-of-scope items still open as follow-ups.

## Reviewer Assessment — round 2

**Verdict:** APPROVED

**Data flow traced:** unchanged from round 1 and re-confirmed by diff — this round touches
comments, a test contract and one guard; `git diff 2fc41632..HEAD -- plugins/joust/src/`
is five added comment lines and one reworded docstring, no behaviour.

**Pattern observed:** the round-2 guard is the good pattern of this whole story —
`expiryConditions()` extracts the CONDITION rather than grepping for a token, asserts the
count before asserting the content (#15's empty-set trap), and then closes the obvious
escape route by pinning `isEntryComplete(` to one call site so the check cannot move into
the branch body instead. That is a guard written against the mutant, not against the word.

**Error handling:** `detail(e: unknown)` narrows with `instanceof` in both loaders; the
three `as LaidOutText` casts are gone in favour of `requireInstructions()`, which throws a
self-describing error instead of asserting away the `null` pole the sibling test checks.

### Verification — I re-ran the fixes rather than reading the claim

| Mutant | Result |
|---|---|
| M8 `&& isEntryComplete(entry)` ANDed into the expiry condition | **dies** — 1 red |
| M8b the same check smuggled INSIDE the expiry body | **dies** — 1 red |
| M8c a hand-rolled `entry.initials.length === 3` instead of the helper | **dies** — 1 red |
| M11 rename `tickEntry` in core (does the contract loader actually validate?) | **dies loudly** — 33 red |

M8c and M11 are mine, not TEA's: M8c because a guard that only forbids the named helper
invites the open-coded equivalent, and M11 because a contract that DECLARES new members
without VALIDATING them is decoration. Both hold.

`[TEST]` closed — the story's central law is now mutation-proven, three ways.
`[RULE]` closed — TS #11 (narrowed), TS #1 (no casts left; `git diff 2fc41632..HEAD`
introduces no new `as any`/`as unknown as`/`as Error`/`||`), TS #24 (the contract states
and enforces the real module).
`[DOC]` closed — `isEntryComplete` now names itself the MANUAL gate and says the timeout
deliberately bypasses it; `main.ts`'s `entry` state documents both paths and the single
write; "falls into" is corrected to the measured `BRA 3$` control flow in all three places
it appeared (test header, TEA assessment, Dev's deviation).
`[SEC]` `[SILENT]` `[SIMPLE]` `[TYPE]` `[EDGE]` — no new surface this round; round-1
conclusions stand.

**TS #13 (fix-introduced regressions) — checked explicitly**, because that is this
checklist's own warning about rework rounds: the fix diff adds no type-safety escape, no
`||` where `??` belongs, and no silenced error. The only match for those patterns in the
whole diff is inside the sprint YAML's `review_findings` string — my own round-1 verdict
text quoting the finding, not code.

### Still open — for SM to file, not to fix here

1. **The in-flight initials are never painted** (MEDIUM). A player types and sees nothing;
   the ROM echoes each character (`TB12REV1.SRC:1267`) and draws a cursor (`:1287`).
   Pre-existing since jt10-7, but this story's "TYPE A-Z" line makes the silence worse.
2. **The countdown only advances while the tab renders** (LOW). `requestAnimationFrame`
   plus `MAX_CATCHUP_SECONDS` discards hidden time, so a hidden or closed tab still loses
   the row; a `pagehide`/`visibilitychange` commit would close it.

Neither is in AC(A) or AC(B), and neither is a regression from this diff.

**Handoff:** To SM for finish-story — with the two follow-ups above as finish deliverables.