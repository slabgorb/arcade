---
story_id: "rb4-2"
jira_key: "rb4-2"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-2: RETRACT THE POISONED DOC — it cites the decoy build R2BRON.MAC and misreads hex as decimal

## Story Details
- **ID:** rb4-2
- **Jira Key:** rb4-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T11:17:40Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T10:04:41.962495+00:00 | 2026-07-14T10:07:38Z | 2m 56s |
| red | 2026-07-14T10:07:38Z | 2026-07-14T10:26:03Z | 18m 25s |
| green | 2026-07-14T10:26:03Z | 2026-07-14T10:48:42Z | 22m 39s |
| review | 2026-07-14T10:48:42Z | 2026-07-14T11:17:40Z | 28m 58s |
| finish | 2026-07-14T11:17:40Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (blocking): AC2 says R2BRON.MAC differs from RBARON.MAC in **14 lines**. The
  source says **7** — and every one of them is a ROM self-test checksum byte (`CHKSM2`–`CHKSM7`).
  14 is a unified-diff double-count (7 removed + 7 added). Affects
  `docs/red-baron-1980-source-findings.md` (the trap header must state 7, not 14) and the AC itself.
  The suite DERIVES the count from the quarry and asserts the header matches, so it cannot be
  satisfied by typing 14. *Found by TEA during test design.*
- **Conflict** (blocking): AC6 — "every code comment in src/ that cites the doc as authority" — is
  **124 citations across 21 files** (`grep -c 'findings §'`). That is not a 3-point story. I tested
  the defensible core instead: zero decoy-build citations in `src/` (10 sites, 5 files) and zero
  repetitions of a retracted claim. The other 114 `findings §N` pointers stay legal *because this
  story repairs the doc they point at*. Affects `src/**/*.ts`.
  **RULED (user, 2026-07-14): NARROW reading adopted** — Dev fixes the 10 decoy-build citations and
  any comment repeating a retracted claim; the 114 `findings §N` pointers stay. The RED suite already
  encodes exactly this, so no test change. Story stays 3 points. *Found by TEA during test design.*
- **Gap** (non-blocking): the story says "three of its §1 line citations are off by one". Five are
  provably wrong (`CALCNT`:620→621, `BNRCNT`:621→622, `MAIN`:761→763, `SHLAUN`:4022→4027,
  `INC FRAME`:868→870), and the drift is a **staircase, not a constant** — +1 near the top of the
  file, +8 past line 5963. Any fix that shifts everything by one re-breaks the deep citations.
  Affects `docs/red-baron-1980-source-findings.md`. *Found by TEA during test design.*
- **Gap** (blocking for future stories): **the root cause is still on disk and still wired up.**
  `red-baron/reference/red-baron/` — the gitignored quarry the doc's own header names as its
  source — IS the CRLF sibling (md5 `27cdfe…`), the copy the epic calls NOT citable. The citable
  byte-of-record is `~/Projects/red-baron-source-text` (md5 `497db9…`, LF). Until that checkout is
  re-pointed, the next author reads the wrong line numbers and this story happens again. The
  orchestrator has already vendored the correct LF copy at `arcade/reference/atari-source/red-baron/`
  (branch `feat/extract-audio`). Affects `red-baron/reference/`. *Found by TEA during test design.*
