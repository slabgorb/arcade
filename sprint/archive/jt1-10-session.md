---
story_id: "jt1-10"
jira_key: "jt1-10"
epic: "jt1"
workflow: "tdd"
---
# Story jt1-10: Dossier correction — SUB-001/002 process-block layout parrots a stale vendor comment (gates jt1-5)

## Story Details
- **ID:** jt1-10
- **Jira Key:** jt1-10
- **Workflow:** tdd
- **Type:** chore
- **Points:** 1
- **Priority:** p2
- **Stack Parent:** none

## Story Summary

From the jt1-2 R2 review (non-blocking MEDIUM, verified by the Reviewer summing the vendored RMB directives): the dossier's process-block layout in subsystems.md — and claims SUB-001/SUB-002 which faithfully quote it — repeats the vendor's own stale 1982 comment ('8 OVERHEAD BYTES', 51-byte block). The source's actual directives disagree with the source's own comment:

**Correct layout (from RMB directives):** 
- 7 overhead bytes: PLINK 2 + PID 1 + PPRI 1 + PNAP 1 + PPC 2 = 7 (not 8)
- PPOSX 3 + PPOSY 3 sit before PRAM 43
- **Total: 56-byte block** (not 51)

**Vendor's stale comment** (PBLKL at RAMDEF.SRC:180): says "8 OVERHEAD BYTES" but contradicts its own RMB directives.

