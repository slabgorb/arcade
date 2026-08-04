---
story_id: "jt9-25"
jira_key: "jt9-25"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-25: EGGTBL is the egg's animation driver — the third table in the block jt8-7 read, plus the signed-POSOFF decoder fix it cannot ship without

## Story Details
- **ID:** jt9-25
- **Jira Key:** jt9-25
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-04T15:31:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-04T11:39:36Z | 2026-08-04T11:43:26Z | 3m 50s |
| red | 2026-08-04T11:43:26Z | 2026-08-04T13:24:06Z | 1h 40m |
| green | 2026-08-04T13:24:06Z | 2026-08-04T15:24:39Z | 2h |
| review | 2026-08-04T15:24:39Z | 2026-08-04T15:31:37Z | 6m 58s |
| finish | 2026-08-04T15:31:37Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Decision — scope] SCOPE RESOLVED BY USER (2026-08-04): FULL EGGMAN CUTSCENE.** The
  story's deliverable 3 ("drive the egg's animation from EGGTBL") forked: frame-selection-only
  (no timing change) vs. the full EGGMAN cutscene (the egg HOLDS through the EGGTBL naps before
  the buzzard spawns). The user chose the **full cutscene**. Consequence, accepted by the user:
  this **MOVES the jt2 seeded-replay fingerprints** (the egg process ends later, the egg-hatched
  cue fires later). This CORRECTS the SM Assessment's tentative "not a fingerprint mover on its
  face" — it now IS one, by design.
- **[TEA][Conflict — blocking, DELIBERATE RE-BASELINE] jt9-9's hatch-timing pins WILL redden.**
  jt9-9 asserts a settled egg "hatches after EGGWT2/EGGWT naps → 1 enemy" AT wait-expiry
  (demo-jt9-9.test.ts, "hatches a settled WAVE egg after EGGWT2 naps" / "matures an uncollected
  kill-egg"). The cutscene delays the buzzard by the EGGTBL duration, so those pins move. My AC-4
  test "does NOT become a buzzard on the frame its wait expires" is the DIRECT CONTRADICTION that
  makes them move. Dev must **re-baseline jt9-9's timing pins AND the jt2 replay digests by
  sweeping each moved pin for its OWN precondition** (method: sprint/archive/jt5-8-session.md,
  uf1-9-session.md) — never by nudging a number toward the new output. NOT touched at RED; that is
  Dev's deliberate act in GREEN.
- **[TEA][Gap — blocking, FILE AT FINISH] Standing-knight vulnerability is OUT of scope → needs a
  follow-up story.** The ROM's EGGLLP loop (JOUSTRV4.SRC:3316-3319, "WAIT UNTILL BUZZARD COMES OR
  KILLED BY PLAYER") lets the just-hatched standing knight (PLY4S) be killed by a player before the
  buzzard arrives. This story ends the cutscene by spawning the buzzard after PLY4S; it does NOT
  model the vulnerable standing-knight interaction. Per the user's "descoped findings must be
  filed" rule, **SM must file this as a story at finish** (suggested: "joust — the hatched standing
  knight is killable during EGGLLP before the buzzard remounts, JOUSTRV4.SRC:3316-3319").
- **[TEA][Note] Two of the story's numbers were stale; SM already corrected them** (posOffset is at
  demo.ts:1868 / call site :1876, not :1524/:1532; ENTITY_RECORDS is 50 records with 2 high-bit,
  not "44 in [237,751]" — the RANGE is exact, the count stale). RED tests read the live positions,
  not the story's numbers. Nothing to do; recorded so the Reviewer does not re-flag it.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev] Two correctness fixes the cutscene FORCED, found by re-baselining not review — the
  Reviewer should scrutinise both.** Neither was in the TEA ACs; both are load-bearing for the
  cutscene to be faithful, and each is proven by a re-baselined test rather than argued.
  1. **NENEMY counts a mid-cutscene egg** (`demo.ts` population init, ~:1660). A matured egg is
     `kind:'egg'` (hatchRow set) for 112 frames before it becomes an enemy; the quota counted only
     `kind:'enemy'`, so a deferred egg re-polling during that window saw an empty arena and hatched
     past the gate. The ROM's `INC NENEMY` fires at EGGLND (maturation), so a mid-cutscene egg IS
     part of NENEMY. Fix: count `enemy` OR `egg with hatchRow set`. Proven by `demo-jt9-40`'s
     step-through (`until + EGG_HATCH_ANIM_FRAMES`), which reds without it.
  2. **A committed-hatching egg is no longer collectible** (`demo.ts` catch loop, ~:1363). The ROM
     commits the hatch at `INC NENEMY`; a cracking egg cannot be caught for score. Leaving it
     collectible let a player cancel a committed remount mid-crack — MEASURED on seed 0xface, where
     the one egg that reached the cutscene was collected and NO buzzard ever flew in (the timeline
     reverted toward pre-jt9-9). This is distinct from the standing-knight kill during EGGLLP (the
     filed follow-up). Verified: post-fix, seed 0xface hatches at f=1128 and the buzzard appears at
     f=1240 (=1128+112).

