# Story jt5-6 Context

## Title
SNPCR2 — give player 2 its own transporter cue instead of P1's

## Metadata
- **Story ID:** jt5-6
- **Type:** story
- **Points:** 5
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust audio — the sound subsystem joust shipped without

## Problem

> ⚠ CORRECTION (measured at setup, 2026-08-02)
>
> The raw description below is rendered verbatim from the sprint YAML by
> `pf context create`, and it carries a lot of load-bearing true content —
> it is NOT rewritten here. But two of its claims were re-opened against
> `reference/williams-source/joust/JOUSTRV4.SRC` (repo root, CRLF — read
> with `awk`/`tr -d '\r'`, a naive grep can mislead) and one of them is
> a measured falsehood that bites this story directly:
>
> 1. **FALSE (bites this story): the ":5552, :5556" citation names the ROM
>    binding correctly, but the SHIPPED code does not match it.** The
>    description's ":5552, :5556" is correct for the ROM's `P1DEC`/`P2DEC`
>    blocks. But the code as shipped —
>    `plugins/joust/src/shell/audio.ts`, `CUE_SOURCES.playerMaterialise.callSite`
>    — cites line **5544**, which belongs to `G1DEC` (label at :5542), not
>    `P1DEC` (label at :5550, row at :5552). The comment immediately above
>    it (audio.ts:244-246) nevertheless asserts "Reached through the DSNCRE
>    field of **P1DEC's** decision block" — byte-exact verbatim, so
>    `tests/audio-rom-citations.test.ts` and the citation gate are green on
>    a misattribution (the gate re-opens only the quoted line and cannot
>    see what the surrounding prose claims about it). Measured layout —
>    each table is bound TWICE, once per family:
>    ```
>    5542: G1DEC  FDB G1JOY,...   5544: FDB SNPLWU,...,SNPFAL,0,SNPCR1
>    5546: G2DEC  FDB G2JOY,...   5548: FDB SNPLWU,...,SNPFAL,0,SNPCR2
>    5550: P1DEC  FDB P1JOY,...   5552: FDB SNPLWU,...,SNPFAL,SNPTREF,SNPCR1
>    5554: P2DEC  FDB P2JOY,...   5556: FDB SNPLWU,...,SNPFAL,SNPTREF,SNPCR2
>    ```
>    G-blocks and P-blocks differ in joystick source (G1JOY vs P1JOY) and in
>    the 8th sound slot (`0` vs `SNPTREF`) — they are different block
>    families, not duplicates. AC5 is the fix for the misattribution; AC3 is
>    the fix for the routing. HAZARD: a naive read of the description alone
>    would add SNPCR2 beside the existing (wrong) :5544/G1DEC citation
>    instead of correcting it to P1DEC/P2DEC — two different block families,
>    silently mismatched.
> 2. **STALE, not false-at-writing: "worth folding into jt5-2 if the samples
>    are being produced anyway."** jt5-2 completed 2026-08-01 and is
>    archived, so that fold-in option no longer exists — this is
>    unconditionally its own story now. The other half of the sentence
>    still holds: the samples ARE being produced (jt5-2 built the bake
>    pipeline), which is exactly why the marginal cost of one more sample
>    is low.
>
> Everything else below — the SNPCR1/SNPCR2 FCB rows, the 30+255+165 / (30+13)+255+(165-13)
> = 450/450-frame arithmetic, the format-header quote at :8045-8049 (typo
> included), and all three ADDED-BY notes from jt5-5 and jt5-2 — was
> RE-VERIFIED against JOUSTRV4.SRC at setup and stands as written.

The two knights have SEPARATE transporter re-create tables in the ROM and jt5-1 collapsed them onto one. SNPCR1 (:8116, 'FCB 070,!N$12!+$80,30') and SNPCR2 (:8119, the same $12 opener at a different offset — '30+13' — then !N$15! where SNPCR1 has !N$14!) are bound to P1DEC and P2DEC separately (:5552, :5556). jt5-1's player-materialise kind carries no payload, so both knights map onto SNPCR1 and its citation says so in a SCOPE comment. Splitting them needs a player id on the event, a second manifest row AND a second SAMPLE — not just a second row, which is the trap. Low value alone; worth folding into jt5-2 if the samples are being produced anyway. ADDED 2026-08-01 BY jt5-5 (TEA, Dev and Reviewer all routed the same finding here): BOTH of these tables are MULTI-LINE and neither cited row is the whole table. The sound-table format header says so — 'PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)' (JOUSTRV4.SRC:8045-8049) — so a pair whose code carries +$80 is followed by another, which the assembler may place on the NEXT LINE. SNPCR1 really runs :8116-8118 (30 + 255 + 165 = 450 frames) and SNPCR2 runs :8119-8121 (30+13, then 255, then 165-13 = 450 as well). Reading only the cited row gives 30 for each — a 15x error, and the citation gate cannot catch it because it re-opens the quoted line and cannot see what a reading of that line claims. jt5-5 worked around this with a separate FRAME_DURATIONS map carrying each table's extent in a comment, because CueSource holds exactly ONE Citation and cannot express a span. THE STRUCTURAL FIX BELONGS HERE: give CueSource an extent (a lines pair, or a second citation) so a table's length is cited where its priority already is, and fold FRAME_DURATIONS back into it. Note SNPCR2's operands are assembler EXPRESSIONS ('30+13', '165-13'), so any parser must evaluate them, not just read digits.