The citations are CORRECT (the lines really say what's quoted) — the defect is that the dossier adopts the comment's arithmetic instead of the directives'. **GATES jt1-5:** flight/ground movement consumes this process model and would bake in a wrong struct if left uncorrected.

## Acceptance Criteria

1. subsystems.md's process-block layout states 7 overhead bytes / 56-byte block derived from the RMB directives, with the vendor's contradictory '8 OVERHEAD BYTES' comment explicitly called out as stale.
2. SUB-001/SUB-002 (and any new claims) anchor the corrected figures to the directive lines; citation suite + CLI stay green.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T02:21:19Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T02:06:21Z | 2026-07-20T02:07:45Z | 1m 24s |
| red | 2026-07-20T02:07:45Z | 2026-07-20T02:13:37Z | 5m 52s |
| green | 2026-07-20T02:13:37Z | 2026-07-20T02:18:18Z | 4m 41s |
| review | 2026-07-20T02:18:18Z | 2026-07-20T02:21:19Z | 3m 1s |
| finish | 2026-07-20T02:21:19Z | - | - |

## Delivery Findings

### Dev (implementation)
- **Confirmation** (non-blocking): **third independent derivation agrees — 7 overhead, 56-byte block.** I walked `RAMDEF.SRC:167-180` myself before touching the prose, without reading TEA's numbers first: `PLINK` 2 + `PID` 1 + `PPRI` 1 + `PNAP` 1 + `PPC` 2 = 7; + `PPOSX` 3 + `PPOSY` 3 + `PRAM` 43 = 56, and `PBLKL EQU *` at `:180` carries the stale "8 OVERHEAD BYTES" comment. That is the jt1-2 Reviewer, TEA and Dev all agreeing, so the figure is as well-established as this dossier gets. *Found by Dev during implementation.*
- **Gap** (non-blocking): **correcting the prose forced a new claim for `RAMDEF.SRC:167`, the block's own `ORG $0` — and that line matters more than its size suggests.** `RAMDEF.SRC` carries an **earlier** `ORG $0` for the image pointer table, so a layout walk that anchors on the wrong one derives a different block entirely. TEA's own suite guards against this by anchoring on `PBLKM` rather than searching for `ORG $0`; the hazard is now stated in a claim (JT10-010) so the next reader does not have to rediscover it. Affects jt1-5 and jt2's scheduler work. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **the "no stale figures" test bans the literal strings `51-byte` and `8 overhead` in ANY claim prose, which also forbids describing the correction.** My first pass at the corrected claims said "the earlier 51-byte/8-overhead figure was wrong twice over" — accurate, historically useful, and it reddened the suite. Three more of the new claims tripped the same way. Rewording to "the earlier figure of 51" satisfies it, but the test cannot distinguish *asserting* a stale figure from *documenting* one, so the history has to be phrased around the ban. Worth knowing before jt1-8 writes correction notes at scale. Affects `joust/tests/dossier-process-block.test.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking, seconding TEA): **`PBLKM` 40 x `PBLKL` 56 = 2240 bytes of process RAM, not 2040.** I did not chase it either — out of scope for a 1-pointer and jt1-5 does not need it — but the corrected block size changes the pool arithmetic by 200 bytes, and any story that sizes a process region from the dossier should re-derive it rather than scale the old number. Affects jt2. *Found by Dev during implementation.*

### TEA (test design)
- **Confirmation** (non-blocking): **my arithmetic agrees with the jt1-2 Reviewer — 7 overhead, 56-byte block.** Derived independently by walking the RMB directives from the process block's own `ORG $0` (`RAMDEF.SRC:167`): `PLINK` 2 + `PID` 1 + `PPRI` 1 + `PNAP` 1 + `PPC` 2 = **7** (`RAMDEF.SRC:168-172`); + `PPOSX` 3 (`:173`) + `PPOSY` 3 (`:174`) + `PRAM` 43 (`:176`) → `PBLKL EQU *` = **56** (`:180`). No disagreement, so the stop-and-report condition did not trigger. *Found by TEA during test design.*
- **Gap** (non-blocking, but it explains this whole story): **the citation checker cannot catch an error of this kind, by design.** jt1-2's checker verifies a claim's `source` — file, line, verbatim, byte for byte — and never reads the `claim` PROSE. `SUB-001` and `SUB-002` each cite a real line with a correct verbatim while asserting a wrong layout in their text, so the gate has been green since the day it landed and would have stayed green forever. Any story that trusts a claim's prose because "citations are green" is trusting something the gate never checked. Affects `joust/tools/audit/check-citations.mjs` — prose validation is unfalsifiable in general and not worth building, but the limitation deserves a sentence in the checker header so it is stated rather than assumed. *Found by TEA during test design.*
- **Improvement** (non-blocking): **the 51 figure is wrong in two independent ways, and only one of them is the vendor comment.** It takes the comment's inflated overhead (8 instead of 7) *and* omits `PPOSX`/`PPOSY` — six bytes — from the block entirely; 8 + 43 = 51 only works if the position fields do not exist. Correcting "8 → 7" alone would yield 50, still wrong: the fix must add the position fields back. Those six bytes hold every entity's 16-bit pixel+fraction position, which is exactly what jt1-5 integrates. *Found by TEA during test design.*
- **Improvement** (non-blocking): **the `:175` PRAML citation in the corrected paragraph is one of the jt1-8 canary's 128 bare `:N` citations.** The section is being rewritten anyway, so qualifying it costs nothing and takes the canary to 127 (the bound is one-sided, so shrinking passes). Affects `joust/docs/rom-study/subsystems.md`. *Found by TEA during test design.*
- **Question** (non-blocking): **`PBLKM` 40 × `PBLKL` 56 = 2240 bytes of process RAM, not the 2040 the old figures imply.** I did not chase whether a 2240-byte region is actually reserved anywhere — out of scope here, and jt1-5 does not need it — but if a later story sizes a process pool from the dossier, that is the number to check. Affects jt2's scheduler work. *Found by TEA during test design.*

## Design Deviations

### TEA (test design)
- **New file rather than extending an existing suite (the routing note left this open):** `tests/dossier-process-block.test.ts`. The citations suite is about the CHECKER's behaviour; this is about dossier CONTENT — they fail for different reasons and are read by different people. 13 tests in their own file is proportional to 1 point and keeps `citations.test.ts` focused.
- **Derived the expected figures at test time instead of hard-coding 7 and 56:** wherever the vendored tree is present the suite walks the RMB directives itself, and pins that derivation *before* asserting anything about the dossier. Hard-coding the numbers would have been the same failure this story exists to correct — a figure copied from a summary rather than read from the source. The literals remain only as the CI fallback (the jt1-3 degradation pattern).
- **Scoped every prose assertion to the `## 1. Executive / OS` section:** a whole-file `toContain('PPOSX')` **passed against the uncorrected dossier**, because `PPOSX` already appears in §2's flight notes sixty lines away. Caught while writing the suite. A correction has to land in the section that carries the error, and a test a stale document already satisfies is worse than no test at all.
- **Required the stale vendor comment to be KEPT and labelled, not deleted:** the tests demand the section still names `PBLKL` / "8 OVERHEAD BYTES" *and* states plainly that the directives are authoritative. Silently deleting the comment would erase the evidence of why the dossier was wrong for four stories, and leave the next reader free to re-derive the same mistake from the same line.

## Sm Assessment

**Story:** jt1-10 (1pt, p2, tdd) — dossier correction: subsystems.md's process-block layout repeats the vendor's stale "8 OVERHEAD BYTES" comment while the RMB directives sum to 7 (and the block is 56 bytes, not 51 — PPOSX 3 + PPOSY 3 sit before PRAM 43). SUB-001/SUB-002 quote it faithfully, so the citations are CORRECT and the defect is the dossier's adoption of the comment's arithmetic over the directives'. Fix: correct prose (keep the stale-comment observation as provenance), anchor corrected figures to the directive lines, loud pointer for jt1-5's TEA. GATES jt1-5.

**Setup verified:** session + context + branch `chore/jt1-10-process-block-arithmetic` off develop (c1f9720; five stories merged, 244/244, checker green). Citation gate in force — fully-qualified FILE:LINE only.

**Scale note:** 1pt — the smallest story of the epic. Proportionality applies to everyone including me: this is prose + two claims + maybe two new claims, gated by the existing citation suite. No new machinery.

**Routing:** setup → red, owner tea.
## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — a dossier figure that four stories have read. No chore bypass.

**Test Files:**
- `joust/tests/dossier-process-block.test.ts` — 13 tests: 3 arithmetic derivation, 5 dossier prose, 5 claims.

**Tests Written:** 13 tests
**Status:** RED — **9 failed / 4 passed**. Baseline **244/244 green** (248 of 257 overall), `tsc --noEmit` exit 0.

| Environment | Result |
|---|---|
| with the vendored tree | 9 failed / 248 passed (257) |
| `JOUST_SOURCE_DIR=/nonexistent` — CI | 9 failed / 206 passed / 42 skipped |

The 4 passes are the three arithmetic derivations plus one structural guard — green by design. Prose and claims tests are repo-local so they run on CI; only the 3-test derivation block is tree-dependent.

### The arithmetic — verified independently, as instructed

Walking the RMB directives from the process block's own `ORG $0` (`RAMDEF.SRC:167`):

| Field | Size | Line |
|---|---|---|
| `PLINK` | 2 | `RAMDEF.SRC:168` |
| `PID` | 1 | `:169` |
| `PPRI` | 1 | `:170` |
| `PNAP` | 1 | `:171` |
| `PPC` | 2 | `:172` |
| **overhead** | **7** | |
| `PPOSX` | 3 | `:173` |
| `PPOSY` | 3 | `:174` |
| `PRAM` | 43 | `:176` |
| **`PBLKL EQU *`** | **56** | `:180` |

**My derivation agrees with the Reviewer: 7 and 56.** No stop-and-report needed.

**The 51 is wrong in two independent ways** — it takes the vendor comment's inflated overhead (8) *and* omits `PPOSX`/`PPOSY` entirely; 8 + 43 = 51 only works if the position fields do not exist. Fixing "8 → 7" alone gives 50, still wrong. Those six bytes are the 16-bit pixel+fraction positions jt1-5 integrates, which is why this gates it.

### Why the citation gate never caught this

jt1-2's checker verifies a claim's `source` — file, line, verbatim, byte for byte. **It never reads the `claim` prose.** `SUB-001` and `SUB-002` both cite real lines with correct verbatims while asserting a wrong layout in their text, so the gate has been green since it landed and would have stayed green indefinitely. Anything that trusts a claim's prose because "citations are green" is trusting something the gate does not check.

### Two design choices worth flagging

**The expected figures are derived, not typed.** Where the tree is present the suite walks the directives itself and pins that derivation *before* touching the dossier. Hard-coding 7 and 56 would have committed exactly the sin this story corrects — a number copied from a summary.

**One vacuous assertion caught and fixed mid-write.** A whole-file `toContain('PPOSX')` **passed against the uncorrected dossier**, because `PPOSX` already appears in §2 sixty lines away. All prose assertions are now scoped to the `## 1. Executive / OS` section. A test that a stale document already satisfies is worse than no test.

**Commit:** joust `chore/jt1-10-process-block-arithmetic` — `2575281`

**Handoff:** To Dev for implementation (GREEN).
## Design Deviations — Dev

- **Corrected `SUB-001`/`SUB-002` in place rather than superseding them.** The jt1-2 pattern pairs a mis-anchored claim with a new evidence claim, because there the *anchor* was wrong. Here the anchors are correct (`PBLKM` at `:166`, `PLINK` at `:168` are both real prose citations the AC-2 sweep requires) and only the *prose* was false, so the honest fix is to rewrite the sentence and keep the citation. Ten new claims were added alongside for the directive lines the old pair never covered.
- **Rendered the layout as a table rather than a sentence.** The original error was possible partly because the layout was prose arithmetic a reader had to re-do in their head. A field/bytes/cite/role table makes the omission of `PPOSX`/`PPOSY` structurally visible — a missing row is obvious in a way a missing addend is not.

## Dev Assessment

**Implementation Complete:** Yes

**Files (joust — committed to `chore/jt1-10-process-block-arithmetic`, `e717ecd`):**
- `docs/rom-study/subsystems.md` — §1 process-block section rewritten: field table, provenance paragraph, jt1-5 pointer, `PRAML` citation qualified
- `docs/rom-study/claims/subsystems.json` — `SUB-001`/`SUB-002` corrected + 10 new claims (`JT10-001`…`JT10-010`)
- `tools/audit/check-citations.mjs` — header section stating what the checker does not check (comment only, no code change)

**Test counts:**

| Run | Result |
|---|---|
| `dossier-process-block.test.ts` | **13/13** (RED was 13 failed) |
| full suite, tree present | **257/257** |
| CI path (`JOUST_SOURCE_DIR=/nonexistent`) | **215 passed / 42 skipped, 0 failed** |
| `npm run build` | **exit 0** |
| citation gate | `checked 240 claim(s) / all claims verified` |

**Canary:** **128 → 127.** The bare `:175` `PRAML` citation is now `RAMDEF.SRC:175`. One-sided bound, so shrinking passes.

**Claims:** 230 → **240**. `SUB-001` and `SUB-002` corrected in place; new anchors on the block `ORG $0` (`:167`), all five overhead fields (`:169-172`, `:168` via SUB-002), both position fields (`:173`, `:174`), `PRAML`/`PRAM` (`:175`, `:176`) and `PBLKL` itself (`:180`).

**The correction, verified three ways.** I derived the layout from `RAMDEF.SRC:167-180` before reading TEA's numbers: 7 overhead, 56 total, and `PBLKL`'s comment says 8. That is the jt1-2 Reviewer, TEA and Dev independently agreeing.

**What the fix had to do that a naive reading would not.** The old 51 is wrong *twice*: inflated overhead **and** two missing fields. Changing 8→7 alone gives 50. The section now shows every field as a table row, so a missing field is structurally visible rather than hidden inside prose arithmetic.

**Provenance kept, not deleted.** `PBLKL`'s stale comment is quoted and explicitly labelled as superseded by the directives, because it is the evidence for how the error survived four stories.

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 0 | reviewer-preflight | **Not spawned — scope executed directly by the Reviewer** | clean | Suite **257/257** (9 files, matches baseline); CI path **215 passed / 42 skipped / 0 failed**; citation gate `checked 240 claim(s) / all claims verified`; `npm run build` exit 0; bare-`:N` canary **127** by my own count (down from 128 — the `:175` PRAML citation is now qualified). Tree clean; every probe ran in a `mktemp -d` outside the repo per the jt1-7 hygiene lesson. | Ran directly. |
| 1 | reviewer-rule-checker | **Not spawned — scope executed directly by the Reviewer** | clean | Radix and citation discipline intact; claims re-anchored to the directive lines they assert about; canary moved in the right direction; checker header amended. | jt1-10's rule surface is one arithmetic derivation from one source file — reading `RAMDEF.SRC:166-182` against the dossier *is* the check. |
| — | (no specialists spawned) | — | — | — | **Deliberate, for proportionality.** A 1-point single-number correction whose whole verification is "walk eight `RMB` directives and add them up" does not benefit from fan-out; the sum is faster to do than to delegate, and delegation is where this session's false-liveness and repo-hygiene problems came from. |

**All received: Yes** — all enabled specialist scopes are accounted for and were executed directly by the Reviewer; none were spawned.

## Reviewer Assessment

**Verdict:** APPROVED

**This story exists because of my jt1-2 R2 finding, and the fix is right — verified from the source, not from the report.**

### The arithmetic [RULE]

I walked the `RMB` directives from the block's `ORG $0` myself and summed them independently:

```
:168 PLINK 2 | :169 PID 1 | :170 PPRI 1 | :171 PNAP 1 | :172 PPC 2   ->  7 overhead
:173 PPOSX 3 | :174 PPOSY 3                                          -> 13
:176 PRAM  43 (PRAML EQU 43, :175)                                   -> 56
```

**56**, and `PBLKL EQU *` at `:180` is exactly that — the assembler's own computed value. The old **51** was wrong in the two independent ways TEA identified and my finding only half-caught: it took the comment's inflated overhead (**8**, not 7) **and** dropped `PPOSX`/`PPOSY` entirely, because `8 + 43 = 51` only balances if the position fields do not exist. Correcting overhead alone gives 50 — still wrong. The corrected prose states both corrections explicitly and says so in those terms.

**The stale comment survives as provenance, not truth.** `PBLKL`'s *"8 OVERHEAD BYTES + PROCESSES EXCLUSIVE RAM"* is quoted, labelled stale, and the directives are declared authoritative — with the reasoning that it is kept "because it is the evidence for how the error survived." A test pins it too: if `RAMDEF.SRC:180` ever stops saying "8", the dossier's explanation of the discrepancy goes stale and the suite catches it. That is a better construction than deleting the comment, and better than I asked for.

**Claims re-anchored properly:** `SUB-001` now sits on `RAMDEF.SRC:166` (`PBLKM EQU 40`) carrying the 56-byte layout, `SUB-002` on `:168` (`PLINK RMB 2`) as the first overhead field — the bundled-assertion shape that caused the original defect is gone. Canary **127**. Checker 240 claims green.

**The checker header amendment is the most valuable thing in this story**, and it is not what the story asked for. It now states plainly that the gate verifies `source` and *never* reads `claim` prose — that a claim can cite a real line with a byte-perfect verbatim while asserting something false about it, "every time, forever" — and cites this very story as the concrete instance. That converts my jt1-2 structural finding from a review comment into documentation living next to the tool. Exactly right.

**The jt1-5 pointer exists** (`subsystems.md:44`) and is loud: the six position bytes are called out as the 16-bit pixel+fraction fields the flight model integrates, both in the table and in a dedicated line.

### The test design — the anti-summary-copying property holds

`derivedLayout()` walks the directives at test time, and the **first** test pins that derivation against the source *before* any dossier assertion runs: *"If RAMDEF ever changes, or if the walk is wrong, this fails before any dossier assertion does."* That is the property that distinguishes this from a second copy of the same number. The committed literals stand alone only on CI where the tree is absent — the jt1-3 degradation pattern, correctly applied.

### Findings by severity

| Severity | Issue | Location | Blocks? |
|---|---|---|---|
| LOW | **The derivation hardcodes the largest of its three summands.** `const size = rmb[2] === 'PRAML' ? 43 : parseInt(rmb[2], 10)` resolves every `RMB` operand from the directive **except** `PRAML`, which is written as a literal `43` rather than read from `PRAML EQU 43` (`RAMDEF.SRC:175`). Proven: I copied the vendored tree to a temp dir, changed it to `PRAML EQU 44`, and pointed `JOUST_SOURCE_DIR` at the copy — **all 13 tests still passed**, though the real block would then be 57. So 43 of the 56 bytes are not actually derived. This is the same class of defect the story exists to correct — a figure copied rather than derived — and the fix is one line, since the suite's own reader already resolves `EQU` values elsewhere. Not blocking: `PRAML` is a frozen 1982 constant, today's number is right, and the deliverable prose and claims are correct. | `tests/dossier-process-block.test.ts:113` | No |

No other findings. The number is right, and SM's instruction was to block only on a wrong number.

**Handoff:** To SM for finish-story.
## Sm Fix Note (post-approval one-liner, user standing rule)

Applied the Reviewer's LOW directly: the derivation's PRAML operand is now resolved from its own `EQU` line (symbol table collected during the walk; unresolvable operands throw) instead of a hardcoded 43. Proof by the Reviewer's own probe: a temp-tree mutation `PRAML EQU 44` now fails the derivation test (was: all 13 pass); the real tree stays 257/257. A figure copied, not derived, was the exact defect this story corrects — fitting that the last fix of the story is its own moral applied to its own tests.
