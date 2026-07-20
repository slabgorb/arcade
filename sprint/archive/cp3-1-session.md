---
story_id: "cp3-1"
jira_key: "cp3-1"
epic: "cp3"
workflow: "tdd"
---
# Story cp3-1: The spider (BUG, slot 13) — BUGOFF/BUGMV movement, mushroom eating, contact death, proximity scoring

## Story Details
- **ID:** cp3-1
- **Jira Key:** cp3-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T00:22:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T23:04:53Z | 2026-07-19T23:07:13Z | 2m 20s |
| red | 2026-07-19T23:07:13Z | 2026-07-19T23:27:32Z | 20m 19s |
| green | 2026-07-19T23:27:32Z | 2026-07-19T23:42:07Z | 14m 35s |
| review | 2026-07-19T23:42:07Z | 2026-07-20T00:22:56Z | 40m 49s |
| finish | 2026-07-20T00:22:56Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): cp1-3's picture naming table is missing the three points
  sprites. `THREE` (0x1B0, `revision.v2/CENPIC.MAC:47`), `SIX` (0x1C0, `:48`) and
  `NINE` (0x5B0, `:146`) are real CENPIC labels but are absent from `STAMPS`.
  Affects `src/core/pictures.ts` + `docs/rom-study/pictures.md` (add the three
  stamps and a "Points display" section to the naming table).
  *Found by TEA during test design.*

- **Gap** (non-blocking): `EXPLOD` walks slots **13 → 0** (`CENTI4.MAC:963`
  `LDX I,13.`), but cp2-4's `stepExplosions` maps only the 12 segment slots, so
  the spider's explosion has no stepper. Affects `src/core/centipede.ts` /
  `src/core/spider.ts` (the spider's explosion countdown + the `:972-979` points
  flip must be driven from the same per-frame call).
  *Found by TEA during test design.*