ADDED 2026-08-01 BY jt5-2 (Reviewer and SM routed three operational facts here, since this is the next story that touches the bake): (A) THE SAMPLE HALF NOW HAS A CONCRETE HOME. jt5-2 moved SOUNDS/SoundName/FRAME_DURATIONS into the dependency-free plugins/joust/src/shell/audio-manifest.ts (audio.ts re-exports them by identity), and the synthesiser is plugins/joust/tools/sample-bake/bake-samples.mjs with one SPECS entry per cue. SNPCR2's manifest row, its 450-frame extent and its synth spec all go in those two files — audio.ts needs no edit. (B) EXPECT THE DEPLOY TO ABORT UNTIL THE SPEC EXISTS, BY DESIGN: bakeSamples throws on any manifest cue with no SPECS entry ('a new cue must arrive with its own sound'), and `just deploy-assets` runs under set -euo pipefail, so adding the manifest row without the spec aborts the WHOLE recipe — star-wars staging included (nothing uploads; the bucket keeps last-good). Add the spec, re-run, and curl the new URL — the upload is idempotent (byte-identical re-runs, proven cross-process). (C) WHILE IN THE BAKE, FIX THE ONE KNOWN EDGE: the CLI gate `process.argv[1] === fileURLToPath(import.meta.url)` goes false in a checkout reached through a symlink (the ESM loader realpaths the module URL, argv[1] keeps the caller's spelling), turning the CLI into a silent exit-0 no-op. Compare realpathSync of both sides — one line.

## Technical Approach

Measured pointers only — no design ruling made here; TEA/Dev own the design.

- **The type this story extends.** `plugins/joust/src/shell/audio.ts:122-158`
  defines `Citation { file, line, verbatim }` and `CueSource` as a
  discriminated union of `{kind:'rom', table, priority, romComment, source:
  Citation, callSite: Citation}` | `{kind:'invention', note}`. Exactly ONE
  `Citation` per `rom` variant today — the structural limitation AC1/AC2
  remove by giving it an extent (a line-span or a second citation).
