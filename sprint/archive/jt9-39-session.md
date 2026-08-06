---
story_id: "jt9-39"
jira_key: "jt9-39"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-39: ROW_DISPOSITION can lie in the direction that matters — a row wired in code but left 'no-consumer-yet' ships GREEN

## Story Details
- **ID:** jt9-39
- **Jira Key:** jt9-39
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** main
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-06T18:19:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T17:47:50Z | 2026-08-06T17:50:40Z | 2m 50s |
| red | 2026-08-06T17:50:40Z | 2026-08-06T18:09:39Z | 18m 59s |
| green | 2026-08-06T18:09:39Z | 2026-08-06T18:12:34Z | 2m 55s |
| review | 2026-08-06T18:12:34Z | 2026-08-06T18:19:14Z | 6m 40s |
| finish | 2026-08-06T18:19:14Z | - | - |

## Sm Assessment

**Story:** jt9-39 (3pt, tdd, joust). Add a guard proving `ROW_DISPOSITION` in
`plugins/joust/src/core/difficulty.ts` cannot LIE — a row wired in code but left
`no-consumer-yet` must redden, and every `owner` must name a real sprint story.

**Board:** clean on arrival — no `jt9-39` remote branch, no `jt9-39` session in any
`a-*` checkout (siblings are on sw8-20 and mc2-3). Claim commit `b7ca06c` pushed to
`main`; empty branch `feat/jt9-39-row-disposition-consumer-guard` pushed for sibling
visibility. Status stamped `in_progress`.

**Premise re-measured 2026-08-06 (the reason this matters for RED):** the epic
description (filed 2026-08-03) frames a live 3-category inventory with drifting owner
strings. That is now partly stale. On the current tree **all 28 disposition rows are
`kind: 'wired'`** — zero `no-consumer-yet`, zero `dead-in-rom`; the `owner` field and
`no-consumer-yet` variant exist only in the union TYPE (difficulty.ts:290-293). Every
owner id referenced today (jt9-1, jt9-11, jt9-9, uf1-2, uf1-8, uf1-9) is present in the
sprint. The two guards the story cites are real and self-consistency-only
(difficulty-wiring.test.ts:781 wired-set equality, :847 pending count).

**Consequence TEA must not miss:** of the four derived ACs, only "every WIRED row has a
consumer call" iterates live rows. The pending-row direction and the dangling-owner
check iterate EMPTY sets today, so they pass vacuously on arrival and are non-vacuous
ONLY via the mutation the AC already mandates (flip a wired row to no-consumer-yet;
synthesise a pending row with a bad owner). That is correct for a regression guard —
but a RED test that merely runs the loops will look green-for-the-wrong-reason. Build
the mutations and watch them redden.

**Mutation trap (surfaced in context):** `waveValue('LAVLAV')` appears in BOTH lava
lookers, so a perl -0 slurp-replace hits the FIRST copy and leaves the target intact —
a false survivor. Confirm every mutation with `git diff` that the INTENDED site changed.

**Routing:** phased tdd → RED. Handing to TEA (Tyr One-Handed).

## Tea Assessment

**RED landed on `main` (0ad41c3).** Suite: `plugins/joust/tests/difficulty-wiring.test.ts`
now **2 failing / 43 passing** (was 43 passing). `npm run lint` clean. All new work is
in that ONE file — no new test file, so the README "143 files" census
(`audio-seam-scope`) is untouched.

**The gap, restated:** AC-6 (`:781`, `:847`) pins the 28-row inventory against ITSELF —
the wired SET, and that each wired entry's `consumer` field is non-empty PROSE
(`:819` is `toBeTruthy()` on the string). Nothing re-derived that prose against the
code, so a `wired` row read nowhere, or a `no-consumer-yet` row a call already reads,
shipped green. jt9-39 adds a lie detector re-derived from the core source + the live
sprint.

**Mechanism (grep-based, per the AC):** `consumed(row)` = the row's DYWORD NAME appears
as a QUOTED literal `'NAME'` in some `src/core/*.ts` other than `difficulty.ts`. Quoted,
not bare, so the many comments that merely NAME a row are not mistaken for calls
(unit-proven). `auditDispositions()` flags wired-but-unread, no-consumer-yet-but-read,
and owner-not-a-live-sprint-story.