## Sm Assessment

Setup complete; routing to TEA for RED. jt9-25 is 6 points, `tdd`, trunk-based (no
branch, no PR), and it is a **merged** story: jt9-13's signed-POSOFF decoder fix is its
FIRST COMMIT, and the EGGTBL animation work rides on top. Ship them as separate commits
in that order — the decoder fix is unobservable alone, which is precisely why it was
folded in, and the drawn frames are what make it visible.

Race check: `git fetch` + scan of origin found no sibling checkout working jt9-25. This
checkout was 8 commits behind (a sibling's cp7-1 work) and was fast-forwarded to
`f8d5e1b` before setup, so the sprint YAML this story mutates is current.

Not a fingerprint mover on its face — it adds a draw path and fixes a decoder, neither
of which touches the sim's RNG consumption. **Verify that rather than assume it**: the
epic's standing rule is one fingerprint-moving change per commit, and jt9-1 is the
cautionary tale in the other direction (it budgeted for a 20-assertion re-baseline and
moved zero pins). If the jt2 replay digests do move, that is a signal something entered
the simulation that should not have.

The story's own text was measured before handoff rather than trusted — the epic
declares its story text a filing, not a measurement. Results below. Headline: the
EGGTBL transcription is exact, the column semantics the story left UNMEASURED are now
measured, and the story's instruction to reuse the EGF_LEFT/EGF_RIGHT decoding idiom is
a trap that would silently corrupt two of three columns.

Model advisory noted: this session runs `claude-opus-5` where `models.yaml` expects
`sonnet` for the setup phase. Carried on deliberately — the setup was measurement-heavy.

## SM Setup Measurements (2026-08-04)

The epic's standing rule is that its story text is **a filing, not a measurement**. SM
measured jt9-25's falsifiable claims before RED. **These are claims to VERIFY, not
ground truth** — every one is cited as `LABEL (:line)` so TEA can re-open it. If one is
wrong, the story text is not automatically right either; re-derive.

### CONFIRMED EXACT — the EGGTBL transcription

`awk` over `reference/williams-source/joust/JOUSTRV4.SRC` :3528-3552 reproduces the
story's block byte for byte and comment for comment: header `* EGG ANIMATION TABLE *`
(:3533), `EGFLFT FCB 0,12,6` (:3535), `EGFRIT FCB 0,6,12` (:3536), `EGGTBL FCB 6,6,7`
(:3537) through `FCB 36,11,0 HATCH 4` (:3544). Next header is `* BUZARD SEEKING MAN *`
(:3546), so the block genuinely ends at :3544 — read to it, per the story's method note.

### MEASURED — the three columns the story said were UNMEASURED and must not be guessed

Single consumer: `LDX #EGGTBL` (:3290), stored to `PRDIR,U` (:3291) as a walking
pointer. The `EGGNXF`/`EGGHCH` loop (:3294-3307) decodes all three:

| Col | Meaning | Evidence |
|-----|---------|----------|
| 0 | byte offset into EGGI (row × 6) | `LDA [PRDIR,U] GET NEXT FRAME OFFSET` (:3299) → `JSR WEGPAR` (:3300), and `WEGPAR LDY EGGI / LEAY A,Y` (:3527-3528) |
| 1 | **collision height** — `PCOLY2 = PPOSY+1 − col1` | `LDA PPOSY+1,U` → `STA PCOLY1,U` → `SUBA 1,X` → `STA PCOLY2,U` (:3302-3305) |
| 2 | **nap duration AND terminator** | `LDA 2,X / BNE EGGHCH` (:3306-3307); `EGGHCH LEAX 3,X` then `JSR VNAPTPC NAP REG.A TIME` (:3294-3296). Zero ends the sequence |

So the story's guess "likely a height and a frame duration, `7+60` being the tell" is
**correct on both axes**, and `HATCH 4`'s trailing `0` is what terminates the animation.

### THE TRAP — EGF_LEFT/EGF_RIGHT do NOT share EGGTBL's column semantics

The story says to transcribe EGGTBL *"beside EGF_LEFT/EGF_RIGHT in demo.ts, which
already carries the row-offset idiom"*. **Copying that idiom wholesale is a defect.**
All THREE of EGFLFT/EGFRIT's columns are EGGI byte offsets, selected by fall speed —
`,Y` slow/up (`WEGUP`, :3518), `1,Y` fast-up (`WEGD3`, :3526), `2,Y` fast-down
(`WEGD2`, :3521). EGGTBL's columns are three *different* things (above). Two adjacent
tables, same 3-byte row width, incompatible column meanings. A Dev who reuses the
decoder will read EGGTBL's collision height and nap duration as EGGI row offsets.

Port side: `EGF_LEFT = [0, 12, 6]` (`demo.ts:368`), `EGF_RIGHT = [0, 6, 12]` (:370),
consumed at :1054 via `EGGI_STILL_MASKS[slot / EGGI_ROW_BYTES]` (:1063) — i.e. the
existing idiom divides by 6, which is right for EGF_* and right for EGGTBL **column 0
only**.

### REFINEMENT — EGGTBL is ONE linear hatch sequence, not a wiggle/hatch selector

The story lists the rows as if they were selectable states. The driver enters at row 0
and walks forward 3 bytes at a time until col 2 is zero: wiggle → pause → HATCH 1-4,
then `PCNAP 7` (:3309) and `LEAY 24,Y POINT TO STANDING PLAYER` (:3311-3314) — the
knight stands up. The :3290 comment reads `GET SIDE SHOW FOR THE EGG, WHILE THE BIRD IS
IN FLIGHT`, so this whole sequence plays while the buzzard flies in to remount. It is
the hatch cutscene, not an idle-egg animation.

### TWO OF THE STORY'S NUMBERS ARE STALE (structural claims still hold)

1. **`posOffset` line refs.** Story says `demo.ts:1524` (and `~:1495` in the older
   half) with its call site at `:1532`. Measured: definition at **`demo.ts:1868`**,
   sole call site at **`:1876`** inside `entityOp`. The "exactly ONE call site in the
   whole plugin" claim is **TRUE** — grep finds no other; the three test-file hits are
   comments. The file grew; re-anchor rather than trusting the numbers.
2. **The record count.** Story says *"All 44 pre-existing ENTITY_RECORDS have a
   position word in [237, 751]"*. Measured: **50 records**, of which **48** are in
   `[237, 751]` — the RANGE is exact, the COUNT is stale. Exactly **two** carry the
   high bit: `EGGB2` `0xfff6` and `EGGB3` `0xfef5` (`pictures.ts:1718-1719`), matching
   the story's measurement precisely. So the proposed decode-range guard
   (`-128 <= xoff <= 127` over every record) still reds on exactly those two today.

### CONFIRMED — the bug, and that nothing draws an egg frame yet

`posOffset` body is verbatim as filed: `{ xoff: rec.position >> 8, yoff: 256 - (rec.position & 0xff) }`.
Its own docstring cites `destX = CLSX + XOFF` (`WRHOR2`, JOUSTRV4.SRC:6092-6098), which
is what makes a signed XOFF coherent. The only egg draw in the tree is the single
`entityOp('EGGI', p.egg.posX, p.egg.posY >> 8, 1)` (`demo.ts:1916`) — so EGGB1/2/3 and
PLY4S are unreachable until this story draws them, exactly as filed.

### NOTE FOR RED — the vacuity hazard on the decode guard

A decode-range assertion over `ENTITY_RECORDS` passes today for 48 of 50 records. Per
the epic's repeated lesson, assert with a **wrong value, not the old one**, and carry a
positive control: a guard that never observes a high-bit record is vacuous. The two
high-bit records are the only non-trivial input the guard has, so if a future edit
removes them the guard silently becomes an assertion about nothing.

### OUT OF SCOPE (do not fix here)

`demo-jt3-7-render.test.ts:7` carries a stale comment ref `posOffset(name) (demo.ts:699)`.
That is **jt9-30's** scope (comment-body `<file>.ts:<line>` refs → symbol refs), not
this story's. Leave it.
## Tea Assessment

RED complete. The story shipped with NO acceptance criteria (SM left them to TEA); I
defined six ACs below and wrote three failing suites against them. **14 feature tests
red, 2669 green, no collateral damage** (the one incidental red — jt5-7's derived
README file-count guard, 112→115 from adding three suites — is healed: the count is now
accurate). Every RED failure is feature-absent, not a wiring error: the decoder suite
fails with the self-describing "must EXPORT posOffset", the animation suite with "must
export EGGTBL, eggFrame", and AC-4's timing test with the live proof that the port makes
a buzzard instantly today (`expected 1 to be 0`). The `-source` byte-gates RAN (vendored
present) and PASSED — so the EGGTBL transcription and column semantics in the tests are
validated against the real 1982 ROM, not just asserted.

### Commit structure (LOAD-BEARING — the epic's fingerprint-mover standing rule)

- **COMMIT 1 — the signed-POSOFF decoder (jt9-13).** Render-only; `posOffset` is read
  only by drawList/entityOp, never by the sim, so it moves NO fingerprints. Ship it
  FIRST and ALONE. Tests: `demo-jt9-25-decoder.test.ts`.
- **COMMIT 2 — the EGGTBL cutscene.** A FINGERPRINT MOVER (see Delivery Findings). Ship
  it SEPARATELY, with the re-baseline in its own commit carrying its own message. Tests:
  `demo-jt9-25.test.ts` + `demo-jt9-25-source.test.ts`. Do NOT batch this with the
  decoder, and do NOT land it in a commit that also touches another fingerprint mover.
- **README file-count (jt5-7's derived guard) — keep EACH commit green.** I set
  `plugins/joust/README.md` to **115** (the final state, all three suites present). But
  the guard counts discovered files, so at commit 1 only `demo-jt9-25-decoder.test.ts`
  exists (**113** files) — set the README to 113 in commit 1, then 115 in commit 2 when the
  other two suites land. (If you instead land all three suites in commit 1, 115 is already
  correct — but that forfeits the decoder's clean isolation.)

### The acceptance criteria (defined by TEA)

- **AC-1 — the signed-POSOFF decoder.** `posOffset` sign-extends the high byte and is
  EXPORTED; every ENTITY_RECORD decodes to an xoff in [-128,127]; EGGB2 ($FFF6)→-1,
  EGGB3 ($FEF5)→-2, both Y halves (10/11) unchanged; the 48 clean records are byte-identical
  (positive control). Guard reds today for exactly EGGB2/EGGB3.
- **AC-2 — EGGTBL transcribed byte-exact.** demo.ts exports `EGGTBL` = the 8 rows of
  JOUSTRV4.SRC:3537-3544 in order, `7+60`=67 included; cross-checked against the vendored
  file in the `-source` suite.
- **AC-3 — the three columns carry their MEASURED meanings (the SM trap).** col0 = EGGI
  byte offset (×6→row), col1 = collision height (raw {6,11}, NEVER ÷6), col2 = nap +
  zero terminator. A Dev who reuses eggMaskFor's `/ EGGI_ROW_BYTES` on col1/col2 reddens.
- **AC-4 — the hatch is an EGGTBL-driven cutscene.** A settled egg past its wait does NOT
  become a buzzard that frame; it holds, drawing the EGGTBL frames in order
  [EGGLF, EGGI, EGGRT, EGGI, EGGB1, EGGB2, EGGB3, PLY4S] via an `eggFrame(p)` selector
  (the enemyFrame/pteroFrame/trollFrame idiom) that drawList calls; the buzzard spawns only
  after PLY4S. EGGB2/EGGB3 draw at xoff -1/-2 — the cutscene and the decoder verify each other.
- **AC-5 — corroboration + claims.** EGGTBL's max offset 36→row 6 requires EGGI's 7 rows
  (independent of jt8-7's own reading); committed claims cite the table (:3537-3544) and its
  driver (:3290-3307); the citations suite is green.
- **AC-6 — the re-baseline is deliberate.** Every moved jt2/jt9-9 pin is re-found by its own
  precondition and called out; the cutscene ships as its own commit, separate from the decoder.

### Test map

| File | Covers | Notes |
|------|--------|-------|
| `demo-jt9-25-decoder.test.ts` | AC-1 | Commit 1. Local `loadPosOffset` requires the export. |
| `demo-jt9-25.test.ts` | AC-2/3/4/5 | Commit 2 behaviour. jt9-9 fixture idiom; local `loadEggAnim`. |
| `demo-jt9-25-source.test.ts` | AC-2/3/5 | Provenance; byte-gates PASS today (validate transcription). |

### Non-vacuity / mutation notes for the Reviewer

- AC-1 asserts exact values against an INDEPENDENT `signedXoff` formula (not the module's),
  plus a floor test that fails if EGGB2/EGGB3 ever vanish (else the range guard goes vacuous —
  the [node-env]/regenerated-instance class of trap).
- AC-4's sequence test dedups CONSECUTIVE frames only, so the two non-adjacent EGGI frames
  (WIGGLE UP, WIGGLE UP & PAUSE) are both required — a walk that collapses them reddens.
- AC-4's "held, not vanished" test also asserts an egg frame is still DRAWN, so a buggy impl
  that drops the egg without spawning a buzzard cannot pass on `enemiesIn === 0` alone.
- The EGGTBL bytes and every driver line in the `-source` suite are pinned against the real
  vendored ROM and passed at RED — the transcription target is not merely self-consistent.

Model advisory noted: red phase expects `sonnet`; running `claude-opus-4-8` (user switched
mid-session). Higher tier, carried on deliberately.
## Dev Assessment

GREEN complete and pushed. Two commits, in the mandated fingerprint-mover order, each
green as its own tree:

- **46dfa69 — commit 1, the decoder (jt9-13).** `posOffset` sign-extends the high byte
  and is exported; render-only, moves NO fingerprints. Shipped alone.
- **e16e558 — commit 2, the EGGMAN cutscene.** EGGTBL transcribed + claimed (JT87-005/006),
  `eggFrame` walks it, `drawList` calls it, and a matured egg HOLDS as `kind:'egg'` for
  `EGG_HATCH_ANIM_FRAMES` (112) before the buzzard. The fingerprint mover, with its whole
  re-baseline in this one commit.

**Blast radius, all re-baselined (25 tests / 9 files), separated regression from re-baseline
first — no regression found, and two latent BUGS surfaced (see Design Deviations):**
- egg-machinery timing (jt9-9 ×7, jt9-38 ×7, jt9-40 ×2, jt8-4 ×1): invariants intact; the
  observation moved to cutscene-entry (`hatchRow` set) or past the cutscene
  (`+ EGG_HATCH_ANIM_FRAMES`). Added `hatchingIn`/`waitingIn` predicates to jt9-38.
- seeded replays (audio-events ×3, audio-transporter-split ×2, audio-emission ×1,
  dumb-wingbeat ×1): re-swept seed 0xface for each pin's OWN precondition, never nudged —
  death 2578→1893, knight-TWO re-entry 2579→1894, wave advance 2246→1731; audio-emission's
  SNEGGH precondition is now "an egg began hatching, one per cue"; dumb-wingbeat needed NO
  change once the collectibility fix restored maturation. 0xbeef and 0x2468 are bit-identical
  (their windows hold no hatch reaching the cutscene). The egg-hatched CUE frame is unchanged
  (it fires at EGGLND).
- derived counts: README file-count 113→115, claim-count 959→961.

**The re-baseline method mattered.** I swept with a temporary instrumented replay (deleted
before commit) that tracked hatch-starts AND egg→buzzard remounts, not just frame anchors —
which is what caught deviation #2: the FIRST sweep showed one hatch-start (f=1128) and ZERO
remounts, i.e. the hatch never completed. Nudging the anchors to the diverged values would
have shipped that regression green.

**Sibling race handled.** A sibling pushed 15 commits (cp7-2/3, sw8-27, jt9-24 setup) while I
worked. No code overlap (they touched centipede/star-wars/sprint); rebased my two commits onto
origin/main cleanly and the `sprint/epic-jt9.yaml` (jt9-24 vs jt9-25, different regions)
auto-merged. Pushed; HEAD is level with origin/main. jt9-24 is a sibling's ACTIVE joust story —
its Reviewer/finish must not clobber this work, and vice versa.

Verification: `npx vitest run --project joust` → 115 files / 2683 passed; `npm run
test:orchestrator` → 390/390; `npx tsc --noEmit` (repo-wide) → exit 0.

Model advisory noted: green phase expects `sonnet`; running `claude-opus-4-8` (user switched).
## Reviewer Assessment

**Verdict:** APPROVED

**Method.** All nine reviewer subagents are disabled in `.pennyfarthing/config.local.yaml`,
so — as the reviewer-mutation playbook for this repo dictates — I ran a MUTATION BATTERY
over the changed surfaces rather than re-reading the diff. Seven mutations, each reverted
after measuring:

| # | Mutation | Result |
|---|----------|--------|
| M1 | delete the committed-hatching catch exclusion (deviation 2) | 6 red (seeded replays) — GUARDED |
| M2 | population counts `enemy` only, not mid-cutscene eggs (deviation 1) | 1 red (jt9-40 step-through) — GUARDED |
| M3 | revert posOffset sign-extension | 4 red (decoder) — GUARDED |
| M4 | sign boundary `hi>127` → `hi>128` | 5 GREEN — survives, but SOUND (see below) |
| M5 | eggFrame reads col0 as a row index (drop `/ EGGI_ROW_BYTES`) | 2 red — GUARDED |
| M6 | cutscene terminator off-by-one (`< length` → `< length+1`) | 8 red — GUARDED |
| M7 | revert the cutscene ENTRY (matured egg → instant buzzard) | 18 red — the re-baselines are NON-VACUOUS |

**M4 is not a defect.** `hi>128` differs from `hi>127` only at a high byte of exactly 0x80
(128), and no ENTITY_RECORD has one. The instant a record with hi=0x80 arrives, the
decode-range guard (`-128 <= xoff <= 127` over every record) reddens it — 128 decodes to
+128 under the mutant, which is out of range. The guard is sound; it simply has no 0x80
datum to exercise today. No action.

**Both Dev deviations verified and GUARDED** (M1, M2). Deviation 2 (collectibility) shipped
guarded only INDIRECTLY, by seed 0xface's replay anchors — a future re-baseline could erase
that silently. Fixed IN REVIEW (db98510): added a direct, mutation-proven guard (a hatching
egg overlapping a player is not collected and still reaches its buzzard). Deviation 1's guard
(jt9-40's step-through past the cutscene) is direct and adequate.

**Re-baselines audited, not rubber-stamped.** M7 proves the 25 re-baselined pins genuinely
track the cutscene rather than having gone vacuous. The seeded-replay anchors were re-derived
by sweeping seed 0xface for each pin's OWN precondition (the divergence caught a real bug
mid-review-of-Dev's-work — see below), never nudged; 0xbeef/0x2468 are bit-identical.

**The re-baseline method caught a real bug during Dev, recorded for the record.** Dev's first
cutscene left a mid-crack egg collectible; the instrumented sweep (hatch-starts AND
egg→buzzard remounts, not just anchors) showed one hatch-start and ZERO remounts, i.e. the
hatch never completed. Nudging anchors to the diverged values would have shipped that green.
Both the fix and this discipline are the right call.

**Also checked:** citation gate green (JT87-005/006 verbatim byte-exact); repo-wide `tsc`
exit 0; `test:orchestrator` 390/390; `--project joust` 115 files / 2684 passed. Commit
structure honours the epic's fingerprint-mover rule — decoder (46dfa69, render-only) alone,
cutscene (e16e558, the mover) with its whole re-baseline in one commit.

**One non-blocking item for SM at finish:** the standing-knight EGGLLP vulnerability
(TEA Delivery Finding) must be filed as a follow-up story.

## Subagent Results

Reviewer subagents are DISABLED (config.local.yaml — all nine `false`); a manual mutation
battery (table above) was run in their place, per this repo's reviewer playbook.

| Subagent | Status |
|----------|--------|
| reviewer-preflight | Run manually: `--project joust` 115 files / 2684 passed, `test:orchestrator` 390/390, repo-wide `tsc` exit 0, citation gate green. No blocking smells. |
| (all specialists) | disabled — mutation battery substituted |

All received: Yes