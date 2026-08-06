---
story_id: "jt9-30"
jira_key: "jt9-30"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-30: Comment-body <file>.ts:<line> refs in the joust suite become symbol refs — 86 distinct refs across 30 test files; the 283 JOUSTRV4.SRC citations are OUT of scope

## Story Details
- **ID:** jt9-30
- **Jira Key:** jt9-30
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p3
- **Branch:** main
- **PR:** none (trunk-based; commits b591f64, 771cf3c, dc35794 landed on main as edf1299)

## Description

Descoped out of jt9-2 on 2026-08-02 by SM, with the user's decision, after measurement.

jt9-2 carried a Reviewer finding from jt8-3 — "comment-body enemy.ts:<line> refs go stale every time the file grows" — naming two sites: audio-flap.test.ts:536 ("enemy.ts:540") and difficulty-wiring.test.ts:27 ("enemy.ts:115/118"). BOTH ARE ALREADY FIXED, by uf1-9, and there are now ZERO enemy.ts:<number> refs anywhere in the joust suite.

What IS live is the finding's PRINCIPLE, at a scale jt9-2's 2 points never covered: 86 distinct <our>.ts:<line> refs across 30 joust test files (102 occurrences).

**MEASURED 2026-08-02 from plugins/joust/tests:**
- grep -rhoE '\b[a-z0-9-]+\.ts:[0-9]+' *.test.ts | sort -u | wc -l   → 86 distinct
- same without sort -u                                               → 102 occurrences
- grep -rlE '\b[a-z0-9-]+\.ts:[0-9]+' *.test.ts | wc -l              → 30 files

**HARD EXCLUSION:** The 283 ROM citations of the form JOUSTRV4.SRC:<line> (and .MAC/.SRC generally) are OUT OF SCOPE and MUST NOT be converted.

**TWO TRAPS THIS STORY MUST NOT FALL INTO:**
1. Not every <our>.ts:<line> occurrence is a COMMENT-BODY ref. Some sit inside assertion strings or in code that reads a source file and pins a line deliberately.
2. A ref being present does not make it stale. Decide up front whether to convert ALL comment-body refs on principle or only demonstrably-stale ones.

## Acceptance Criteria

- [ ] All 86 distinct comment-body refs are classified and categorized
- [ ] Decision made: convert ALL comment-body refs on principle OR only demonstrably-stale ones
- [ ] Decision and rationale documented in findings before RED
- [ ] Staleness criterion is explicit in ACs (e.g., 87% already stale per jt9-38 sampling)
- [ ] All refs within scope are converted using symbol names rather than line numbers
- [ ] No JOUSTRV4.SRC:.../\*.MAC/\*.SRC refs are converted (hard exclusion verified)
- [ ] Prior-art template from uf1-9 is followed: symbol name + historical note where line number carried information
- [ ] Re-measure counts at fix time; verify 86 distinct / 102 occurrences / 30 files
- [ ] All test files pass after conversion
- [ ] No regression in sprint YAML refs (scope decision needed: does this extend to sprint YAML?)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T14:51:13Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T14:19:13Z | 2026-08-06T14:21:01Z | 1m 48s |
| red | 2026-08-06T14:21:01Z | 2026-08-06T14:27:35Z | 6m 34s |
| green | 2026-08-06T14:27:35Z | 2026-08-06T14:36:26Z | 8m 51s |
| review | 2026-08-06T14:36:26Z | 2026-08-06T14:51:13Z | 14m 47s |
| finish | 2026-08-06T14:51:13Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Improvement][non-blocking]** COUNTS RE-MEASURED at RED (2026-08-06), drifted upward from the filing: **145 occurrences / 121 distinct / 41 files** (filed 2026-08-02: 102 / 86 / 30). ROM cites also grew 283 → **384**. The regrowth (jt9-38 + siblings kept adding refs) is itself the case for a PERMANENT guard rather than a one-time sweep — which is what shipped.
- **[TEA][Improvement][non-blocking]** Trap #2 (deliberate line-pins inside assertion strings / source-reading code) does NOT materialize in the live tree: `grep -vE ':[0-9]+:\s*(//|\*|/\*)'` over all matches returns EMPTY — every one of the 145 occurrences is a pure comment-body ref. Dev can convert on principle without per-occurrence classification. If Dev finds an in-string pin during GREEN, treat it as a deliberate pin and leave it (and tell the guard: it scans whole text, so such a pin would redden — flag it back to TEA/Reviewer, do not blindly delete).
- **[TEA][Gap][non-blocking]** SPRINT/EPIC YAML carries the same `<file>.ts:<line>` rot, where no gate can ever catch it. This story is scoped to **test comments only** (AC added). If the owner wants the YAML rot fixed, it needs a filed FOLLOW-UP story — flagging per the "descoped findings must be filed" rule so SM/owner decides at finish rather than dropping it.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