- **The central design tension (AC2's own stated constraint).**
  `plugins/joust/src/shell/audio-manifest.ts` holds `SoundName`, `SOUNDS`
  and `FRAME_DURATIONS` and is dependency-free BY DESIGN — its own header
  (:10) says "Nothing here may gain an import — that would break the
  deploy-time bake while every vitest stayed green", because
  `bake-samples.mjs` reaches this module under PLAIN `node` via type
  stripping. `audio.ts:83` imports from it and re-exports by identity.
  `CUE_SOURCES` (the thing AC1/AC2 extend) lives in `audio.ts`, which DOES
  import `@shared` — so folding `FRAME_DURATIONS` into `CueSource` cannot
  simply move the merged data into `audio.ts` without breaking the
  plain-`node` bake path. Do not prejudge the resolution; state it as the
  central tension.
- **Bake failure modes to expect, not "fix".** `bakeSamples` throws `no
  synth spec for manifest cue '<name>' — a new cue must arrive with its own
  sound` (`bake-samples.mjs:305-306`) and `no FRAME_DURATIONS entry for
  '<name>'` (:311). `justfile:274-289` runs `deploy-assets` under
  `set -euo pipefail`, so a manifest row with no spec aborts the WHOLE
  recipe, star-wars staging included — nothing uploads, the bucket keeps
  last-good. This is by design.
- **AC6's target, unfixed today.** The CLI gate
  `process.argv[1] === fileURLToPath(import.meta.url)` is at
  `bake-samples.mjs:319`. It goes false in a checkout reached through a
  symlink (the ESM loader realpaths the module URL; `argv[1]` keeps the
  caller's spelling), turning the CLI into a silent exit-0 no-op. Compare
  `realpathSync` of both sides.
- **Current shipped data, all verified.** `audio-manifest.ts`'s `SoundName`
  is a 17-member union; `SOUNDS` maps each to one `.wav`; `FRAME_DURATIONS`
  gives `playerMaterialise: 450 // SNPCR1 :8116-8118 30 + 255 + 165`. Its
  doc comment (:59-82) already explains the `+$80` continuation trap in
  full and names the two other multi-line offenders: SNPCR1 and SNPTED
  (:8091-8093 = 134). Read it before designing anything.
- **Sites that already pin the numbers this story must re-point, not
  delete:** `plugins/joust/tests/audio-priority.test.ts:241-243`
  (`frameDurations.playerMaterialise === 450`, message: "SNPCR1 runs
  :8116-8118 (30+255+165) — its cited row is only the first pair").
- **Sites that name SNPCR1 and will move under this story:**
  `audio-dispatch.ts`, `tests/audio-events.test.ts:407`,
  `tests/audio-flap.test.ts:245` (hardcodes the :5544 G1DEC row verbatim)
  and `:436`, `tests/audio-rom-citations.test.ts:286`,
  `tools/audit/check-citations.mjs`.
- **Prior-story quarry — read before starting.**
  `sprint/archive/jt5-5-session.md`: lines 134-140 (Reviewer), 158-164
  (Dev), 182-190 (TEA) are three independent routings of the same
  structural finding; 275-285 and 443-451 cover the 15x-error deviation
  with the two-table comparison; 512-515 explain why deriving the extent
  was not available to jt5-5. `sprint/archive/jt5-2-session.md` covers the
  bake and deploy mechanics this story's AC4 exercises end to end.

## Scope

**User ruling (2026-08-02): FULL SCOPE, re-pointed 2 → 5 points** (already
applied to `sprint/epic-jt5.yaml`). Reasoning: shipping SNPCR2 the
workaround way would add a SECOND instance of the exact workaround the
jt5-5 finding was filed against. All three workstreams below are IN SCOPE
for this one story — do not split them:

- **In scope (i): the SNPCR2 player-2 transporter cue, end to end,
  including the deploy** — AC3, AC4, AC5.
- **In scope (ii): the structural `CueSource` extent fix across all
  seventeen records, folding `FRAME_DURATIONS` back in** — AC1, AC2.
  Routed here by jt5-5's TEA, Dev AND Reviewer independently (see the
  prior-story quarry above).
- **In scope (iii): the one-line `bake-samples.mjs` symlink/realpath
  CLI-gate fix** — AC6. Routed here by jt5-2.
- **Out of scope:** anything not named by the six ACs above. In
  particular: no rework of the priority-arbitration mechanism itself
  (jt5-5, already shipped); no work on jt5-7's documentation-debt items
  (epic description staleness, README counts); no ptero/collision work
  (jt5-16 done, jt5-17 open); no enemy-brain gameplay changes (jt5-8, -9,
  -18, -19); no re-derivation of SNPTED's citation beyond what AC1/AC2
  require of it as one of the three multi-line tables.

## Acceptance Criteria
- A rom CueSource can express its table's FULL EXTENT — a line span or a second citation — and every one of the seventeen CUE_SOURCES records carries the real extent of its table, not just the defining FCB row. The multi-line tables are SNPCR1 (:8116-8118), SNPTED (:8091-8093) and the new SNPCR2 (:8119-8121); the other fourteen are single-row and must say so rather than being silently ambiguous.
- Each cue's frame total is DERIVED from its cited extent rather than hand-transcribed in a parallel FRAME_DURATIONS map, and the operands are evaluated as assembler expressions (SNPCR2 is literally 30+13 and 165-13). The totals stay 450 for SNPCR1, 450 for SNPCR2 and 134 for SNPTED. Constraint, not a design ruling: bake-samples.mjs reaches this data under PLAIN node via type stripping, so whatever module holds it must still import nothing.
- The two knights get DIFFERENT transporter cues: the core's player-materialise moment carries which knight it belongs to, and the dispatch routes player 1 to SNPCR1 and player 2 to SNPCR2. The ROM binds them per decision block — SNPCR1 at P1DEC :5552 and G1DEC :5544, SNPCR2 at P2DEC :5556 and G2DEC :5548.
- The player-2 cue ships END TO END: a manifest row in audio-manifest.ts, its own SPECS entry in tools/sample-bake/bake-samples.mjs, a baked .wav, and `just deploy-assets` actually run with the new URL verified live (a real 200). A manifest row with no spec aborts the whole recipe under set -euo pipefail, star-wars staging included, so the deploy is part of the story and not a follow-up.
- CUE_SOURCES.playerMaterialise stops misattributing its call site. Its cited row :5544 is G1DEC's block (label at :5542), while the comment above it asserts "P1DEC's decision block" — P1DEC's row is :5552. The cited line and the prose must name the SAME block, and the "both knights map here for now" sentence must go once they no longer do.
- bake-samples.mjs's CLI gate survives a checkout reached through a symlink: `process.argv[1] === fileURLToPath(import.meta.url)` (:319) goes false there because the ESM loader realpaths the module URL while argv[1] keeps the caller's spelling, turning the CLI into a silent exit-0 no-op. Compare realpathSync of both sides.

---
_Generated by `pf context create story jt5-6` from the sprint YAML._