- **Conflict** (non-blocking): `OVRLAP`'s liveness gate is `pic >= 0xF4`
  (`:1754-1755`), which does **not** exclude our vacant convention `pic & 0x80`
  — a vacant slot (0x80) reads as ALIVE to a literal transcription. The tests
  require vacant slots to be skipped as well. Affects `src/core/spider.ts`
  (skip `isVacant` in addition to the ROM's `>= 0xF4`), and the divergence
  should be recorded rather than silently absorbed.
  *Found by TEA during test design.*

- **Gap** (non-blocking): `OVRLAP` scans `LDY I,12.` — slots 12 **and** below,
  i.e. it includes the FLEA slot (`ANTP =MOBJP+12.`). cp3-1 scopes the scan to
  the 12 centipede segments because the flea does not exist yet; cp3-2 must
  widen it when it lands. Affects `src/core/spider.ts` (the segs argument).
  *Found by TEA during test design.*

- **Question** (non-blocking): the spider's `dh`/`dv` sign convention is
  **inverted** relative to a centipede segment — BUGMV subtracts (`:343-345`,
  `:354-355`) where MOTION adds (cp2-3 CT-77). Both are faithful, but a single
  shared "step a motion object" helper would silently break one of them.
  Affects `src/core/spider.ts` (keep the step local, do not unify with
  `descend`). *Found by TEA during test design.*

- **Improvement** (non-blocking): `CENTI4.MAC:262`'s comment `;IF SCORE < 1000,
  USE SLOW SPIDER` sits on the `BCC` line but describes the FALL-THROUGH — the
  branch itself is taken when the threshold is *below* SCORE1 (fast spider).
  Derived from the branch, not the comment; worth a note in the dossier next to
  the other "code wins over its own comment" findings (cf. PM-23's RESTOR
  cadence). Affects `docs/rom-study/open-questions.md`.
  *Found by TEA during test design.*

### Reviewer (review)

- **Gap** (non-blocking): **OBSTAC's left-margin clamp is unmodelled.**
  `CENTI4.MAC:1715-1719` (`LDA I,0F7 / SEC / SBC TEMP1 / BCS 5$ / LDA I,0 ;USE
  LEFT MARGIN`) forces the column to 0 when H' > 0xF7; `obstacleCellFor` instead
  yields a negative column that `obstacleCode` rejects, returning "no obstacle".
  An object at h ≥ 0xF8 therefore misses column-0 cells the ROM would hit.
  Affects `src/core/playfield.ts:127-133` — shared by the gun, the shot and every
  segment, so it needs its own story with regression tests for each consumer.
  cp3-1 is the first story to reach that range (the spider parks at 0xFF).
  Related, same routine: the right-side wrap fixup at `:1727-1732`
  (`CPY I,07 / CMP I,0C0 / AND I,1F / ORA I,0A0`) is also unmodelled, and the
  spider's `h < 5` band sits at that end. *Found by Reviewer during review.*

- **Gap** (non-blocking): **PLAY runs after SHOOT in the sim; the ROM runs it
  inside BUGMV, before SHOOT.** The ROM calls PLAY at `:417` (mainloop `:33`) and
  SHOOT at `:34`, so on a frame where the spider is inside BOTH the gun's box and
  the shot's box the ROM kills the PLAYER — PLAY stamps `MOBJP = 0xFF` at
  `:1806`, and SHOOT's `:2177-2178` guard then skips the slot so no points score.
  Our sim resolves the shot first: the spider dies, the player lives, and the
  points are awarded. Inherited from cp2-5's frame skeleton (which also defers
  `checkPlayerContact` to the end of the frame), not introduced by cp3-1.
  Affects `src/core/sim.ts` (order `checkPlayerContact` between `stepSpider` and
  `resolveSpiderShotHit`). *Found by Reviewer during review.*

- **Improvement** (non-blocking): the SHOOT-tail delay gate (`:2305-2307
  LDA X,DEAD-1 / ORA DELAY / BEQ 50$`) means the ROM keeps ticking a killed
  spider's COUNT *during* the death and wave-clear pauses; `stepPlayingFrame` is
  not entered while `delay` is set, so our spider re-arms slightly late. Affects
  `src/core/sim.ts` (`stepDeathFrame`). *Found by Reviewer during review.*

- **Gap** (non-blocking): **SHOOT's scan priority is inverted — the ROM tests the
  spider first, the sim tests the segments first.** SHOOT enters its slot loop at
  `CENTI4.MAC:2171` (`11$: LDX I,13.`) and walks *down* (`:2292-2294 16$: DEX /
  BMI 30$ / JMP 115$`), and the first slot whose windows match wins outright — a
  hit falls through `19$`/`20$` to `30$` and never resumes the scan. Slot 13 is
  the spider, so on a frame where the shot sits inside both the spider's window
  (`:2202` |dV| < 5, `:2232` |dH| < 10.) and a segment's (`:2202` |dV| < 5,
  `:2266` |dH| < 6), the ROM kills the **spider** and scores 300/900/600.
  `sim.ts` calls `resolveShotHit` (segments, `:176`) before `resolveSpiderShotHit`
  (`:205`), so we kill the segment and score 10/100 instead.
  Same class as the PLAY-vs-SHOOT ordering finding above and with the same
  remedy: the honest fix is to reorder the frame so the ROM's mainloop sequence
  (MOTION/EXPLOD → SHOOT, spider-first inside SHOOT) is reproduced, which is
  cp2-scoped shared-skeleton work with its own regression surface across every
  segment test. Not hacked in here. Affects `src/core/sim.ts`.
  *Found by Reviewer during review (edge-hunter retry, triaged).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **OVRLAP scoped to the 12 centipede segments, not the ROM's 13 slots**
  - Spec source: context-story-cp3-1.md, AC-1 ("movement … transcribed from BUGOFF/BUGMV")
  - Spec text: "Spider spawn/entry, movement pattern, retreat, and speed transcribed from BUGOFF/BUGMV"
  - Implementation: `OVRLAP` (`:1749 LDY I,12.`) scans slots 12..0, which includes
    the flea slot (`ANTP =MOBJP+12.`). The tests pass only the 12 centipede
    segments and pin no flea interaction.
  - Rationale: the flea does not exist until cp3-2; a test staging slot 12 would
    have to invent its state. Filed as a Delivery Finding for cp3-2 to widen.
  - Severity: minor
  - Forward impact: cp3-2 must extend the spider's OVRLAP input to include the flea.

- **DIP difficulty parameterized rather than modelled**
  - Spec source: context-epic-cp3.md, the wave-gating ruling
  - Spec text: "spawn/behaviour conditions that read wave or score state not yet
    modelled … are transcribed with that input PARAMETERIZED and test-pinned"
  - Implementation: `createSpider(rng, score, { easy })` takes the OPTNS bit-6
    difficulty as an explicit option; both the 1000-point (hard) and 5000-point
    (easy) gates are pinned, and no default is asserted.
  - Rationale: OPTNS is not modelled anywhere in the sim yet. Pinning the
    MECHANISM at both settings avoids baking a guessed factory default.
  - Severity: minor
  - Forward impact: a future DIP/options story supplies the real default.

- **Bottom-hugging goes FULLY LIVE, not parameterized**
  - Spec source: context-story-cp3-1.md, AC-1 / the story description
  - Spec text: "transcribe with the threshold parameterized … so this may go
    fully live now if the code allows; record which"
  - Implementation: `spiderTopLimit(score)` reads the sim's real score — live, not
    parameterized — because `SimState.score` already exists (cp1-6).
  - Rationale: the story explicitly permits this and asks which was chosen.
    RECORDED: fully live.
  - Severity: none (spec-sanctioned choice, logged as instructed)
  - Forward impact: none.

- **The score→SCORE2 BCD packing is asserted through behaviour, not a pinned byte**
  - Spec source: context-story-cp3-1.md, AC-1
  - Spec text: "deterministic seeded tests pin the trajectory"
  - Implementation: the tests recompute the ROM's BCD arithmetic independently
    (`expectedTopLimit`) and sweep 0..999,000 rather than pinning a table of
    magic limits.
  - Rationale: an independent recomputation catches an off-by-one the way a
    copied expectation table cannot, and it exercises the clamp far past its end.
  - Severity: minor
  - Forward impact: none.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none — tests/tsc/build/citations green | N/A (see caveat) |
| 2 | ROM-fidelity checker (custom) | Yes | findings | 8 (1 med, 2 low/med, 5 info); confirmed all 8 transcription claims TRUE | 2 FIXED, 1 filed follow-up, 5 recorded |
| 3 | reviewer-test-analyzer | Yes | findings | 14 (4 high, 5 med, 5 low) | 9 FIXED, 1 reframed, 4 recorded |
| 4 | reviewer-edge-hunter | Yes (2nd attempt) | findings | 5 (3 high, 2 med) | 4 investigated + DISMISSED with ROM evidence; 1 (SHOOT scan priority) FILED as a Delivery Finding — cp2-scoped frame reordering |
| 5 | reviewer-security | Yes | findings | 1 (low, latent fragility) | accepted as-is; independently corroborated finding #4 |
| 6 | reviewer-simplifier | Yes | findings | 3 (1 high, 2 low) | 1 FIXED (scratch file), 2 declined with rationale |
| 7 | reviewer-silent-failure-hunter | Yes | findings | 1 (low, informational) | documented at the call site; no live defects found |
| 8 | reviewer-comment-analyzer | Yes | findings | 4 (3 high, 1 med) — all doc/citation | 4 FIXED |
| 9 | reviewer-type-design | Yes | findings | 6 (2 high, 2 med, 2 low) | 5 FIXED, 1 filed |
| 10 | reviewer-rule-checker | Yes | findings | 8 across 18 rules | 5 FIXED, 2 already fixed upstream, 1 accepted |

**All received: Yes** — 10 of 10 specialists returned and are triaged above.

**Caveat on row 1 — the preflight's "clean tree" was stale.** The first
edge-hunter run left `tests/_scratch_edge.test.ts` in the repo *after* preflight
had already reported. It went unnoticed into `ccc5879` and was caught two rounds
later by the simplifier (an `it()` with zero assertions, only `console.log`).
Removed in `395ae2a`. Mechanical preflight is a snapshot, not a standing
guarantee — re-check the tree immediately before committing, not once at the top.

**The edge-hunter had to be dispatched twice** (the first run never returned). It left a scratch file
(`tests/_scratch_edge.test.ts`) in the working tree, which I deleted — worth
knowing because `reviewer-preflight` ran BEFORE that file appeared and reported a
clean tree, so the two reports were briefly inconsistent through no fault of
either. Its dimension (exhaustive path enumeration) was covered directly instead:
I hand-enumerated `stepSpider`'s branches, which is how the two critical defects
below were found, and backed it with a 60,000-frame soak (3 seeds × 20k) that
asserted every spider picture stayed in a valid state and that `render()` never
threw. That is not a claim the agent would have found nothing — it is a statement
of what was done in its place.

## SM Assessment

**Setup verified.** Session file, story context (`sprint/context/context-story-cp3-1.md`),
epic context, and branch `feat/cp3-1-spider-bugoff-bugmv` (cut from `origin/develop`, pushed)
all exist. Epic cp3 moved backlog → in_progress; cp3-1 in_progress. No open centipede PRs;
`origin/develop` head is cp2-13 (aaf59b6) — no sibling checkout has raced this story.

**Sequencing ruling.** The epic gates cp3 on "cp2 complete (EXPLOD, PLAY, death + RESTOR
machinery)" — that machinery landed in cp2-5 (`2edd328`, done). cp2-14 (global orientation
flip, 3pt) remains `backlog`, but it is a shell render/input-sign follow-up filed out of
cp2-12's review, not a dependency of the spider sim. Proceeding on cp3-1 is sound; TEA should
keep spider trajectory assertions in **core cell/slot coordinates**, not screen-space, so
cp2-14's `cellScreenX` flip cannot invalidate them.

**Routing → O'Brien (TEA), RED phase.** Scope notes carried into the handoff:

- **Ground truth is the dossier, not folklore.** `centipede/docs/rom-study/` + claims; the
  citation gate is live (`npm test -- citations`). Anchors: BUGOFF `CENTI4.MAC:250`,
  BUGMV `:285`, PLAY `:1769`, EXPLOD `:961`, slot 13 `BUGP =MOBJP+13.` (`CENDEF.MAC:139`).
- **RADIX trap.** CENTI4.MAC inherits `.RADIX 16` via CENDE4 — bare literals are HEX unless
  they carry a trailing period. Every transcribed constant needs a radix-cited comment and a
  claims entry.
- **AC-4 is a diff, not a transcription.** CENTIP.DOC:117's 300/600/900 proximity prose is
  **rev-1**. Transcribe the real rev-4 bands from code, diff against the prose, and record
  divergences in `open-questions.md` (epic open question 4). Code wins.
- **AC-3 says reuse, not duplicate.** Gun-vs-spider contact must run the same
  PLAY/EXPLOD/RESTOR chain cp2-5 built. Read `sprint/archive/cp2-5-session.md` first — prior
  TEA phases in this project pre-extract the next story's quarry into Delivery Findings.
- **Bottom-hugging from 60,000 points** reads SCORE state, which the sim already models — so
  it may go fully live rather than parameterized. Transcribe what the code allows and
  **record which choice was made** (epic wave-gating ruling).
- Determinism: any spider randomness draws from the seeded rng only; purity guard stays green.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `centipede/tests/spider.test.ts` — 63 tests across AC-1..AC-4 (commits `1dbaa0a`, `5b48e91`)

**Tests Written:** 63 tests covering 4 ACs · **Status: RED**
**Full-suite total:** 540 tests — **62 failed | 478 passed**, all failures in
`tests/spider.test.ts`. Zero sibling regressions. `npx tsc --noEmit` exits 0.

> The `testing-runner` subagent reported "1 file, 60 tests" — it had silently
> narrowed the run to the file named in the prompt. The numbers above are from
> `npx vitest run` executed directly. Trust the grand total, not the helper.

The one spider test that PASSES is deliberate: the PLAYEX non-duplication source
scan is a regression guard that must be green now and go red only if the death
path is copied. It fixture-pins its own scanner so it cannot rot into a
guard that never fails.

### What the ROM actually says (the transcription that drove the tests)

Read from `reference/atari-source/centipede/revision.v4/`, upright cabinet
(`CLEAR` :737-751 zeroes CKF8/CKC0/CK40, so every `EOR CKxx` is identity).

| Mechanism | ROM | Fact |
|---|---|---|
| Entry | `:272-280` | BUGV 0x60, BUGH 0xFF, BUGP 0xF8, COUNT2 0x60 |
| Speed | `:255-263` | dv=2 fast / dv=1 slow; gate is SCORE1 vs `(OPTNS&40)\|10` — 1000 (hard) / 5000 (easy); SCORE2≠0 forces fast |
| Entry side | `:265-271` | `RNGEN & 04` negates dh; **\|dh\| == \|dv\| always** |
| Faces | `:303-313` | BUG0..BUG7 = pictures 0x14..0x1B, one step per 4 frames |
| Step | `:343-355` | `h -= dh`, `v -= dv` — **SUBTRACT**, inverted vs MOTION's `ADC` |
| Turns | `:314-341` | COUNT2 expiry only; reload 0x30; dh parks to 0 (OLDDH) unless at an edge (`h>=0xFB` or `h<5`) |
| Eating | `:362-367` | `(cell & 0x3F) >= 0x38` → cell = 0 + MUSHDC. **No score.** |
| Bottom | `:372-378` | v < 9 while descending reverses dv |
| Top | `:380-399` | limit = 0x60 − 8·min(5, (BCD(SCORE2)−6) >> 1) |
| PLAY | `:1781`, `:1822` | spider \|dH\| < **10.** and sum < **14.** — DECIMAL, vs the segment's hex 07/0C |
| SHOOT | `:2202`, `:2232` | \|dV\| < 5 (hex), \|dH\| < **10.** (decimal) |
| Bands | `:2243-2250` | d ≥ 0x40 → 300 · 0x16 ≤ d < 0x40 → 600 · d < 0x16 → 900 |
| PTS pics | `:2236-2249` | 0xB6/0xB7/0xB8 = **300/900/600** — CENPIC order, NOT sorted |

**Open question 4 (CENTIP.DOC rev-1 vs rev-4 code) — the diff:**
- **300/600/900 (CENTIP.DOC:117) — AGREES with rev-4.** The prose is confirmed;
  what it never gave is the *distance bands*, now recovered: **0x16** and **0x40**.
- **"Bottom-hugging from 60,000" (CENTIP.DOC:201-202) — MISLEADING.** The BCD
  datum is 60,000 (`:384 SBC I,6`), but the halving at `:388` means the ceiling
  does not actually move until **80,000**; it then steps 8 per 20,000 and clamps
  5 steps down from 160,000. Code wins; Julia must record this in
  `open-questions.md` (a test enforces the entry exists).

**Two findings the tests pin that a plausible implementation would get wrong:**
1. The PTS picture order is **300 → 900 → 600** (`INC PTS` walks the CENPIC
   sprite table THREE/NINE/SIX). "Tidying" it to 300/600/900 draws the wrong
   number on screen. Independently corroborated: `0xB6 & 0x3F = 0x36` = THREE's
   computed offset 0x1B0, `0xB7` → NINE 0x5B0, `0xB8` → SIX 0x1C0.
2. The ROM's own comment at `:262` (`;IF SCORE < 1000, USE SLOW SPIDER`) sits on
   the `BCC` but describes the fall-through. Derived from the branch instead.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test | Status |
|---|---|---|
| #1 type-safety escapes (`as any`, `as unknown as`, `@ts-ignore`) | `rule 1 — the new module defeats the type system nowhere` | failing |
| #2 named interface over inline/broad object type | `rule 2 — the exported Spider shape is a named interface` | failing |
| #4 `??` vs `||` where 0 is valid | `rule 4 — the score/limit arithmetic uses ?? not \|\|` | failing |
| project: core/ purity (no ambient entropy) | `never draws from Math.random` + repo `purity.test.ts` sweep | failing |
| project: seeded determinism | `replays an identical trajectory from an identical seed` | failing |
| project: citation gate | `files SP-* claims …` + `records the CENTIP.DOC rev-1 diff …` | failing |

**Rules checked:** 4 of 4 applicable TypeScript rules (§3 enums, §6 React/JSX,
§7 async do not apply — this story adds no enum, no component, no promise).
**Self-check:** 144 assertions; every `it` asserts; 0 vacuous tests found. The
one `toBeDefined()` is a guard immediately followed by a value assertion.

### Traps deliberately built into the suite

- **Radix.** Three tests fail specifically if `10.`/`14.` are read as hex —
  including an explicit "a hex reading would still collide at 16" assertion.
- **Seeded-RNG vacuity.** No test asserts determinism alone. Every rng-driven
  behaviour is swept across 32–64 seeds and required to produce *both* outcomes;
  the determinism test also requires a *different* seed to differ.
- **Table end.** `spiderTopLimit` is asserted past its clamp (200k, 400k, 799k)
  and against an independent recomputation over the whole 0..999,000 range —
  plus the ROM's own BCD wrap at 860,000, which resets the limit to the base.
- **Edge boundary.** The dh-park guard is tested at the edge *and* one step
  inside it, so a blanket "never park" implementation fails.

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Status: GREEN.** Independently verified by `testing-runner` on the FULL suite:

| Check | Result |
|---|---|
| `npx vitest run` | **35 files, 541/541 tests passing** |
| `npx tsc --noEmit` | exit 0, no output |
| `npm run build` | ✓ built |
| `node tools/audit/check-citations.mjs` | **257 claims, all verified** |

Branch `feat/cp3-1-spider-bugoff-bugmv` pushed (`7d579cb`). No PR — SM opens it.

### What shipped

- **`src/core/spider.ts`** (new) — BUGOFF, BUGMV, `spiderTopLimit`, OVRLAP,
  SHOOT's spider branch and EXPLOD's spider branch, all with radix-cited
  comments keyed to SP-1..SP-22.
- **`src/core/centipede.ts`** — `checkPlayerContact` now takes the spider as an
  **optional 3rd parameter** and routes it through the same `playHit` with slot
  13's wider box. cp2-5's two-argument callers and its whole suite are untouched.
- **`src/core/sim.ts`** — `SimState.spider`; the spider takes the ROM's mainloop
  position (BUGMV `:33` runs **after** MOTION `:30` and **before** SHOOT `:34`),
  is deep-copied in `cloneState`, and is re-parked through BUGOFF on respawn.
- **`src/core/pictures.ts` / `src/shell/render.ts`** — THREE/SIX/NINE stamps,
  `spiderStamp`, and the spider actually drawn.
- **Docs** — `claims/10-spider.json` (22 claims), open question 8, a
  "Points display" section in `pictures.md`, contact sheet re-baked to 81 stamps.

### Two RED-phase test corrections (disclosed, not quiet)

Both were errors in TEA's own staging, not weakened assertions. Neither changes
what is being asserted.

1. **The OVRLAP tests staged the segment on the spider's PRE-move row.** The ROM
   moves at `:342-356` and only reaches OVRLAP at `:411`, so the overlap test
   reads the POST-move position. As written the tests could not pass against a
   faithful implementation — they were comparing rows 0x40 and 0x3E. Restaged on
   the post-move row; the h-side asymmetry and the exact-row and dead-segment
   assertions are unchanged and still discriminating.
2. **The sim tests built `InputCounts` as `{left, right, fire}`.** The real shape
   is `{dh, dv, fire}` (`player.ts:59-63`), so `movePlayer` produced `NaN` and
   the gun's position became `NaN` — which made **every** distance comparison
   false. That is why the *segment* control case was also failing, and it is what
   made the bug findable: a spider-only fault could not explain it.

Also removed the loader's `Function.length < 3` arity probe in favour of a
behavioural one — an optional parameter written with a default (`spider = null`)
reports length 2, so the arity check would have rejected a correct implementation.

### Sibling regression found and fixed

`tools/pictures-bake/bake-contact-sheet.test.mjs` went red the moment
THREE/SIX/NINE joined `STAMPS`: the committed SVG is byte-compared against a
fresh bake. Re-baked with `node tools/pictures-bake/bake-contact-sheet.mjs`
(78 → 81 stamps). This is the test doing its job, not a flake.

### Design decisions a reviewer should check

- **No circular import.** `spider.ts` imports `DEAD_BIT`/`Segment` from
  `centipede.ts`. Rather than import the spider's picture constants back,
  `checkPlayerContact` decides "is this spider a hazard" with the bit test the
  ROM itself uses (`:297 AND I,20`) plus the vacant bit — both constants
  `centipede.ts` already owns. No duplicated literal, no cycle.
- **PLAY is not duplicated.** `PLAYER_EXPLODE_START` is still assigned exactly
  once in `sim.ts`; the source-scan guard enforces it and now fixture-pins its
  own scanner.
- **The OVRLAP vacancy divergence** (TEA's Conflict finding) is implemented as
  TEA specified — vacant slots skipped in addition to the ROM's `>= 0xF4` — and
  the reason is commented at `OVRLAP_DEAD_PIC`.

### Not done here (correctly out of scope)

- The flea slot in OVRLAP's scan (`:1749 LDY I,12.`) — cp3-2 widens it.
- The spider's sound channel (CHAN3) — no audio subsystem exists yet.
- A demo capture — cp3-3 owns the ecosystem demo.

**Handoff:** To the Thought Police (Reviewer).

## Reviewer Assessment

**Verdict: APPROVED** — but only after review found and fixed **two CRITICAL
defects** that the 63-test cp3-1 suite passed straight over. Both are fixed,
both are pinned by regression tests that were verified to FAIL without their fix.

Final state: **544/544 tests**, `tsc --noEmit` clean, `npm run build` clean,
**258 claims byte-verified**, plus a 60,000-frame soak (3 seeds × 20k frames)
with zero invalid spider states and zero render throws.

### Blocking findings — both FIXED in `5ff5a29`

**1. CRITICAL — a shot spider never came back.** `SHOOT`'s tail
(`CENTI4.MAC:2304-2314`) was not transcribed. It decrements `COUNT` every frame
while the spider's picture is a dead state (`>= 0x9C`, `:2310`) and calls
`BUGOFF` at zero. Without it the spider froze on its points sprite **forever**:
`BUGMV` deliberately stops on a PTS picture (`:299-300 CPY I,0F8 / BCC 3$
;PTS.STILL ON`), so `COUNT2` stops ticking too and nothing else in the frame
could ever clear it.

> Reproduction: stage the exact state `resolveSpiderShotHit` returns and step
> 600 frames — `pic` stuck at `0xB6`, `count` stuck at `128`, `walkedAgain=false`.
> A "300" welded to the screen and no spider for the rest of the game.

Fixed by `stepSpiderKillTimer` (claim **SP-23**), wired into the playing frame.

**2. CRITICAL — rendering threw ~6 frames after any spider kill.** The spider
sits on the explosion's rest picture `0xF9` for exactly one frame — `EXPLOD`
converts it to the points sprite on the *following* frame's entry (`:977-979`) —
and `spiderStamp` had no case for `0xF9`, so `render()` threw
`"0xf9 is not a drawable spider picture"`. `0xF9` now draws nothing, the same
rule segments already use. The regression test reproduces at **exactly frame 5**.

Both defects share one root cause worth naming: **nothing exercised the full
post-kill lifecycle through the sim.** Every AC-4 test called
`resolveSpiderShotHit` directly and stopped. The unit tests were individually
sound and collectively blind.

### Also corrected

**3. Minor — EXPLOD/SHOOT ordering.** The spider's frame now runs the ROM's own
`EXPLOD(:31) → BUGMV(:33) → SHOOT(:34)`, so a spider killed this frame keeps its
first explosion picture for a full frame instead of losing one.

### Non-blocking — recorded, not fixed here

- **PLAY-vs-SHOOT ordering.** In the ROM, `BUGMV` calls `PLAY` at `:417`, i.e.
  during mainloop line `:33`, *before* `SHOOT` at `:34`. So a frame where the
  spider is BOTH on the gun and in the shot's window kills the **player**. Our
  sim resolves the shot first and spares the player. This is inherited from
  cp2-5's frame skeleton (which also defers `checkPlayerContact` to the end of
  the frame), not introduced here — but it is a real divergence and should be a
  follow-up story rather than a silent difference.
- **The `easy` DIP option is never threaded from `sim.ts`**, so the spider always
  runs the hard gate. That is exactly the parameterization TEA logged as a
  deviation and the tests pin both settings directly; a future DIP/options story
  supplies the real default.
- **The spider is frozen during the death pause.** `stepDeathFrame` does not step
  it, while the ROM's `EXPLOD` keeps running (only `BUGMV` early-returns on a
  dead player). Immaterial today because the respawn re-parks the spider anyway.
- **OVRLAP excludes the flea slot** (`:1749 LDY I,12.`) — already filed as a
  cp3-2 carry-forward in Delivery Findings.

### Verified, not taken on trust

- **The OVRLAP EOR window.** Re-derived independently: `[0xF4,0xFF]` is closed
  under `EOR 2`, so `dh>0` triggers on a segment at HIGHER h (by 1..12) and
  `dh<0` on LOWER-or-equal h (by 0..11). The implementation and its tests match.
  The counterintuitive "behind, not in front" reading is correct.
- **The radix-sensitive windows.** `10.`/`14.` decimal vs `07`/`0C` hex confirmed
  against `:1781`/`:1822`/`:1786`/`:1798`; the tests carry explicit
  "a hex reading would still collide" assertions.
- **The non-monotonic PTS order** (300→900→600) is corroborated twice over: the
  two `INC PTS` at `:2245`/`:2249`, and independently by walking CENPIC's byte
  stream — `0xB6→0x1B0` THREE, `0xB7→0x5B0` NINE, `0xB8→0x1C0` SIX.
- **The segment PLAY windows are untouched** — cp2-5's suite still green, and the
  `PLAYER_EXPLODE_START` single-assignment scan confirms the death path is routed
  rather than copied.

### Round 2 — findings from the fan-out reviewers (`ccc5879`)

The ROM-fidelity agent independently **confirmed all eight** of the transcription
claims (subtract-both-axes, `threshold < SCORE1`, 300→900→600, the decimal
10./14. windows, the 5-step clamp + 860,000 reset, the `>= 0x38` eat gate, the
bounce-skips-OVRLAP nuance, the 0x30 reload) and re-derived the OVRLAP EOR window
across all five `dh` values. It also caught two real defects in cp3-1's own code:

- **8-bit distance.** The ROM's `SBC` + `ABS` measures distance *around the byte*.
  `resolveSpiderShotHit` used `Math.abs`. Because BUGH legitimately occupies
  0xF8-0xFF, a shot at h=0x02 against a spider at h=0xFE is **4 apart to the ROM
  and 252 to us** — a missed hit. Fixed with `byteDistance`; pinned by tests
  verified to fail without it.
- **`bcdSub` was not BCD on borrow-out** (0x00-6 → 0xF4; silicon gives 0x94).
  Behaviourally inert here since only bit 7 is read, but fixed rather than
  documented around.

The test-quality agent found that several tests asserted the *flag* rather than
the *behaviour*. The load-bearing ones are fixed: the AC-2 eating test now checks
the field for all eight damage codes (it only checked 0x3F); `cloneState`'s
spider had **zero** coverage, including a null-guard whose failure mode
(`{...null}` → `{}`, truthy) would flip every downstream branch; the `!bounced`
guard that makes a floor bounce skip OVRLAP was untested; and the entry-side test
now recomputes the ROM's decision from the same rng primitive instead of settling
for "both signs occur across 64 seeds", which any other bit would satisfy.

I **declined** one of its suggestions: adding a "reference trajectory" fixture to
the determinism test. Any such fixture would be derived from this same
implementation and would therefore be circular. I renamed the test to say what it
actually proves — replay safety, not fidelity — which is the honest fix.

### Round 3 — the parallel fan-out (`395ae2a`, `b9a6124`, `1ebf2d5`)

**One more real defect, found independently by two agents.** The edge-hunter and
the security pass both landed on `playHit` still using `Math.abs` after round 2
had fixed the identical thing in `resolveSpiderShotHit`. The ROM's PLAY is an
8-bit `SBC` + `ABS` (`:1775-1778`, `:1788-1791`), and this story is what newly
routes the spider through it. The reachable case is precise: BUGMV's respawn
(`:430-433`) stamps a **walking** picture while `h` is still the parked `0xFF`,
so for one frame a live spider sits at `0xFF`. Against a gun near `h=0x02` the
ROM reads 3 pixels and kills the player; `Math.abs` read 253 and skipped it.
`byteDistance` now lives in `centipede.ts` and both axes use it — which is also
more faithful for segments, whose `h` is already wrapped by `wrapH`.

**Four edge-hunter findings were investigated and DISMISSED**, because in each
case the ROM does the same thing and "fixing" it would be the divergence. This is
the trap the sidecar warns about — a plausible-looking defect that is actually
faithful transcription:

- *"The off-screen reset only catches `h == 0xFF` exactly."* True, and so does
  `CMP I,0FF / BCS`. The agent reached it by staging `h=0x00, dh=2` directly;
  the sim cannot produce that, because BUGOFF always enters at `0xFF` and `|dh|`
  never changes during a walk, so the parity invariant lands every walk-off
  exactly on `0xFF`.
- *"The v-axis has the same wrap hole."* Same answer, plus `v` provably never
  drops below 6: the bounce fires at `v < 9` and `|dv| ≤ 2`.
- *"The kill timer ticks COUNT during an ordinary park."* That is `:2308-2310`
  verbatim — the parked picture `0xF8` **is** `>= 0x9C`. The occasional extra
  BUGOFF this causes (and the longer park the agent measured) is emergent ROM
  behaviour. The suggested "gate on a kill flag" would have diverged.
- *"The wave-clear path never re-parks the spider."* Correct, and deliberate:
  CHKEND tests the gun when DELAY expires (`:610-612`); a **live** gun falls
  through to `45$: JMP 90$`, and `90$` is CENTPC alone. Only the death path
  reaches `85$: JSR BUGOFF`. `sim.ts` was already wired exactly this way; the
  agent was right that it deserved a citation, which it now has.

The **simplifier** found the core files clean and caught the scratch file. The
**silent-failure hunt** found no live defects; its one note — `sim.ts` discarding
`stepSpider`'s `ate`/`scored` — is now documented at the call site rather than
left implicit. The **security** pass confirmed core purity (18/18), no
out-of-bounds playfield write (the unguarded write recomputes the same cell
`obstacleCode` already proved in range), and no unbounded loops.

### Follow-up filed, not fixed here

**OBSTAC's left-margin clamp is unmodelled** (`:1715-1719 LDA I,0F7 / SEC / SBC
TEMP1 / BCS 5$ / LDA I,0 ;USE LEFT MARGIN`). When H' > 0xF7 the ROM forces the
column to 0; `obstacleCellFor` (`playfield.ts:127-133`) instead computes a
negative column that `obstacleCode` rejects as out of range and returns 0. So an
object at h ≥ 0xF8 sees "no obstacle" where the ROM sees column 0.

This is **pre-existing shared code** (cp1-5/cp2-3) consumed by the gun, the shot
and every segment — but cp3-1 is the first story to drive an object into that
range, since the spider parks at 0xFF and enters through the 0xF8-0xFE strip.
Strictly it is a narrow AC-2 gap: the spider crosses a few column-0 cells without
eating them.

Judged **non-blocking for cp3-1** and filed instead, because the fix changes
collision geometry shared with three other consumers and needs its own regression
tests for each — absorbing it here would be a silent contract change inside a
spider story. Recorded in Delivery Findings for the epic to schedule.

### Round 4 — the last three specialists (`d12d98e`)

**The rule-checker found the one defect the citation gate structurally cannot
catch.** `SPIDER_PTS_BIT` carried `// SP-19`, but SP-19 is SHOOT's PTS
*selection* at `:2236` — a different mechanism. The freeze gate the constant
actually implements (`:297-301`) had no claim at all. `check-citations.mjs`
byte-verifies each claim's own source line; it never checks that an in-code
comment names the *right* claim. Filed **SP-24** and re-pointed the comment.
This is the exact failure mode the sidecar warns about — attaching a real claim
ID to an uncited mechanism produces a green gate over an unsourced constant.

**The comment-analyzer caught three wrong ROM line numbers, two of them mine
from this same review.** The wave-clear citation I added in `b9a6124` was wrong
twice over (CHKEND's gun test is `:608-610`, not `:610-612`; `45$ JMP 90$` is
`:611`, not `:613`; `90$` is `:734`, not `:731` — that line is `JSR DLIVES`).
Also `"CMP I,07"` is `:1785`, not `:1786`, and rev-4's equates file is
`CENDE4.MAC`, not rev-2's `CENDEF.MAC`. All verified against the vendored source
before changing, then fixed. A citation written from memory in the middle of a
long review is exactly as unreliable as one written by a subagent.

**The type-design pass argued `SimState.spider: Spider | null` was optional
abuse, and it was right.** The ROM's INIT calls BUGOFF (`:1199`), so slot 13
always holds an object; "no spider on screen" is the parked PICTURE. Nullability
invented a state the hardware does not have and pushed a dead guard into three
consumers. The decisive argument for fixing it *now* rather than filing it:
cp3-2 and cp3-3 will copy this pattern for the flea and the scorpion, so the
cost triples if it ships.

**And the fix that proved the point:** replacing two `as unknown as` double-casts
with a static import instantly surfaced a drift the casts had been suppressing —
the test's shadow `Spider` was missing `pts`, which the real interface requires.
The declared contract had also carried a `killedPlayer` field that exists nowhere
in the implementation and was never read.

### Round 5 — triaging the edge-hunter retry (`84a1b9e`)

Five findings came back on the edge-hunter's second pass. **Four were
investigated and dismissed with ROM evidence** as faithful behaviour. The fifth
is real and is **filed, not fixed**: SHOOT's slot scan runs spider-first
(`:2171 11$: LDX I,13.`, descending via `:2292-2294`, first match exits the
loop through `19$`/`20$`/`30$`), while `sim.ts` resolves segments at `:176`
before the spider at `:205`. On a frame where both windows match we score
10/100 where the ROM scores 300/900. It is the same class as the PLAY-vs-SHOOT
ordering finding and needs the same cp2-scoped frame reordering, so hacking a
swap into a spider story would be a silent contract change — Delivery Finding
instead.

**The one invariant worth pinning before handoff.** `:369-371` is `h >= 0xFF`
on a byte — an *equality* in practice. It is not a wrap bug only because `|dh|`
is fixed for a spider's life, so a fast spider entering on the odd `0xFF` stays
odd and can never land on `0xFE` and step over the gate into `0x00`. That was
load-bearing and entirely unasserted; now pinned across 24 seeds × 1200 frames,
with a `parks > 0` guard so the sweep cannot pass vacuously. The parity
assertion was mutation-checked (flipped to `toBe(0)` → fails at seed 1 frame 96)
rather than trusted for going green on the first run. Two adjacent invariants
the review surfaced are now documented in place: `overlapsSegment`'s `dh === 0`
case (EOR is the identity, degenerating to the `dh > 0` side, matching the ROM)
and `oldDh`'s "never 0 while `dh` is 0" guarantee.

### Final state

**558/558 tests**, `tsc --noEmit` clean, `npm run build` clean, **259 claims
byte-verified**, working tree clean, branch pushed
(`1dbaa0a` → `5b48e91` → `7d579cb` → `5ff5a29` → `ccc5879` → `395ae2a` →
`b9a6124` → `1ebf2d5` → `d12d98e` → `84a1b9e`).

Six defects were found and fixed during review — two of them CRITICAL and
neither catchable by the suite as delivered. The common thread is worth carrying
forward: **every AC-4 test called `resolveSpiderShotHit` directly and stopped**,
so nothing ever ran a spider through its own lifecycle. The unit tests were
individually rigorous and collectively blind. The two regression suites added
here (the 600-frame post-kill lifecycle and the render sweep) are the guard.

**Handoff:** To Winston Smith (SM) for the finish ceremony. **The PR needs human
merge authorization** — this branch is AI-authored and AI-reviewed, so the
self-approval guardrail applies and I will not merge it.