Routing jt9-30 into RED (TEA). This is a maintenance/citation-hygiene story, not a sim change — no core/shell boundary risk, but three routing hazards the ACs must resolve BEFORE any conversion:

1. **Re-measure first.** The 86 distinct / 102 occ / 30 files counts were taken 2026-08-02 and the story itself warns the drift rate is *hours*. TEA must re-run the three greps against the live tree and pin today's numbers as the RED fixture — do not inherit the filed counts.

2. **The scope decision is the story's, and it's already been answered by the story text — make it an explicit AC, don't re-litigate it.** jt9-38's GREEN sampling (2026-08-03) found ~87% of the checkable demo.ts refs already stale, so the story's own open question 2 resolves to *convert ALL comment-body refs on principle*, not classify-then-convert. TEA states that in the ACs.

3. **Two hard traps carried from the filing:**
   - JOUSTRV4.SRC / *.MAC / *.SRC citations are the repo's citation idiom, pinned by the citation gates — converting one is an active regression. The RED guard must assert these are UNTOUCHED (a control), not just that .ts refs shrank to zero.
   - Not every `<our>.ts:<line>` is a comment-body ref — some are deliberate line-pins inside assertion strings / source-reading tests. Classify occurrence-by-occurrence; a deliberate pin is not a stale comment.

4. **Sprint-YAML scope:** the story flags that the same rot lives in STORY/EPIC YAML text where no gate can catch it, and explicitly leaves it to this story to decide in/out. Current scope reads *test comments only*. TEA: make that boundary an explicit AC (recommend: hold YAML out of this 3pt story, file a follow-up if the user wants it — descoped findings must be filed, not dropped).

No branch (trunk-based). Next: TEA / RED.

## Tea Assessment

RED committed (b591f64). One new guard file: `plugins/joust/tests/comment-line-refs.test.ts`.

**RED state — isolated:** full joust project runs `1 failed | 2920 passed` (141 files). The single failure is the completeness assertion; the three regex-semantics tests and the ROM-preservation control all PASS. Nothing else broke.

**What the guard asserts (four tests):**
1. `MATCHES a contiguous <our>.ts:<line> ref` — non-vacuity, synthetic inputs (`demo.ts:1109`, `game.ts:374`, `src/shared/audio.ts:69`, `audio-flap.test.ts:244`).
2. `does NOT match a ROM citation` — synthetic `JOUSTRV4.SRC:5544`, `JOUSTI.SRC:12`, `EQU.SRC:111`, `JOUSTX.MAC:900`. Hard exclusion, by EXTENSION.
3. `does NOT match the detached historical-note form or a bare ROM line` — `enemy.ts (:115/:118 -> :266/:273)`, `enemy.ts's …`, `:5544`. Keeps the uf1-9 template legal.
4. `no comment-body <our>.ts:<line> reference survives` — **the RED assertion.** Scans every `*.test.ts` (excluding self), emits a `file:line  ref  | source` list of all 145 offenders. GREEN when zero remain.
5. ROM-preservation control — asserts the suite still carries >300 `*.SRC`/`*.MAC` cites (384 measured). Reddens if GREEN deletes/converts ROM cites.