**RED shape — the jt9-32 idiom, not a defect.** The live table is CORRECT today (all 28
wired rows have a real consumer; no pending/dead rows; no owners) so the derived
audit is GREEN on arrival. The RED is the empty golden `CONSUMER_FILE` — GREEN(dev)
fills each wired row → the core file its consumer literal lives in, DERIVED by grep
(exactly jt9-32's "record the 18 bake hashes; no src/ change"). The two AC-1 tests fail
28-vs-0 until filled. The golden also PINS the site, so a consumer relocated to another
module reddens even though a literal still exists somewhere.

### Rule Coverage
Story is guard-only (adds no production type/enum/constructor); the applicable
`gates/lang-review/typescript.md` rules govern the guard's OWN code and are enforced by
`npm run lint` (green) plus these tests:
1. **Type-safety escapes — no `as any` / `as unknown as T` (checklist §type-safety).**
   `d.ROW_DISPOSITION` flows into `auditDispositions` typed as `RowDisposition` (imported
   via `type RowDisposition` with the `.js` extension, checklist §imports); zero casts.
   Exercised by the *live inventory audits clean* test.
2. **No `Record<string, any>` (checklist §types).** The golden is `Record<string,string>`,
   the audit input `Readonly<Record<string, RowDisposition>>`, the result a named
   `DispositionLie` interface with `readonly` fields (checklist §readonly). Never `any`.
3. **Index/`Map.get()` result used without an undefined check (checklist §null-safety).**
   The `CONSUMER_FILE[n]` lookup is guarded by `!(n in CONSUMER_FILE)` and
   `if (file === undefined) continue` — proven by the *each recorded file contains the
   literal* test, which must stay well-defined once the golden is filled.

### Mutation log (both directions verified)
- **File-level (real, reverted), the story's exact clause.** Flipped LAVLAV
  `wired`→`no-consumer-yet` in `difficulty.ts` leaving `enemy.ts`'s `waveValue('LAVLAV')`
  calls intact; `git diff` confirmed the intended site (slurp-trap guard — LAVLAV
  appears twice, verified the disposition entry changed, not a looker). The *live audit*
  test reddened naming `LAVLAV`: "no-consumer-yet, but a 'LAVLAV' literal already reads
  it". Restored byte-identical (`diff -q` vs backup).
- **Synthetic (committed, green), non-vacuity for the empty-set directions.** The live
  pending/dead sets are empty (jt9-11 wired the last rows), so AC-2/3/4 are proven on
  fabricated dispositions through the pure detector: downgrade (pending + live consumer →
  lie), upgrade (`NOSUCHROW` wired + nothing reads it → lie), dangling owner
  (`uf1-10-renumbered-away` → lie) vs real owner (`jt9-39` → clean), and detector-quoting
  sanity. This is why the AC-2/4 tests are non-vacuous despite iterating no live rows.

### Handoff to Dev (Loki Silvertongue) — GREEN
Fill `CONSUMER_FILE` in `difficulty-wiring.test.ts` (currently `{}`): one entry per wired
row → the `src/core` file basename its quoted literal lives in, DERIVED (do not
hand-type). The 26 seek/cadence/brake/troll rows live in `enemy.ts`; EGGWT/EGGWT2 and
LAVTIM/LAVGRA in `demo.ts`. A ready derivation: for each wired row, the single
`src/core/*.ts` (≠ difficulty.ts) whose text contains `'ROW'`. **No `src/` change.**
Then `npx vitest run --project joust plugins/joust/tests/difficulty-wiring.test.ts` → 45
passing, and `npm run lint` clean.

## Dev Assessment

**GREEN landed on `main` (9e3d30d).** Filled the empty `CONSUMER_FILE` golden with 28
DERIVED entries (row → the one `src/core` file its quoted literal lives in): 24 rows in
`enemy.ts` (the brains' seek/cadence/brake/troll-looker reads), 4 in `demo.ts`
(EGGWT/EGGWT2 via `demo.eggWaitFrames`, LAVTIM/LAVGRA the troll grip/timer). Derivation
verified each literal resolves to EXACTLY one core file — 0 ambiguous — so no judgement
call was needed. **No `src/` change** (the inventory was already true; this records the
baseline the AC-1 tests assert against — jt9-32's GREEN shape).

**One RED-gate collateral fixed:** the RED comment named `demo.eggWaitFrames` with a
`demo.ts:<line>` suffix, which jt9-30's `comment-line-refs` guard forbids (our-file line
numbers rot). Converted to the bare symbol name ("the demo.eggWaitFrames wrapper"). This
surfaced only under the FULL `--project joust` run, not the single-file run — worth
running the whole project at GREEN, not just the story's file.

**Verification:** `difficulty-wiring.test.ts` 45/45; full `--project joust` 143 files /
2949 tests green; `npm run lint` clean; `git status` shows only the test file.

## Reviewer Assessment

**Verdict:** APPROVED

Guard-only story (zero production `src/` change — verified `git diff a16ef91 -- plugins/joust/src src`
is empty). It closes a real gap: the AC-6 block pinned the disposition against ITSELF and
checked only that `consumer` was non-empty PROSE; jt9-39 re-derives every claim from the
core source text and the live sprint YAML, so a `wired` row nothing reads — or a
`no-consumer-yet` row a call already reads — reddens.

**Adversarial mutation battery (my review; subagents are disabled on this project except
preflight, so mutation IS the review):**

| # | Mutation | Expected | Result |
|---|----------|----------|--------|
| M1 | LAVLAV `wired`→`no-consumer-yet` in difficulty.ts (real, reverted) | live audit reds naming LAVLAV | RED ✓ |
| M2 | Golden entry pointed at the wrong file (LAVLAV→demo.ts) | literal-in-file test reds | RED ✓ |
| M3 | Extra non-wired golden key (NOTAROW) | set-equality reds | RED ✓ |
| M4 | Dropped golden entry (EGGWT) | set-equality + missing reds | RED ✓ (2 fail) |
| M5 | Any wired row whose literal is COMMENT-only (false-negative) | — | NONE present; all 28 anchored to a real code line ✓ |
| M6 | Real consumer call deleted (`waveValue('BODNVY')`→renamed in enemy.ts, reverted) | live audit reds naming BODNVY | RED ✓ |

M6 is the money shot: the guard catches the exact regression it exists to prevent (a
consumer deleted/renamed while the inventory still says `wired`). All restores byte-identical.

**Preflight finding (Low, dispositioned NON-BLOCKING, no rework):** it called line 1004
(`missing` check) redundant with the sibling set-equality `it`. Cross-test it is redundant,
but WITHIN its own `it` it is load-bearing: the loop at 1005-1012 does
`if (file === undefined) continue`, so removing line 1004 would let a missing golden entry
be silently skipped and the block pass anyway. Keeping it is correct defensive design.
Confirmed by reading, not dismissed.

**Non-blocking observation (for the record, not this story):** `hasConsumerLiteral` is a
quoted-substring grep, so a FUTURE row consumed only via a quoted mention inside a comment,
or present only in a type annotation, could read as "consumed" without a runtime call. This
is inherent to the AC's grep mandate and is not present today (M5: every wired row has a
real code-line literal; the earlier direct-call probe found 26 direct `waveValue`/`dyRow`
calls + EGGWT/EGGWT2 through `demo.eggWaitFrames`). No action.

**Design Deviation reviewed:** generalizing AC-1 from "a `waveValue`/`dyRow` call" to
"quoted literal in core (wrappers included)" is faithful and necessary — a direct-call-only
reading would falsely redden EGGWT/EGGWT2, which no guard-only story could fix. Approved.

## Subagent Results

| Subagent | Status | Result |
|----------|--------|--------|
| reviewer-preflight | received | GREEN — `npm run lint` clean, `--project joust` 2949/2949, orchestrator green; 0 console.log/TODO/skip; one Low redundancy finding (dispositioned above) |

All received: Yes

## Impact Summary

**Story:** jt9-39 (guard-only, 3pt). Adds `auditDispositions()` + a `CONSUMER_FILE`
site-pin to `difficulty-wiring.test.ts` that re-derives `ROW_DISPOSITION` against the
live core source and the sprint YAML, so a wired-but-unread row (or a
no-consumer-yet-but-read row, or a dangling owner) reddens. Zero production `src/`
change. Single review round, APPROVED with a full M1–M6 mutation battery.

**Findings:** 1 processed — **0 blocking**, 1 non-blocking.
- **Improvement (non-blocking), filed as jt9-57:** the pre-existing `:819` consumer
  check is `toBeTruthy()` on prose; jt9-39's audit supersedes it for existence, but the
  prose `consumer` string is still unverified against its `JOUSTRV4.SRC:NNNN` cite. A
  follow-up could pin it against `docs/rom-study/claims/`.

**Ready to finish:** yes.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Improvement (non-blocking):** the pre-existing `:819` consumer check is
  `toBeTruthy()` on a prose string — jt9-39's audit now supersedes it for correctness,
  but the prose is still unverified against its ROM-line cites. Out of jt9-39's scope —
  **filed as jt9-57**: pin the `consumer` string's `JOUSTRV4.SRC:NNNN` against the audit
  cited in `docs/rom-study/claims/`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
- **AC-1 mechanism generalized from "a `waveValue`/`dyRow` call" to "the row NAME as a
  quoted literal in `src/core` outside difficulty.ts."** *Spec said:* AC-1 — "grep the
  joust core for a `waveValue`/`dyRow` call passing that row NAME." *Changed to:* count a
  WRAPPER that forwards the literal, not only a direct call. *Why:* EGGWT and EGGWT2 are
  genuinely wired but reach `waveValue` only through `demo.eggWaitFrames`
  (`demo.ts:1977` passes `'EGGWT2' : 'EGGWT'`; the wrapper calls `waveValue(row,…)` at
  `demo.ts:907`). A direct-call-only reading would redden two CORRECTLY wired rows —
  a false positive that no guard-only story could fix without touching production. The
  quoted-literal-in-core mechanism is faithful to the AC's intent ("does a wired row
  genuinely HAVE a consumer") and gives 28/28 on the real tree. *Forward impact:* if a
  future row is consumed only by constructing its name dynamically (never as a literal),
  this mechanism would miss it — none do today; all 28 pass a literal.