- **Gap** (non-blocking): `src/core/biplane.ts` implements a **distance** LOD (`LOD_DISTANCE`) that
  the ROM does not have. `DRNPIC` (RBARON.MAC:4961-4963) selects the 29-point `.DRPNT` drone model
  on `PLSTAT+6` bit `0x10` ("PLANE ROTATED"/"FACING AWAY") — an orientation test, not a depth test.
  This story retracts the false *claim*; replacing the *behaviour* is a separate story. Confirms the
  boundary SM flagged. Affects `src/core/biplane.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the doc carries **no per-citation `verbatim`**, unlike
  `docs/audit/findings/*.json`, which is why a universal 199-citation checker is impossible here —
  there is no reliable oracle for what a prose citation *claims*. Adopting the audit's `verbatim`
  discipline in the doc would make every citation machine-verifiable forever. Affects
  `docs/red-baron-1980-source-findings.md`. *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC2's "14 lines" is tested as 7 — the suite believes the source, not the brief**
  - Spec source: context-story-rb4-2.md, AC-2
  - Spec text: "R2BRON.MAC is identical to RBARON.MAC but for 14 lines"
  - Implementation: the test DERIVES the differing-line count from the quarry and asserts the doc's
    header states that number; it additionally asserts the header does NOT say "14".
  - Rationale: the source says 7 (all checksum bytes). This story exists because someone wrote down
    a number they had not re-read; a test that hardcodes the brief's number would repeat the crime.
  - Severity: major
  - Forward impact: AC2 should be corrected to "7 lines, every one a ROM checksum byte".

- **AC6 tested as "no decoy citations + no retracted claims in src/", not as 124 comment rewrites**
  - Spec source: context-story-rb4-2.md, AC-6
  - Spec text: "Every code comment in src/ that cites the doc as authority is re-pointed at the ROM
    (file:line + radix) or at the audit."
  - Implementation: asserts every ROM citation in `src/` names a SHIPPED module (catches the 10
    decoy citations) and that no comment repeats a retracted claim. Does NOT require the 114 other
    `findings §N` pointers to be rewritten.
  - Rationale: `findings §` appears 124 times across 21 files. The literal reading is an 8+ point
    comment migration. Once the doc is repaired, a pointer *to the repaired doc* is no longer a
    citation of a poisoned authority — the poison was the decoy build and the false claims, and
    both are asserted gone.
  - Severity: major
  - Forward impact: if SM/user rules for the literal reading, the story must be re-pointed and
    resized; the extra assertion is a one-line change to the AC6 group.

- **No universal 199-citation resolver; §1's citations are checked by derived definition-line**
  - Spec source: context-story-rb4-2.md, "Suggested verification seam"
  - Spec text: "resolve every `FILE.MAC:NNN` reference — in the doc AND in src/ comments — against
    the vendored source and assert the named symbol is actually on that line"
  - Implementation: for the symbols §1 cites at their definition, the test looks the symbol up in
    the quarry, derives the true line, and requires the doc to cite it. No prose-parsing heuristic.
  - Rationale: I built the universal resolver and measured it: 64% resolve against the citable copy
    vs 57% against the CRLF sibling. That is noise, not a signal — the oracle (guess the symbol a
    prose citation "means") is unreliable, and an unreliable oracle produces failures Dev cannot
    fix. The doc carries no `verbatim` field, so no sound universal oracle exists today.
  - Severity: minor
  - Forward impact: filed as an Improvement — adopt the audit's `verbatim` discipline in the doc and
    the universal checker becomes possible.

- **The doc must carry `<!-- decoy-trap:start/end -->` markers**
  - Spec source: context-story-rb4-2.md, AC-1 + AC-2
  - Spec text: AC1 "Zero references to R2BRON/R2GRND remain" vs AC2 "The doc carries a loud header
    naming the decoy trap"
  - Implementation: introduced an HTML-comment-delimited region; every `R2BRON`/`R2GRND` mention
    must fall inside it.
  - Rationale: AC1 and AC2 are in direct tension — the header must name the thing AC1 bans. A
    delimited region satisfies both and is mechanically checkable, where "is this mention a warning
    or a citation?" is not.
  - Severity: minor
  - Forward impact: Dev must wrap the trap header in the two markers; the convention is enforced by
    the suite from now on.

## Subagent Results

**All received: Yes** (4 of 4 specialists reported; no timeouts, no errors).

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 blocking | 897/897 green, `tsc` clean, 0 `.only`/`.skip`/`console.log`/TODO/debugger. The single hardcoded absolute path (`RED_BARON_SOURCE_DIR` default) exactly mirrors the existing convention in `tests/audit/citations.test.ts:45`. **Accepted.** |
| 2 | reviewer-test-analyzer | Yes | findings | 9 (2 high, 4 med, 3 low) — all vacuous-assertion class | **Confirmed 5, actioned all 5.** Independently reproduced both high findings by mutation (`toContain('7')` satisfied by `037007.XXX`; `/0x10\|D4/i` satisfied by §6's unrelated `D4-D7`) and the CI-skip finding (20/25 skipped without the quarry). Its mediums (evadable `$40` watchdog; uppercase-only decoy regexes) were confirmed and fixed; its lows (unanchored `62.5`/`50`) folded into the same anchoring pass. |
| 3 | reviewer-rule-checker | Yes | findings | 2 (both rule #2, `readonly` on array params) | **Confirmed both, FIXED.** `at()` and `differingLines()` never mutate their array args; the repo's own convention uses `readonly` (`src/core/guns.ts` → `readonly Enemy[]`). Now `readonly string[]`. It also independently verified my central claim: **zero executable lines changed in `src/`** (comment-only), core/shell boundary intact, ROM radix rule honoured. |
| 4 | reviewer-security | Yes | findings | 5 (1 med, 4 low) | **1 downgraded with rationale, 4 accepted as no-action.** See below. |

### On the security finding — MOOT (user ruling, 2026-07-14) [SEC]

> **RESOLVED BY THE USER, and more cleanly than my downgrade.** There is no copyright constraint at
> all: `historicalsource/red-baron` is a public repo and this clone is a learning project that is not
> sold. The premise of the finding — CLAUDE.md's "the Atari ROM source is COPYRIGHTED and must NEVER
> enter the repo" — was simply false, and it had propagated into six files as if it were a rule.
> All six were corrected (commit `30abd06`): the tests still skip when the quarry is absent, but for
> the real reason — it is a **separate checkout**, not a licensing matter. My analysis below reached
> the right conclusion (quoting lines is routine; the repo already commits 169 of them) but accepted a
> false premise instead of questioning it.

### The original analysis — downgraded, NOT dismissed [SEC]

reviewer-security flagged (medium) that the doc's new fenced code blocks reproduce 3 consecutive
verbatim lines of `RBARON.MAC` (the `DRNPIC` excerpt) and 2 of `R2BRON.MAP`, against CLAUDE.md's
absolute rule that *"the Atari ROM source is COPYRIGHTED and must NEVER enter the repo."* It called
this "the first multi-line verbatim excerpt this doc has ever committed."

A project-rule finding may not be dismissed, so I checked the premise rather than argue it:

- `docs/audit/findings/*.json` — **9 tracked files carrying 169 findings, every one of which commits
  a verbatim ROM source line** (`'\tFRMECNT=4'`, `'CALCNT\t=18'`, `'\tCMP I,250.\t\t;250.*.004=1'`).
  That is not an accident; byte-for-byte `verbatim` comparison is the audit's entire verification
  mechanism, and `tools/audit/check-citations.mjs` exists to enforce it.
- `tests/audit/citations.test.ts` on `develop` already commits the same literals.
- `reference/` has **0 tracked files** — the source itself is genuinely not vendored (I verified).

So the rule governs **vendoring the source files**, which this diff does not do, and cannot mean "no
line may ever be quoted" — the repo's own audit machinery depends on quoting them. A 3-line excerpt
is a difference of **degree** from 169 already-committed verbatim lines, not of kind, and it is the
evidence that makes the retraction mechanically checkable (the suite now asserts
`/OBJ:R2BRON\s+RBARON/` against it).

**Downgraded to non-blocking, with the rationale recorded here and surfaced to the user** — it is a
copyright-policy judgment, not a purely technical one, and the user should know it was made.

The other four (path traversal via `RED_BARON_SOURCE_DIR`; `statSync` following symlinks under
`src/`; the absolute path disclosing a username) all require write access to the repo to exploit and
are Node-only test tooling that never ships in the browser bundle. Accepted, no action.

**My own findings, beyond all four specialists:** the stateful `/g` + `.test()` false negative in the
decoy gate (round 2) and the entirely unguarded load-map warning (round 3). Neither was surfaced by
any subagent. Both were found by mutating the tree and watching what stayed green.

## Reviewer Assessment

**Verdict: APPROVED.** [TEST] [RULE] [SEC]

897/897 green, `tsc --noEmit` clean, CI enforcement 20 tests (was 5). No blocking findings remain.

**Specialist tags:** [TEST] — 9 findings from reviewer-test-analyzer, 5 confirmed and all 5 actioned
(the vacuous-assertion class; see rounds 1–3). [RULE] — 2 findings from reviewer-rule-checker, both
confirmed and fixed (`readonly` on non-mutating array params). [SEC] — 5 findings from
reviewer-security; the one medium (verbatim ROM excerpts in the doc vs CLAUDE.md's "the source must
never enter the repo") is **downgraded with rationale, not dismissed** — the repo already commits 169
verbatim ROM lines in `docs/audit/findings/*.json` as the audit's own verification mechanism, and
`reference/` has 0 tracked files, so the rule governs vendoring the source files (which this diff does
not do). Full reasoning in the Subagent Results section above; surfaced to the user because it is a
copyright-policy call, not a technical one. The remaining 4 (path traversal, symlink-following
`statSync`, username in an absolute path) require repo write access to exploit, are Node-only test
tooling that never ships in the browser bundle, and match existing convention. Accepted, no action.

I did not approve this on a spot-check. I re-ran the **full vacuity audit** from scratch against the
final tree: delete each of the **21 claims** the doc makes, one at a time, and require the suite to
go red. **All 21 bite.** Zero vacuous assertions.

```
checksum bytes · differing-line count · FRMECNT · 62.5 Hz · 50 Hz · TWO-differences ·
load-map self-identification · CALFLG ≥ 3 · radix :74 · island 6217 · island 6280 ·
trailing-dot escape · CALCNT :621 · BNRCNT :622 · MAIN :763 · SHLAUN :4027 ·
INC FRAME :870 · PLSTAT+6 · DRNPIC · DRNPIC :4961 · the trap header itself
```

Plus the adversarial set: a doc claiming 9 lines, a `$40` watchdog, a lowercase `r2bron.mac`
citation, `timing.ts` reverted to the stale `:620`, a reworded depth claim ("level of detail by
depth"), a gutted LOD passage, and two *adjacent* decoy-bearing files — every one turns the suite
red, all in CI mode with no quarry present.

### What this story actually delivered

The **doc** was right after round 1. What took three more rounds was making the **guard** honest —
which is the correct place to spend them, because the guard is the only part of this work that has
to survive the next author, and the story's entire justification is that the poison "will re-infect
every future Red Baron story" until it is stopped.

One bug appeared three times, and it is worth naming because it will recur:

| The assertion | Was satisfied by | Instead of checking |
|---|---|---|
| `toContain('7')` | `037007.XXX` | the differing-line count |
| `/\bTWO\b\|\b2\b/i` | `(rb4-2)` | the two ground-module differences |
| `/\.MAP/i` | `R2BRON.MAP` | the decoy's map identing as RBARON |

Each matched a **token** where it claimed to check a **claim**. In a story whose thesis is *"someone
wrote down a number they had not re-read,"* that is not an incidental defect — it is the same defect,
relocated into the enforcement. It was caught each time by mutation and never by reading, which is
the lesson worth keeping: **a guard nobody has tampered with is decoration.**

### Verified independently against the ROM (not taken on the diff's word)

- **No citation regressed.** The blanket shift was the one move that could have silently destroyed
  rb4-1's work. Re-resolved every citation before/after: no symbol that resolved stopped resolving;
  4 more now do (36/49 → 49/56). rb4-1's 36 already-correct `src/` citations were left untouched.
- **Every ROM fact re-derived myself:** 7 differing lines, all `CHKSM`; RBGRND vs R2GRND at `:61` and
  `:197` (`CMP I,3` vs `CMP I,40`); `R2BRON.MAP:10` identing as `RBARON`; `DRNPIC` reading `PLSTAT+6`
  / `AND I,10` → `.DRPNT` when facing away; `CALCNT` at `:621`; radix switches at exactly 74/6217/6281.
- The `ROM` constants architecture is right: derived from source where derivable, enforced against
  the doc everywhere, so the numbers cannot be typed-and-unverified *and* the guard runs on every push.

Good work. The staircase diagnosis and the coordinate-transform insight were not obvious, and the
`biplane.ts` divergence was correctly labelled rather than silently "fixed".

**Handoff:** To SM (The Organic Mechanic) to finish.

## Reviewer Assessment (round 3)

**Verdict: REJECTED — 1 blocking.** [TEST]

Round-2's two findings are **fixed and re-proved** (I re-ran them myself; I did not read the table).
The stateful-regex bug is gone — two *adjacent* decoy-bearing files are now both caught — and the
`TWO` claim is properly anchored, failing against all three corruptions I could invent.

So this round I stopped checking the fixes and audited the whole guard instead: **I deleted every
positive claim the doc makes, one at a time, and checked the suite went red.** Nineteen claims.
Eighteen bite. One does not.

### BLOCKING 5 — the load-map warning is entirely unguarded. Proven. [TEST]

`expect(trapHeader()).toMatch(/load map|\.MAP|object module/i)`, whose stated job is *"the header
must warn that the decoy IDENTIFIES ITSELF as RBARON."*

It does no such thing. The alternation matches the token `.MAP` — which appears in `R2BRON.MAP`
elsewhere in the header — so the claim it is named for is never checked. Two mutations, both green:

| Mutation | Result |
|---|---|
| Falsify the evidence: the map names `HARMLESS`, not `RBARON` | **not caught** |
| Delete the entire load-map warning **and its evidence block** | **not caught** |

This is AC2's third sub-claim — *"R2BRON's own load map identifies its object module as 'RBARON'"* —
with **zero enforcement**. And it is the third appearance of one bug: `toContain('7')` matched by
`037007.XXX`; `\b2\b` matched by `rb4-2`; now `\.MAP` matched by `R2BRON.MAP`. Each time, an
assertion matched a **token** where it claimed to check a **claim**.

**Fix:** assert the evidence, which the source-side group already derives —
`expect(trapHeader()).toMatch(/OBJ:R2BRON\s+RBARON/)`. The header already contains exactly that
line; it simply was never checked.

### The other eighteen claims all bite

checksum bytes · FRMECNT · 62.5 Hz · 50 Hz · `CALFLG ≥ 3` · radix start `:74` · island `6217` ·
island `6280` · trailing-dot escape · CALCNT `:621` · BNRCNT `:622` · MAIN `:763` · SHLAUN `:4027` ·
INC FRAME `:870` · PLSTAT+6 · DRNPIC · DRNPIC line `:4961` · the trap header itself — delete any one
and the suite goes red. Plus the round-1 set (9 lines, `$40`, lowercase decoy, stale `:620`,
reworded depth claim, gutted LOD passage). 897/897, `tsc` clean, CI enforcement 20.

The doc has been correct since round 1 and remains correct. What has taken three rounds is making
the *guard* honest — which is the right thing to spend the rounds on, because the guard is the only
part of this story that has to survive the next author.

One line. Then I sign it.

**Handoff:** back to Dev (The Word Burgers).

## Reviewer Assessment (round 2)

**Verdict: REJECTED — 2 blocking.** [TEST]

Both original blockers are **genuinely fixed** — I re-proved them, I did not take the word of the
assessment. The count guard now bites (`9 lines` → 1 failed), CI enforcement is 5 → **20 tests**,
and the `ROM`-constants architecture is the right answer: derived from source where the source
exists, enforced against the doc everywhere. 897/897, `tsc` clean.

But the rewrite introduced two new holes, and I found them the same way I found the last two —
by mutation. One of them is the **same bug class as the one it was fixing**, one line below it.

### BLOCKING 3 — `/\bTWO\b|\b2\b/i` is vacuous. Proven. [TEST]

`tests/audit/source-citations.test.ts` — `expect(header, 'the header must say there are TWO
substantive differences').toMatch(/\bTWO\b|\b2\b/i)`.

The trap header contains a standalone `2` in **`(rb1-2)`** and **`(rb4-2)`** — the story IDs. `\b2\b`
matches both. I stripped **every** occurrence of "TWO" from the trap header:

```
Tests  20 passed | 8 skipped (28)
```

Fully green. The header can drop the claim entirely and the assertion still passes. This is
`toContain('7')` satisfied by `037007.XXX`, reincarnated as `\b2\b` satisfied by `rb4-2` — a number
matched to *its presence* instead of *its claim*, in the very commit whose message says "Numbers are
now matched to their CLAIM, never merely present."

Mitigating: the siblings in that test (`FRMECNT`, `CALFLG|watchdog`, `62.5 Hz`, `50 Hz`) do bite, and
the source-side group pins `groundDiffLines` to `[61, 197]` exactly — so the *fact* is guarded and
the doc is not currently wrong. It is the assertion that is scenery. But this story is precisely
about claims that nothing verifies, and shipping a fresh one inside the fix is not something I will
sign.

**Fix:** tie it to the count, like the sibling above it —
`toMatch(new RegExp('\\bTWO\\b|\\b' + ROM.groundDiffLines.length + '\\s+(substantive\\s+)?(lines|differences)'))`.

### BLOCKING 4 — the decoy gate has a stateful-regex false negative. [TEST]

`const DECOY_NAME = /R2BRON|R2GRND/gi` is a **global** regex, and it is used with `.test()` inside a
`.filter()`. `.test()` on a `/g` regex advances `lastIndex` and resumes from it on the next call:

```
"R2BRON here"  -> true
"R2GRND here"  -> false     <-- MISSED
"R2BRON again" -> true
```

This is the gate that stops the decoy creeping back into `src/`, and it is one of the few that runs
in CI. Today it happens not to miss anything — a non-matching file resets `lastIndex`, and no two
decoy-bearing files are adjacent in the walk order — which is exactly why it is dangerous: it is
correct **by accident of directory order**. Two adjacent offending files and one walks through.
Dev's own mutation test passed only because `timing.ts` and `scoring.ts` have other files between
them.

A guard whose single job is "never miss one" cannot have an order-dependent false negative.

**Fix:** drop the `/g` for the `.test()` use (`matchAll` needs it; `.test()` must not have it) — or
use `.some()` over `matchAll`. One line.

### Verified sound — everything else holds

- Count guard, watchdog `$40`, lowercase decoy, stale `:620`, reworded depth claim, gutted LOD
  passage: **all six bite in CI mode.** I re-ran the ones that mattered rather than trusting the table.
- CI enforcement genuinely 5 → 20. The `skipIf` split is correct and the `ROM` object is the right
  shape — one place for each fact, derived where derivable.
- No coverage lost in the restructure: 25 → 28 tests, every AC still represented.
- The doc remains correct; no doc changes were needed and none were made.

Two one-line fixes. This is very close.

**Handoff:** back to Dev (The Word Burgers).

## Reviewer Assessment (round 1)

**Verdict: REJECTED — 2 blocking.** [TEST]

The doc is *correct*. I re-derived every fact in it from the ROM myself and found no error. What I
am rejecting is the **guard**. This story's whole thesis is "a number got into the doc that nobody
re-verified" — and the test that is supposed to make that impossible forever contains, itself, a
number nobody re-verified. I proved it by mutation, not by reading.

### BLOCKING 1 — the "7 lines" guard is fake. Proven. [TEST]

`tests/audit/source-citations.test.ts:238` —
`expect(header).toContain(String(diff.length))` collapses to `toContain('7')`, and the trap header
contains a `7` eight times over for unrelated reasons (`037007.XXX`, `CHKSM7`, `037001.01`, …).

I edited the doc to claim the builds differ in **9 lines** — a false statement — and ran the suite:

```
Tests  25 passed (25)
```

The doc may state **any** count except 14 and the gate stays green. The source-derived half is
sound (`expect(diff.length).toBe(7)` genuinely pins the ROM); it is the half that checks *the doc
says it* that is decorative. That is precisely the defect the story exists to eradicate, reproduced
inside its own enforcement.

**Fix:** anchor the number to its claim — `toMatch(new RegExp('\\b' + diff.length + '\\s+lines\\b'))`.

### BLOCKING 2 — the recurrence guard does not run in CI. Proven. [TEST]

The story's justification is "until it is fixed it will re-infect every future Red Baron story." But
with the quarry absent — which **is** the CI condition, the Atari source being copyrighted and
gitignored — 20 of the 25 tests skip:

```
RED_BARON_SOURCE_DIR=/nonexistent  →  Tests  5 passed | 20 skipped (25)
```

Only the decoy-name greps survive. In CI the doc could revert the watchdog to `0x40`, restore every
stale line number, and re-assert the distance LOD, and the build would be green.

The damning part: **most of those tests never needed the source.** `the doc no longer claims the
0x40 threshold`, `states the radix rule ONCE`, `names the decimal island :6217-6280`, `the doc no
longer claims a built-in DISTANCE LOD`, `timing.ts cites :621 not :620` — every one is a pure grep
over files that are *in the repo*. They were nested inside `describe.skipIf(!sourceAvailable)` only
because they sit beside a source-derived sibling.

**Fix:** split each source-gated block in two — source-derived assertions stay behind `skipIf`;
doc-side and src-side greps run unconditionally. That is a restructure, not new logic, and it moves
most of AC2–AC5 from "enforced on one laptop" to "enforced on every push."

### NON-BLOCKING — fix while you are in there [TEST]

- `:425` — AC5's `toMatch(/0x10|D4|bit 4/i)` scans the **whole doc**, and §6's unrelated
  `**D4-D7** explosion level` (line 343) satisfies it. Gut the bit-naming from the LOD passage and
  the assertion still passes. Scope it to the `DRNPIC` paragraph the way `trapHeader()` scopes AC2.
- `:92`/`:100` — the decoy regexes are uppercase-only (no `/i`). A citation written `r2bron.mac:100`
  evades **both** CI-running gates (AC1 and AC6's allowlist). One character.
- `:293`/`:449` — the watchdog negative misses the `$40` spelling (`(0x40|40|64)` cannot match after
  `$`). The `:449` copy is one of the five gates that actually runs in CI.
- `:414` — `/distance LOD/i` blocks a two-word string, not a claim. "level of detail by depth" walks
  straight through.

### What I verified and found SOUND — this is not a rewrite

I did not take the diff's word for any of it:

- **No citation regressed.** Dev shifted every doc citation on the theory that the doc is uniformly
  CRLF-based. That is the one move that could have silently destroyed rb4-1's work. I re-resolved
  every citation against the ROM before and after: **no symbol that resolved before stopped
  resolving**, and 4 more now do (36/49 → 49/56). The band-shift is a coordinate transform and it
  held.
- **The `src/` diff is correctly narrow** — only the 10 decoy citations and `timing.ts`'s two
  `:620`s moved. rb4-1's 36 already-correct citations were left untouched, which was the trap.
- **Every ROM fact re-derived independently:** 7 differing lines, all `CHKSM`; RBGRND vs R2GRND at
  `:61` and `:197` (`CMP I,3` vs `CMP I,40`); `R2BRON.MAP:10` identing as `RBARON`; `DRNPIC` reading
  `PLSTAT+6` / `AND I,10` → `.DRPNT` when facing away; `CALCNT` at `:621`; radix switches at exactly
  74 / 6217 / 6281.
- 894/894 green, `tsc --noEmit` clean.

The engineering here is genuinely good — the staircase diagnosis and the coordinate-transform
insight are correct and were not obvious. Tighten the two guards and this lands.

**Handoff:** back to Dev (The Word Burgers) for the test fixes. No doc changes required.

## Dev Assessment (round 3 — the two holes the fix itself opened)

**Status:** GREEN — 897/897, `tsc` clean. Both round-2 blockers fixed and mutation-proven.

Both findings were fair, and the first one is the uncomfortable one: **I reintroduced the exact
defect I was fixing, one line below the fix.** `toContain('7')` was satisfied by `037007.XXX`; my
replacement `/\bTWO\b|\b2\b/i` was satisfied by the `2` in the story ids `(rb1-2)` / `(rb4-2)` — in
the very commit whose message says "numbers are now matched to their CLAIM, never merely present."

And my *first* repair of it leaked too: `/\b(two|2)\b.{0,40}lines/` is satisfied by "those **two**
differ in exactly SOME lines", where the leading "two" means the two *modules*, not the line count.
I only caught that because I re-ran the Reviewer's mutation instead of assuming my fix worked.

The rule that actually holds: **a number is only a claim when it is adjacent to the noun it
quantifies.** Now `/\b(two|2)\b\**\s+lines\b/`, proven against three separate corruptions — count
removed, count wrong, word replaced.

**The stateful-regex bug** was real and worse than it looked: `/g` + `.test()` resumes from
`lastIndex`, so three decoy-bearing files return `true / false / true`. The gate keeping the decoy
out of `src/` — one of the few that runs in CI — was correct only by accident of directory order.
My own round-2 mutation passed only because `timing.ts` and `scoring.ts` have other files between
them. Split: `matchAll` requires `/g` (and clones, so it is safe); `.test()` must not have it.
Proven with two **adjacent** offending files; both are now caught.

| Mutation (CI mode, no quarry) | Result |
|---|---|
| Strip every "TWO" from the trap header | fails |
| Drop the count from the claim | fails |
| Wrong count ("THREE lines") | fails |
| Two **adjacent** src files name the decoy | both caught |
| Round-1 regressions (9 lines, `$40`, stale `:620`, reworded depth, gutted LOD) | all still fail |

**Handoff:** back to Reviewer (Immortan Joe).

## Dev Assessment (round 2 — Reviewer findings addressed)

**Status:** GREEN — **897/897**, `tsc` clean. Both blocking findings fixed, all four non-blocking
fixed. No doc changes were needed: the Reviewer was right that the doc is correct and the *guard*
was not.

Both blocking findings were fair, and I want to be plain about the first one: the test that was
supposed to make "a number nobody re-verified" impossible forever **contained a number nobody
re-verified**. `toContain(String(7))` was satisfied by `037007.XXX`. A doc claiming NINE differing
lines passed 25/25. That is the story's own thesis, failing inside its own enforcement.

### The fix is one idea, not six patches

Every ROM fact now lives **once**, in a `ROM` object, and two gates hold it down:

1. **`the byte-of-record` group** re-derives every constant from the real Atari source — line count,
   radix switches, each symbol's definition line, the diff counts, the watchdog byte, DRNPIC's
   branch — and fails if any is wrong. So no number in the file is one a human typed. It needs the
   quarry, so it skips in CI.
2. **Every doc-side and src-side group** asserts the doc against those constants, needs no quarry,
   and therefore **runs on every push**.

That split is the answer to blocking #2. Previously the doc-side greps sat inside source-gated blocks
purely because they had a source-derived sibling. **CI enforcement: 5 tests → 20.**

### Mutation-proven, in CI mode (no quarry) — the guards actually bite

| Planted lie | Result |
|---|---|
| Claim "**9** lines" (the Reviewer's exact proof) | fails |
| Watchdog written `$40` (evaded the old regex) | fails |
| Lowercase decoy `r2bron.mac:520` in `src/` | fails (3 tests) |
| `timing.ts` reverted to the stale `:620` | fails |
| Reworded depth claim ("level of detail by depth") | fails |
| Bit-naming stripped from the §7 retraction | fails |

The last one proves the scoping fix: §6's unrelated `**D4-D7** explosion level` can no longer vouch
for §7's retraction. Two of my first mutation attempts *didn't* fail — I checked, and both were
botched mutations (a `sed` that matched nothing; a "gutted" passage that still quoted the ROM's own
`;D4=0` comment), not holes in the guards. Worth stating, because "the mutation didn't fail" is
exactly the moment you can fool yourself.

### The two rules now written into the file's header, because they generalise

- **Assert a claim where it is made.** Scope to the passage; a stray token elsewhere must not vouch.
- **Ban the claim, not the phrase.** `/distance LOD/i` blocks two words, not a falsehood.

### Design Deviations

None new. The `ROM` constants object is the natural consequence of the Reviewer's two findings, not a
departure from spec.

### Delivery Findings

- No new upstream findings.

**Handoff:** back to Reviewer (Immortan Joe) for re-review.

## Dev Assessment (round 1)

**Status:** GREEN — **894/894 passing**, `tsc --noEmit` clean. All 18 RED tests now pass; no
regressions (the other 876 were green before and are green now).

**No production code was written.** The whole checker lives in TEA's test file, so GREEN means the
prose and the comments were actually corrected. Files touched: the findings doc (+184/−97) and six
`src/core/*.ts` comment blocks.

### The key decision: shifting a citation is a coordinate transform, not a re-reading

CRLF line `N` and LF line `N + off(N)` are **the same line of source** — the sibling merely glues each
form-feed page break onto the following `.SBTTL`. So shifting a stale citation by its band offset
reproduces exactly the bytes the original author was looking at. That let me correct 41 decoy
citations and 17 stale RBARON ones mechanically, without re-interpreting a single claim.

**The trap I had to avoid:** *not every citation was stale.* rb4-1 fixed 36 `src/` citations against
the correct LF copy already (they are the ones carrying `RADIX` annotations). A blanket shift would
have **broken every one of them**. I classified each citation — resolves as-is / only when shifted /
ambiguous — and moved only what I could prove was stale: the R2\* citations (all pre-rb4-1) and
`timing.ts`'s two `:620`s. Everything rb4-1 touched was left alone. Doc citations resolving to a
claimed symbol went from 51% → 78%; the residue is oracle noise (a radix-table row citing
`RBARON.MAC:74`, which is `.RADIX 16` — a line with no symbol to match), which is precisely the gap
rb4-14 exists to close with `verbatim`.

### What the doc now says that it did not

- A delimited `<!-- decoy-trap -->` header whose **every number is derived from the source by the
  test** — 7 differing lines, all checksum bytes; the TWO R2GRND differences; the load map that signs
  itself `RBARON`. It cannot be satisfied by typing a number nobody re-read, which is how this whole
  mess started.
- The radix rule **once**, with the region table and the lone decimal island `:6217-6280`.
- A line-number warning: the citations are counted against the LF byte-of-record, and **no constant
  offset** converts from the CRLF copy.
- The watchdog at `CALFLG ≥ 3` (`RBGRND.MAC:197`, `CMP I,3`), with the 21× error named and explained.
- §7's model-select claim **retracted**, with `DRNPIC`'s actual branch quoted.

### Design Deviations

None. TEA's four deviations (the `7`-not-`14` count, the narrow AC6 reading ruled by the user, the
derived-definition-line approach, and the `decoy-trap` markers) were all encoded in the tests; I
implemented to them exactly.

### Delivery Findings

- No new upstream findings. TEA's six stand, and rb4-12 / rb4-13 / rb4-14 are now filed against them.
  `biplane.ts`'s `LOD_DISTANCE` is left **in place but relabelled** — its comment now says plainly that
  it is our divergence and not a citation, and names rb4-13 as its retirement. Changing the behaviour
  here was out of scope and would have been a silent gameplay change on a doc story.

**Handoff:** To Reviewer (Immortan Joe).

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `red-baron/tests/audit/source-citations.test.ts` — the citation gate for the findings doc and the
  `src/` comments that cite it. Source-side groups DERIVE the truth from the quarry (symbol
  definition lines, diff counts, verbatim bytes) instead of trusting a typed number; doc-side and
  `src/`-side groups need no quarry and run in CI.

**Tests Written:** 25 tests covering all 6 ACs
**Status:** RED — **18 failing, 7 passing, 0 errors.** Full suite: 894 tests, the 18 new failures
are the only ones; the other 876 stay green (no collateral damage).

The 7 passing tests are deliberate: they are the **byte-of-record anchors** that pin the truth Dev
must write into the doc (the quarry fingerprint, its tamper-rejection, `CALCNT` at :621, the shipped
`CMP I,3` watchdog, the three radix switches, `DRNPIC`'s orientation branch). They are not vacuous —
the tamper test reconstructs the CRLF sibling's defect in memory and asserts the fingerprint
*rejects* it, so the guard is proven to bite rather than decorate.

### What the investigation actually found

The story's framing is right but its mechanism is wrong, and the difference changes the fix.

**1. The off-by-one is not a typo — it is the wrong copy.** Two checkouts of the quarry exist and
they disagree about line numbers. The citable one (`~/Projects/red-baron-source-text`, LF, md5
`497db9…`) renders each form-feed page break as its own line. The CRLF sibling (md5 `27cdfe…`) glues
`\x0c` onto the following `.SBTTL`, so it is **8 lines short**, and the shortfall accrues in a
**staircase**: +0 below line 263, +1 through 724, +2 through 1654, … +8 past 5963. `CALCNT` really is
at :621 and the doc really does say :620 — but `SHLAUN` is off by five and the vertex table by eight.
**No constant offset repairs these citations.** And the copy the doc's own header names as its
source — `reference/red-baron/` — is the CRLF sibling. The root cause is still on disk.

**2. R2BRON is not the poison; R2GRND is.** `R2BRON.MAC` is byte-identical to `RBARON.MAC` except for
**7 lines, every one a ROM self-test checksum byte**. That is precisely what makes it lethal: cite
`R2BRON.MAC:NNNN` and you get the right text at the right line, so the citation "verifies". The lie
enters through `R2GRND.MAC` — the ground module R2BRON's load map *links* — which differs from the
shipped `RBGRND.MAC` in exactly two lines: `FRMECNT=4→5` (62.5 Hz → 50 Hz) and **`CMP I,3` → `CMP
I,40`**. The doc's header declares the builds differ in "one substantive value", and then imports the
other one: it claims the watchdog trips at `CALFLG >= 0x40` (64) when the shipped build says 3.
Off by 21×, sourced from a build that never ran. The doc talked itself past the trap.

**3. AC5 is confirmed at the source.** `DRNPIC: LDA PLSTAT+6 / AND I,10` — and in a `.RADIX 16` region
that `10` is `0x10`, bit D4. The 29-point `.DRPNT` drone model is selected on **orientation**
("PLANE ROTATED"/"FACING AWAY"), not distance. No depth compare exists in the picture path. The doc's
own tag already conceded "LOD reading inferred" — a guess that got promoted to authority and grew
into `biplane.ts`'s `LOD_DISTANCE`.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) / status |
|---|---|
| #1 type-safety escapes (`as any`, `@ts-ignore`, `!`) | none used; `tsc --noEmit` clean |
| #4 `??` vs `||` on falsy-but-valid | `??` used for both defaults (`RED_BARON_SOURCE_DIR`, `glued[i+1]`) |
| #2/#3/#5 generics, enums, module decls | N/A — the suite declares no types, enums, or exports |
| Test quality — no vacuous assertions | self-checked: every test asserts a value, not `is_some`/`let _`; the one "always-true-today" test (`states the radix rule ONCE`) is a real constraint Dev can break |
| Guard proven to bite | `the fingerprint REJECTS a form-feed-glued copy` — tampering test, not decoration |

**Self-check:** 0 vacuous tests found. Dev writes **no production code** — the whole checker lives in
the test file, so GREEN means the doc and the comments were actually fixed.

**Two rulings needed before GREEN** (see Delivery Findings): AC2's "14 lines" is really 7, and AC6's
literal reading is 124 comments across 21 files, not 3 points.

**Handoff:** To Dev (The Word Burgers) for GREEN.

## Sm Assessment

**Setup complete. Handing to TEA (Imperator Furiosa) for RED.**

- **Repo:** red-baron · **Branch:** `fix/rb4-2-retract-poisoned-doc`, cut from an
  up-to-date `origin/develop` (rb4-1 landed as squash-merged PR #22; no open PRs block).
- **Story context:** `sprint/context/context-story-rb4-2.md` — read it before writing a
  single test. It names the shipped-vs-decoy build list, the CRLF line-count trap, the
  radix rule, and the six `src/` files already infected with `R2BRON` citations.

**What I found during setup that the story text understates.** The story says the doc is
cited "in code comments across src/". It is worse: the *decoy build name itself* has been
copied into `topology.ts`, `blimp.ts`, `lives.ts`, `flight.ts` and `enemy.ts` — thirteen
citations to a build that never shipped. `timing.ts:18` carries the off-by-one
(`RBARON.MAC:620`; CALCNT is `:621`). A blind `R2BRON` → `RBARON` rename would launder the
decoy into the ship build and satisfy the grep while keeping the lie; the two builds
genuinely differ. Every citation must be re-resolved against
`reference/red-baron/RBARON.MAC` by symbol, at the correct line.

**The seam I want tested.** This is a doc story on a `tdd` workflow, which only pays if
the test outlives the fix. The durable asset is an executable **citation checker**: resolve
every `FILE.MAC:NNN` in the doc and in `src/` comments against the vendored source, assert
the named symbol is on that line, and assert no `R2*` build is referenced anywhere. That
turns "the doc is true" into something that fails the next time someone cites the decoy —
which is the whole point of the story ("until it is fixed it will re-infect every future
Red Baron story"). Shape is TEA's to design; I am not prescribing the implementation.

**One boundary I did not resolve — TEA must.** AC5 retracts the doc's "distance LOD" claim
(the ROM selects the plane model on `PLSTAT+6` bit `0x10`, with no distance test in the
picture path). But `src/core/biplane.ts` still *implements* a distance LOD — `LOD_DISTANCE`
was re-derived under rb4-1's Reviewer finding 4, so it is no longer the invented `1500`.
My read: this story retracts the false ROM *claim* and stops the code citing it as
authority; ripping out the *behaviour* is a separate story. Confirm that before you write
tests against `biplane.ts` behaviour, and file a Delivery Finding if you disagree.