**Scope decision (baked into the ACs, per the story's own resolution):** convert ALL comment-body refs on PRINCIPLE (line numbers are never stable anchors; ~87% already stale per jt9-38), NOT classify-then-convert.

**GREEN instructions for Dev (Julia):**
- Convert each `<file>.ts:<line>` comment ref to name the SYMBOL. Where the line number carried information, keep it as a DETACHED historical note (`file.ts … (:NNN -> :MMM)` or bare `:NNN`), NOT glued to `<file>.ts:` — the guard's regex requires the colon to abut the extension, so detached forms are legal.
- Prior art / template: uf1-9's edits to `audio-flap.test.ts` and `difficulty-wiring.test.ts` (symbol name + parenthetical historical note).
- **DO NOT touch any `*.SRC` / `*.MAC` citation** — that's the immutable ROM idiom; the control test enforces this.
- 145 refs across 41 files. `git grep -nE '\b[a-z0-9-]+\.ts:[0-9]+' plugins/joust/tests/*.test.ts` (exclude `comment-line-refs.test.ts`) is the worklist; the guard's failure message lists all offenders too.
- Refs that point at OTHER test files (`audio-flap.test.ts:244`, `demo-jt8-4-source.test.ts:25-26`) are in scope too — name the describe/it or the phenomenon, drop the line.
- The README `--project joust` file count was bumped 140 → 141 for the new guard file (census stays green); leave it at 141.

**Rule Coverage:**
- Language: TypeScript. `.pennyfarthing/gates/lang-review/` checklist reviewed — this is a documentation/comment-hygiene story with no runtime types, constructors, error paths, or new public API, so most language checks (validated constructors, error propagation, type-design) have no surface here.
- The one applicable meta-rule — **test non-vacuity** — is enforced against the guard itself: three synthetic-input tests prove the regex is neither always-true nor always-false and correctly discriminates the three cases (in-scope ref / ROM cite / historical note). The RED assertion emits offenders (fails on real content, not on a spelling ban).
- Citation-gate rule (repo-specific): the ROM-cite corpus is protected by a live control, so a GREEN that damaged the primary-source idiom reddens.

Next: Dev / GREEN.

## Dev Assessment

GREEN committed (771cf3c). RED was b591f64.

**What I did:** A single uniform transformation across the 41 in-scope test files — remove the contiguous volatile suffix from every `<name>.ts:<line>` ref (`s{(\b[a-z0-9-]+\.ts):\d+(?:[-/,]\d+)*}{$1}g`), leaving the symbol the comment already names right beside it. 145 occurrences → 0. This was safe to do uniformly because TEA's finding held: **every one of the 145 was a pure comment-body ref** — zero occurred in code or assertion strings — so there were no deliberate line-pins to preserve. In the vast majority the symbol is already named in-sentence (`const PRIORITIES` (`src/shell/audio.ts`), `nextWaveBcd` (`demo.ts`, …), `homingWake` (`enemy.ts`)), so dropping the number yields exactly the symbol-anchored form the story's template asks for.

**Boundaries held (all verified):**
- ROM cites `*.SRC`/`*.MAC`: 384 before and after — regex keys on the lowercase `.ts` extension, so uppercase ROM idioms never matched.
- Bare ROM colon-refs (`joust.ts ↔ :4961`, `flight.ts ← :7617+`): the `:NNN` detached from a `.ts` is not matched — preserved.
- `.json:<line>` claim refs (jt5-7 census block): different extension — untouched.
- One readability polish by hand: jt5-7-flap-wording `(seven)` → `(seven occurrences)` (the count was the information the line-list carried).

**Verification:**
- `npx vitest run --project joust` → **141 files / 2921 tests pass** (guard green, census green after the RED-phase README bump).
- `npm run lint` (tsc --noEmit, repo-wide) → clean.
- `npm run test:orchestrator` → 2 failures, **both pre-existing and unrelated**: `audit/star-wars resolves to a reachable commit` / `… serve blobs`. The `audit/star-wars` tag is absent in THIS local checkout (`git rev-parse audit/star-wars^{commit}` → unknown revision; the audit commit object isn't present). Proven pre-existing by re-running with my change stashed — identical two failures. This is the shallow-checkout / missing-audit-tag artifact documented in CLAUDE.md; CI fetches depth 0 with the tags and passes. **NOT introduced by this story.**

**Not in my commit:** `sprint/epic-jt9.yaml` (jt9-30 backlog→in_progress, from setup) and `sprint/epic-mc2.yaml` (a cosmetic `type: chore` key reorder from pf round-tripping the YAML) are modified in the working tree by pf tooling, not by me — left unstaged for SM/finish to handle.

**For Reviewer:** the diff is 141 insertions / 141 deletions, all comment lines. Spot-check that (a) no symbol name was lost where the number was the only anchor, (b) no `*.SRC`/`*.MAC` was touched (the control test enforces this), (c) the guard is non-vacuous (three synthetic-input tests). Follow-up flagged: sprint/epic YAML rot is out of scope and needs its own story if wanted.

Next: Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2921 joust pass, lint clean, orchestrator only 2 known star-wars failures, 0 code smells, 0 surviving refs, ROM corpus preserved) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 2 LOW non-blocking (own adversarial pass), 0 deferred

Because 8 of 9 specialists are disabled, I ran my own **adversarial mutation battery** in their place (per the known reviewer-subagents-disabled posture):
- **M1 (coverage):** enumerated nested test files — found `tests/audit/citations.test.ts`, which the guard's flat `readdirSync` does NOT scan. Checked it for in-scope refs → **none** (only 6 ROM cites). Harmless today; latent gap → LOW-1.
- **M2 (non-vacuity):** reintroduced `demo.ts:9999` into a non-self file → guard **reddened** with a precise `file:line ref | source` message; reverted. The assertion is live (RED 145 → GREEN 0 already proved it distinguishes states).
- **Hard-exclusion integrity:** diffed every `-/+` line carrying a `.SRC`/`.MAC` cite → the ROM cite is byte-identical on both sides in all 3 mixed-line cases; only the co-located `.ts:line` was dropped. Zero ROM bytes changed.
- **Coupling:** ~10 audio tests read sibling `.test.ts`/README source, yet the full suite passes (2921) — no assertion was coupled to the rewritten comment text.

## Reviewer Assessment

**Verdict: APPROVE**

Scope: 43 files (b591f64 RED + 771cf3c GREEN) — one new guard test + 41 comment-only conversions + a 1-line README census bump. No runtime/source code changed; the diff is 141 insertions / 141 deletions, all comment lines.

**Observations (≥5):**
- `[VERIFIED]` Guard is non-vacuous — evidence: M2 reintroduced `demo.ts:9999` and `comment-line-refs.test.ts:103` reddened; the RED→GREEN transition (145→0) is recorded in the phase history. Not a spelling ban — it scans real content and emits offenders.
- `[VERIFIED]` Hard exclusion (story boundary 1) holds — evidence: `git diff b591f64..HEAD` shows every `.SRC`/`.MAC` cite byte-identical; count unchanged (`audio-thud.test.ts` 1→1). The regex keys on the lowercase `.ts` extension, so ROM idioms are categorically unmatchable — proven by the guard's own test 2 (synthetic `JOUSTRV4.SRC:5544`, `JOUSTI.SRC:12`, `JOUSTX.MAC:900` → not matched).
- `[VERIFIED]` Detached historical-note form preserved (story boundary 2) — evidence: guard test 3 asserts `enemy.ts (:115/:118 -> :266/:273)` and bare `:5544` are NOT matched; `steering-source.test.ts` `flight.ts ← :7617+` survives in the diff.
- `[VERIFIED]` No symbol lost — evidence: sampled conversions keep the in-sentence symbol (`const PRIORITIES` (`src/shell/audio.ts`), `nextWaveBcd` (`demo.ts`, …), `(joust.ts ↔ :4961) -> enemy-thud (SNETHD)`). The handful with no adjacent symbol name the module itself (`main.ts prints …`), which remains a valid anchor.
- `[VERIFIED]` Census integrity — evidence: README `--project joust` count bumped 140→141 in the RED commit; `audio-seam-scope.test.ts` passes. `.json:<line>` claim refs left untouched (different extension, out of scope).
- `[PREFLIGHT]` No regressions — 2921/2921 joust pass, lint clean, no code smells; orchestrator's only 2 failures are the pre-existing `audit/star-wars` tag-absent artifact (proven pre-existing by stash re-run; unrelated to this diff).
- `[LOW-1]` **Guard coverage gap** at `comment-line-refs.test.ts:59` (`readdirSync(testsDir)`, non-recursive): a future ref added to `tests/audit/citations.test.ts` or any new nested test dir would bypass the guard. Currently harmless (no in-scope refs there) and scope-correct (the story's ACs/counts were all flat `*.test.ts`), but it weakens the guard's stated durability purpose. **One-line fix:** mirror `audio-seam-scope.test.ts`'s recursive `walk()` instead of a flat `readdirSync`. Non-blocking; recommend as a quick in-story hardening or a filed follow-up.
- `[LOW-2]` **ROM control floor is loose** at `comment-line-refs.test.ts` (`toBeGreaterThan(300)` with 384 actual): up to ~84 ROM cites could be deleted without reddening it. Mitigated — the regex-discrimination test (test 2) already makes wholesale ROM conversion impossible via this story's mechanism, so the floor is belt-and-suspenders, not the primary defense. Non-blocking.

**Rule Compliance:** TypeScript. The lang-review checklist's runtime rules (validated constructors, error propagation, type invariants, tenant isolation, security/injection, silent-failure) have **no surface** — the change is comment text plus one read-only guard with no I/O beyond `readFileSync`/`readdirSync` on the local test tree, no user input, no auth. The one applicable meta-rule — **test non-vacuity** — is satisfied and independently re-verified (M2). Repo citation-idiom rule (ROM `.SRC`/`.MAC` are immutable primary source) — complied with and mechanically enforced.

**Devil's Advocate:** Could this diff be quietly broken? The strongest attack is that a "convert everything" sweep destroys information a line number carried — but the guard's regex only strips the *contiguous* `:NNN` and the comments overwhelmingly name their symbol in-sentence, so what's removed is the redundant, provably-stale (~87%) part; where a number was informational (jt5-7's seven-occurrence tally) it was re-expressed as prose, not deleted. Could it have touched a ROM citation and passed anyway? No — the exclusion is by extension at the regex level and confirmed byte-for-byte in the diff. Could a coupled test that greps sibling comment text now fail silently? No — vitest would have surfaced it; 2921 pass. Could the guard be a rubber stamp that passes regardless? M2 disproves it. The real residual weakness is reach, not correctness: the guard polices only the flat tests dir, so the rot it exists to stop could re-enter through a nested test file unseen (LOW-1). That is a durability shortfall, not a defect in what shipped, and it is a one-line fix. Nothing here corrupts data, breaks a build, or ships a wrong behavior. Approve, with LOW-1 recommended for a quick hardening.

### Reviewer (audit)
Design Deviations section is empty — no deviations were logged by TEA or Dev, and I found none undocumented: the conversion followed the story's stated scope and template. The one hand-edit (jt5-7 `(seven occurrences)`) is documented in the Dev Assessment and is a faithful preservation, not a deviation.

**Findings for SM to file at finish (per the "descoped findings must be filed" rule):**
1. sprint/epic YAML `<file>.ts:<line>` rot — explicitly out of this story's scope (TEA finding). **FILED as jt9-55** (chore, 3pt, p3) at finish, per the "descoped findings must be filed" rule.
2. LOW-1 guard coverage gap — **RESOLVED IN-STORY (user chose "harden now").** Fixed in commit dc35794 (R-1): the guard now walks `tests/` recursively; a probe ref planted in `tests/audit/citations.test.ts` is now caught (was silently missed). No follow-up needed.

**Post-review addendum (R-1 hardening applied):** After APPROVE, the user elected to close LOW-1 in-story rather than defer it. The guard's flat `readdirSync` was replaced with a recursive `walkTests()` mirroring `audio-seam-scope`'s `walk()`. Re-verified: guard 5/5 green, nested-file mutation now CAUGHT, full joust suite 141/2921 pass, lint clean. Verdict stands: **APPROVE.** Three commits under this story: b591f64 (RED), 771cf3c (GREEN), dc35794 (R-1).