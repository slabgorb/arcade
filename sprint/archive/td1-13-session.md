---
story_id: "td1-13"
jira_key: "td1-13"
epic: "td1"
workflow: "tdd"
---
# Story td1-13: star-wars citation gate still reads the WORKING TREE — port tempest's tp1-22 audit-commit freeze and retire the re-anchor loop

## Story Details
- **ID:** td1-13
- **Jira Key:** td1-13
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** none (trunk-based — branching skipped)
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T18:07:52Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T17:15:16+00:00 | 2026-08-05T17:18:24Z | 3m 8s |
| red | 2026-08-05T17:18:24Z | 2026-08-05T17:38:02Z | 19m 38s |
| green | 2026-08-05T17:38:02Z | 2026-08-05T17:55:57Z | 17m 55s |
| review | 2026-08-05T17:55:57Z | 2026-08-05T18:07:52Z | 11m 55s |
| finish | 2026-08-05T18:07:52Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **[TEA/red] Gap, non-blocking:** AC-3 (demote `tools/audit/reanchor-citations.mjs` to a health check) is NOT pinned by a RED test — the tool is a CLI-only script with no export seam (86 lines, `--write`/dry-run), and tempest's demoted reference is the same shape. Prescribing an export purely to test it would be over-engineering, and a subprocess test of a git-stateful `--write` tool is brittle. Dev mirrors tempest's demoted header (`plugins/tempest/tools/audit/reanchor-citations.mjs:1-24`); Reviewer confirms the demotion by diff against that reference. Flagged so this is a documented decision, not a silent hole.
- **[TEA/red] Improvement, non-blocking:** the freeze matches `ours` BY TEXT anywhere in the frozen file (tempest `check-citations.mjs:204`, `frozen.lines.some(...)`), NOT at the stored `ours.line` — so `ours.line` becomes decorative. Reconciling a LOST pin means re-baselining its `verbatim` to the text as it stood at 3580752, NOT to HEAD. Re-pointing a quote to the current line would defeat the whole freeze.
- **[TEA/red] Note:** I did not run the full 2028-test star-wars project (disproportionate). Evidence the suite is otherwise green: repo-wide `npm run lint` clean; live `citations` gate 52/52 green (unaffected — checker untouched); `comment-citations` 41/41 green after the ignore-file pragma; freeze file 2 failed / 4 passed (the intended RED). The only change is one isolated test file.
- **Improvement** (non-blocking): three games still read `ours` from the working tree and would benefit from the same freeze — `battlezone`, `centipede`, `joust`. Each needs its own `audit/<game>` tag cut from archived history + the tempest/star-wars checker port. Affects `plugins/{battlezone,centipede,joust}/tools/audit/check-citations.mjs` (freeze `ours` to a pinned audit commit). Fleet count after td1-13: 3 of 6 frozen (tempest, red-baron, star-wars). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking, [RULE] Medium): AC-2's `for (const f of all)` loop (citation-gate-freeze.test.ts:213-225) has 4 `continue`s and no floor assertion on how many findings it actually checked — a future change reclassifying all findings to `remediated_by`/`.MAC` would make it pass vacuously with zero checks. Affects `plugins/star-wars/tests/audit/citation-gate-freeze.test.ts` (track a `checked` counter and assert e.g. `expect(checked).toBeGreaterThan(50)`). Currently non-vacuous — it checks ~96 findings and caught the 26-pin regression — so this is future-proofing, not a live defect. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, [RULE] Low): AC4-ABSENT's assertion `toMatch(/AC4-ABSENT/)` (citation-gate-freeze.test.ts:274) matches only the finding id, which every `checkFindings` error prefixes — it doesn't pin the specific "cannot be frozen"/"absent from the audit commit" message. Affects the same file (strengthen to `/AC4-ABSENT[\s\S]*cannot be frozen/`). The preceding `not.toThrow()` does the real crash-safety check, so this is precision, not vacuity. NB: tempest's citation-gate-freeze.test.ts:224 carries the identical weak assertion. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, [RULE] Low): AC-2's `frozenSet()` (citation-gate-freeze.test.ts:196-210) reimplements the checker's `frozenFileAt()` rather than exercising the production `checkFindings` path. Acceptable because the production frozen path IS covered — AC-1 calls `checkFindings` directly, and the live `citations.test.ts` "every committed findings file passes" runs `checkFindings` over all 173 findings against the frozen checker. Affects the same file (optional: also assert AC-2 via `checkFindings` for defense-in-depth). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, [DOC] Low): stale comment at `plugins/star-wars/tests/core/gun-visibility-and-shape.test.ts:421` — "reddens `citations.test.ts` twice, because it changes gameRules.ts's LINE COUNT and the findings' `ours` citations are re-opened against the working tree". The td1-13 freeze invalidates this: `ours` is now matched by text at the audit commit, so a working-tree line-count change no longer reddens the gate. Affects that file (correct the causal clause). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, [VERIFIED] Low, fleet-wide): the checker's `AUDIT_COMMIT = '3580752'` is a 7-char abbreviation (mirrors tempest's `'4232ed4'`). As the monorepo grows a prefix collision would make `git show 3580752:…` ambiguous → the `frozenFileAt` catch reports every finding's path "absent" → the whole gate reddens falsely. Not introduced by this story (matches the reference convention). Affects `plugins/{star-wars,tempest}/tools/audit/check-citations.mjs` (harden fleet-wide to the full SHA or the `audit/<game>` tag). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Migrated two existing positive fixtures in `citations.test.ts` (X-003, X-021) to quote the audit commit**
  - Spec source: context-story-td1-13.md, AC-4 ("existing negative tests … all still hold")
  - Spec text: the freeze must keep the existing citation tests valid
  - Implementation: X-003 and X-021 built their `ours.verbatim` by reading `gameRules.ts` line 20 from the WORKING TREE and asserting acceptance. Under the freeze that line's current text is absent from 3580752, so both reddened. Changed them to quote the line as it stood at the audit commit via a new `auditLine(file, n)` = `git show 3580752:<file>` helper — the exact pattern tempest's `citations.test.ts` adopted for tp1-22 (`auditLine('src/core/rules.ts', 8)`).
  - Rationale: these were positive-acceptance fixtures coupled to the retired working-tree contract; a "valid `ours`" now means "resolves at the audit commit". Mechanical migration, not new behavior. Negative fixtures (never-shipped, node_modules, non-matching verbatim, NO_COUNTERPART) were untouched and stay green.
  - Severity: minor
  - Forward impact: none — audit-only test file; the two fixtures assert the same property (a well-formed `ours` is accepted) against the new contract.
- **Edited orchestrator test `tests/audit-refs.test.mjs` to add the `audit/star-wars` tripwire**
  - Spec source: context-story-td1-13.md, AC-1/AC-2 (the gate now depends on a reachable audit commit) + the story's step-zero (tag pushed to origin)
  - Spec text: the freeze reads `git show 3580752:<file>`; that blob must stay reachable (as tempest/red-baron's do)
  - Implementation: added `{ tag: 'audit/star-wars', sha: '358075282db3f7b2116ed5016ff61e99cf9f2acd', probe: 'src/core/sim.ts' }` to `AUDIT_REFS`, and updated the header comment (star-wars was frozen by td1-13 from the archived history, not Task 2).
  - Rationale: this test is the tripwire that fails if an audit anchor is dropped/gc'd. star-wars now has the same dependency tempest/red-baron do; leaving it out means a dropped `audit/star-wars` would silently break the gate forever. Required to complete the fleet invariant.
  - Severity: minor
  - Forward impact: none — strengthens the existing tripwire; orchestrator suite green (392/392).

### Reviewer (audit)
- **Dev deviation 1 (migrated X-003/X-021 fixtures to `auditLine`)** → ✓ ACCEPTED by Reviewer: required by the freeze — a "valid `ours`" now means "resolves at the audit commit"; verified the diff touches ONLY the 2 positive fixtures (import + helper), leaving every negative fixture (X-001, X-002, X-020, NO_COUNTERPART) byte-identical. Mirrors tempest's `citations.test.ts` `auditLine` pattern.
- **Dev deviation 2 (added `audit/star-wars` row to `tests/audit-refs.test.mjs`)** → ✓ ACCEPTED by Reviewer: correct and necessary — star-wars now shares tempest/red-baron's reachable-audit-blob dependency; verified the SHA `358075282db3f7b2116ed5016ff61e99cf9f2acd` matches the pushed tag and `probe: src/core/sim.ts` resolves at that commit (tripwire 6/6 green).
- **No UNDOCUMENTED deviations found.** The 26-finding reconciliation is the AC-2 spec, not a deviation; independently confirmed only `ours` changed on exactly those 26, each restored to its audited (3580752) value, none carrying `remediated_by`.

## Dev Assessment

**Implementation Complete:** Yes — all four ACs.

**Files Changed:**
- `plugins/star-wars/tools/audit/check-citations.mjs` — AC-1: froze the `ours` re-open. Added `execFileSync` import, `AUDIT_COMMIT = '3580752'`, and a `frozenFileAt(repoRoot, file)` helper (`git show 3580752:<file>`, throw→returned-error). The final `ours` branch now matches the quote BY TEXT anywhere in the frozen file instead of reading the working tree at `ours.line`. Source side, `node_modules`, `remediated_by`, and `NO_COUNTERPART` branches untouched. Direct port of tempest's frozen checker.
- `plugins/star-wars/docs/audit/findings/*.json` (8 files) — AC-2: restored the `ours` (file/line/verbatim) of 26 findings to their audited (3580752) values. Source: `git show 3580752:docs/audit/findings/*.json` — the findings files were ADDED in that commit, so their original `ours` quotes ARE the audited text by construction. All 26 exist at baseline and resolve by-text; no `ours.file` changed (only line/verbatim re-baselined off HEAD drift, e.g. D-001 `[12288,1024,3,1]`→audited `[12288,1024,3]`). Non-fabricating.
- `plugins/star-wars/tools/audit/reanchor-citations.mjs` — AC-3: demoted to a health check (ported tempest's). Removed `--write`/`writeFileSync`/line-moving; it now reports LOST quotes only and its header no longer instructs re-anchor-after-edit. Runs clean: "96 present in 3580752, 0 lost, 0 skipped."
- `plugins/star-wars/tests/audit/citations.test.ts` — AC-4: migrated 2 positive fixtures to the frozen contract (see Design Deviations).
- `plugins/star-wars/CLAUDE.md` — AC-4: rewrote "The citation gate" section (was "reads the working tree / re-anchor after edits") to describe the freeze, mirroring tempest's CLAUDE.md.
- `tests/audit-refs.test.mjs` — added the `audit/star-wars` reachability tripwire (see Design Deviations).
- **Prerequisite (step zero):** `audit/star-wars` → `358075282db3f7b2116ed5016ff61e99cf9f2acd` was pushed to origin during RED (TEA phase).

**Tests:**
- `star-wars freeze` — 6/6 (AC-1 headline + AC-2 reconciliation now GREEN; guards green)
- `star-wars citations` (live gate) — 53/53
- `star-wars tests/audit` — 199/199
- **Full `star-wars` project — 2310/2310 (205 files)**
- Orchestrator suite — 392/392 (incl. new `audit/star-wars` tripwire)
- Repo-wide `npm run lint` — clean

**Branch:** none (trunk-based — commits land on `main`).

**Handoff:** To Reviewer (Zorg). Note for review: the `git show <rev>:<path>` calls use OLD-repo-root paths (`src/core/sim.ts`) resolved against the frozen commit's own tree — cwd-independent, verified. A `git ls-tree <rev> <pathspec>` (cwd-relative) will mislead; use `git show` for spot-checks. AC-3 is confirmed by diff against tempest's demoted tool, not by a RED test (TEA Delivery Finding).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | green | none (211 tests pass, lint clean, 0 smells, reanchor 0 lost) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — covered manually (see Rule Compliance + findings) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — covered manually (found the gun-visibility:421 stale comment) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — confirmed no injection/traversal (empirical) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 (all in freeze test) | confirmed 3 (1 Medium, 2 Low), dismissed 0 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled as Skipped)
**Total findings:** 3 confirmed [RULE] + 2 confirmed by me ([DOC], [VERIFIED] fleet-obs) = 5 confirmed, all Medium/Low non-blocking; 0 dismissed; 0 deferred

## Rule Compliance

Rules from `plugins/star-wars/CLAUDE.md` (citation-gate conventions) + `.pennyfarthing/gates/lang-review/typescript.md`, enumerated against every changed instance:

- **`ours` frozen to audit commit, matched BY TEXT (line decorative):** COMPLIANT — `check-citations.mjs` ours-branch uses `frozenFileAt()` + `frozen.lines.some((l) => l.trimEnd() === want)`; never keys the compare off `f.ours.line`.
- **Source (ROM) side stays LIVE:** COMPLIANT — the `source` branch still reads `lineAt(join(sourceDir, …))`, untouched by the freeze; AC1-SRC test proves it reddens on a wrong source line.
- **`remediated_by` findings not re-opened:** COMPLIANT — branch unchanged; independently verified none of the 26 reconciled findings carries `remediated_by`.
- **NO_COUNTERPART — two shapes only (null or citation):** COMPLIANT — both branches unchanged; X-004/X-030/X-033 tests still green.
- **`ours` never node_modules:** COMPLIANT — NODE_MODULES check still fires first, ahead of the frozen branch; X-020 negative test intact.
- **Don't re-point a fixed finding's `ours`:** COMPLIANT — all 26 edits are AC-2 re-baselines of drifted quotes to their audited text, none remediated (verified across all 26 ids).
- **TS type-safety (no `as any`/`as unknown`/`@ts-ignore`, `??` vs `||`, catch without `e:any`):** COMPLIANT — both `.ts` files clean (corroborated by rule-checker rules 1,4,11).
- **Tests non-vacuous:** 4 of 6 freeze `it` blocks COMPLIANT (specific message anchors); AC-2 (no floor) and AC4-ABSENT (id-only match) flagged — see findings. Downgraded to Medium/Low with rationale (currently non-vacuous; caught the real 26-pin regression), NOT dismissed.

## Devil's Advocate

Argue this is broken. **1) The frozen quote matches the WRONG line.** The checker matches `ours.verbatim` by text anywhere in the frozen file — so a finding whose quote is a common line (`  }`, a blank line) would match a coincidental occurrence and stay green forever while describing the wrong code. Mitigation verified: I re-derived all 26 reconciled quotes from git and confirmed each equals the *recorded audited* `ours` (the exact line the audit named), and none is blank/whitespace. The by-text laxity is inherent to the tempest design the story ports, not new here. **2) The tag isn't there.** If `audit/star-wars` is ever gc'd or a fresh clone lacks it, `git show 3580752:` throws → `frozenFileAt` catch → every finding reports "path absent" → the gate reddens for ALL findings, a confusing mass failure. Mitigation: the new `audit-refs.test.mjs` tripwire fails loudly if the tag/blob is unreachable, and CI's `fetch-depth: 0` fetches it; a local dev gets tags on normal fetch. **3) A stressed filesystem / missing source dir.** If `STARWARS_SOURCE_DIR` is absent the source-side describe SKIPS (silent pass) — pre-existing, documented, and the CLAUDE.md warns "check it ran." **4) The abbreviated SHA collides** as the repo grows → ambiguous `git show` → false mass-redden. Real latent risk (recorded as a fleet-wide finding), but mirrors tempest and is guarded by the tripwire. **5) A confused future dev** re-runs `reanchor-citations.mjs --write` expecting it to fix drift — but `--write` no longer exists, so nothing happens and they must re-baseline by hand; the CLAUDE.md and the tool header now say exactly this. **6) The AC-2 guard rots vacuous** if findings are later all remediated/`.MAC` — the one genuine Medium here (no floor assertion). None of these is a correctness defect in the shipped checker or data; the worst realistic outcome is a loud, self-announcing failure or a future test-rot, both recorded.

## Reviewer Assessment

**Verdict:** APPROVED

**Specialist coverage:** PREFLIGHT green, [SEC] clean, [RULE] 3 findings (all Medium/Low, confirmed), plus [TEST] and [DOC] covered manually (their subagents were disabled). Tags used: [SEC] [RULE] [TEST] [DOC] [VERIFIED].

**[SEC] finding:** none — reviewer-security returned clean: `git show <rev>:<path>` is tree-scoped and rejects traversal (verified empirically), `execFileSync` argv-array blocks shell/option injection, catch blocks hide nothing security-relevant.

**Findings (all Medium/Low — none blocks; Blocking Rule requires Critical/High):**

| Severity | Issue | Location | Recommended fix |
|----------|-------|----------|-----------------|
| [RULE] Medium | AC-2 loop can filter to zero checks with no floor assertion — future vacuity risk | citation-gate-freeze.test.ts:213 | assert a checked-count floor (`>50`) |
| [RULE] Low | AC4-ABSENT `toMatch(/AC4-ABSENT/)` pins only the id, not the "cannot be frozen" message | citation-gate-freeze.test.ts:274 | anchor the message too |
| [RULE] Low | AC-2 `frozenSet()` reimplements the checker instead of exercising `checkFindings` (prod path covered by AC-1 + live gate) | citation-gate-freeze.test.ts:196 | optional defense-in-depth |
| [DOC] Low | stale comment: freeze invalidates its working-tree blast-radius claim | gun-visibility-and-shape.test.ts:421 | correct the causal clause |
| [VERIFIED] Low | 7-char `AUDIT_COMMIT` abbrev — latent prefix-collision risk fleet-wide (mirrors tempest) | check-citations.mjs (+ tempest) | harden to full SHA/tag |

**Data flow traced:** `f.ours.file`/`.verbatim` (committed findings JSON) → `git show 3580752:<file>` (execFileSync argv-array, tree-scoped, traversal rejected by git — SECURITY confirmed empirically) → by-text set membership → error string or []. Safe: no shell, no filesystem escape, pinned commit constant.

**Pattern observed:** faithful port of tempest's tp1-22 freeze (`check-citations.mjs` frozenFileAt + by-text; `reanchor` demoted to health check; `citations.test.ts` `auditLine` fixture migration) — the story's "port, don't re-derive" instruction was followed. Reconciliation verified non-fabricating: all 26 `ours` restored to their recorded audited values (independent git re-derivation), only `ours` changed, none remediated.

**Error handling:** `frozenFileAt` catch (check-citations.mjs:62) converts a thrown `git show` into a returned error string, never a crash — pinned by the AC4-ABSENT `not.toThrow()` test.

**Verification:** star-wars audit 199/199, freeze 6/6, live citations 53/53, full star-wars project 2310/2310, orchestrator 392/392, lint clean — all re-confirmed on the rebased HEAD.

**Recommendation:** the two cheap test-hardening asks (floor assertion + AC4-ABSENT message pin) and the one-line stale-comment fix are worth folding into finish or a trivial follow-up, but none blocks the merge.

**Handoff:** To SM for finish-story.

## Tea Assessment

**Prerequisite (step zero) DONE — user authorized (source: archived repo).** The audit baseline
is `358075282db3f7b2116ed5016ff61e99cf9f2acd` (`3580752`) — `chore(audit): land primary-source
fidelity rig — 173 findings` (star-wars #90), the exact analog of tempest's `4232ed4`, confirmed
by `--diff-filter=A` (it ADDED the findings). Fetched from archived `slabgorb/star-wars` develop
and pushed to origin as lightweight tag **`audit/star-wars` → 3580752** (matches the
`audit/tempest`/`audit/red-baron` convention; CI `fetch-depth: 0` keeps the blob reachable).
Old-repo-root paths resolve there (`git show 3580752:src/core/sim.ts` → 1195 lines).

**RED state — verified directly (2 failed / 4 passed).** New file
`plugins/star-wars/tests/audit/citation-gate-freeze.test.ts` (a faithful port of tempest's
`citation-gate-freeze.test.ts`). Committed `e020abbe`, pushed to `main`.

| Test | AC | State | Why |
|------|----|-------|-----|
| AC-1 headline: frozen `ours` line does NOT redden | AC1 | **RED** | current checker reads the WORKING TREE (`check-citations.mjs:155`) — mismatches the frozen quote and reddens. Failure captured: cited `"…bolts fly down the aim direction…"` vs working `"…LASER is a hitscan beam…"` — the honest working-tree-vs-frozen split, NOT a git error. |
| AC-2 reconciliation: every non-remediated `ours` resolves by-text at 3580752 | AC2 | **RED** | 26 pins were re-anchored to HEAD by later stories and no longer resolve at the baseline. The test lists all 26 ids in its failure message (U-008, U-023, X-001, X-004, G-005/9/11, H-014, S-011, D-001..D-012, D-017, A-005/6/8, B-014/18). |
| ANTI-VACUOUS: ghost quote still reddens | AC1 | green (guard) | non-gameable — a quote in no tree must still error. |
| SOURCE STAYS LIVE: wrong ROM source line reddens | AC1 | green (guard) | freezing `ours` must not freeze `source`; the 1983 side stays byte-checked. |
| remediated finding keeps frozen `ours` | AC4 | green (guard) | a `remediated_by` finding is never re-opened against any tree. |
| unresolvable frozen `ours` → returned error, not crash | AC4 | green (guard) | `git show` on an absent path must be caught, not thrown. |

**GREEN roadmap for Dev (Korben):**
1. **Freeze the checker.** Port tempest's frozen `plugins/tempest/tools/audit/check-citations.mjs`
   into `plugins/star-wars/tools/audit/check-citations.mjs`: replace the working-tree `ours` read
   (star-wars `check-citations.mjs:154-165`, `lineAt(join(repoRoot, f.ours.file), …)`) with the
   `frozenFileAt(repoRoot, file)` + BY-TEXT match (`AUDIT_COMMIT = '3580752'`). Keep the source
   side live, and keep the `node_modules` / `remediated_by` / `NO_COUNTERPART` branches exactly as
   they are. Port, do not re-derive — tempest is the reference.
2. **Reconcile the 26 LOST pins (AC-2).** For each id the AC-2 test lists, re-baseline its
   `ours.verbatim` in `docs/audit/findings/*.json` to the text **as it stood at 3580752** (NOT
   HEAD — see Delivery Findings), OR mark it `remediated_by` if it was actually fixed. Freeze
   matches by text, so the line number is decorative; get the QUOTE right.
3. **Demote the reanchor tool (AC-3).** Rewrite `tools/audit/reanchor-citations.mjs` to mirror
   tempest's demoted header/behavior (`plugins/tempest/tools/audit/reanchor-citations.mjs:1-24`):
   reports LOST quotes, moves nothing, header no longer instructs re-anchor-after-edit. (Not
   RED-pinned — see Delivery Findings.)
4. **Keep AC-4 green + docs.** The existing `tests/audit/citations.test.ts` (never-shipped,
   node_modules, non-matching verbatim, NO_COUNTERPART) must stay green under the freeze — do not
   weaken them. Update `plugins/star-wars/CLAUDE.md` "The citation gate" section (it still says the
   gate reads the working tree and to re-anchor after edits) to describe the freeze, mirroring
   tempest's CLAUDE.md.

**Run:** `npx vitest run --project star-wars freeze` (RED tests) and
`npx vitest run --project star-wars citations` (must stay green).

## Impact Summary

**Verdict:** APPROVED (one review round). **0 blocking items.** Work landed on `main` (ba3f11ea); trunk-based, no PR. Tests green at finish: lint clean, orchestrator 392/392, full star-wars project 2310/2310.

**What shipped:** star-wars's citation gate is now frozen to audit commit `3580752` (tag `audit/star-wars` on origin) — `ours` is re-opened via `git show` and matched by text, not against the working tree, so a later fix to a cited line no longer reddens the gate. 26 drifted `ours` pins were re-baselined to their audited text; the reanchor tool is demoted to a health check; the source (ROM) side stays live. Fleet: **3 of 6 games now frozen** (tempest, red-baron, star-wars).

**5 non-blocking follow-up items** (all Medium/Low, recorded in Delivery Findings → Reviewer): (1) [RULE Medium] AC-2 loop lacks a checked-count floor (future-vacuity guard); (2) [RULE Low] AC4-ABSENT assertion pins only the id, not the message; (3) [RULE Low] AC-2 reimplements the checker (prod path already covered); (4) [DOC Low] stale comment at `gun-visibility-and-shape.test.ts:421`; (5) [Low, fleet] 7-char `AUDIT_COMMIT` abbrev collision risk (mirrors tempest). None blocks; the two cheap test-hardening fixes + the one-line comment are worth a trivial follow-up.

## Sm Assessment

Setup for td1-13 (3pt, star-wars, tdd). Board was clear at claim time — no td1-13 branch anywhere, siblings on jt9-15 (a-1) and cp6-6 (a-3), merge gate clean. Claim pushed: commit `ef795ab` on `main` (epic stamp + context) plus an empty flare branch `feat/td1-13-freeze-star-wars-citation-gate` (tip == main) for sibling visibility. Work itself is trunk-based on `main` — session Branch/PR are `none` for the finish ceremony. Story stamped `in_progress` (verified).

**Measured the prerequisite before setup** (the epic description carries a big "STEP ZERO" banner). Every load-bearing claim checks out against the current tree on 2026-08-05:
- No `audit/star-wars` tag on origin — origin has only `audit/tempest` (4232ed4) and `audit/red-baron` (6038a07). The pinned-commit ACs are unmeetable until that tag exists.
- The defect is unchanged: `plugins/star-wars/tools/audit/check-citations.mjs:29` is a bare `readFileSync` against the working tree.
- Both prerequisite sources are reachable NOW: archived `slabgorb/star-wars` (archived, private, via gh) and `/Users/slabgorb/Projects/a-1/.migration-backup/star-wars.git` (present in a-1, NOT in this a-2 checkout).

**Added a measured ⚠ block to the context** (above Technical Approach) recording those facts and one trap TEA/Dev must not walk into: the migration manifest's star-wars import tip `822ee06` (tag v0.0.33) is the IMPORT commit, not necessarily the audit commit — the audit commit ("the one that recorded the findings") must be identified deliberately from archived history and sample-verified before tagging. ACs were copied verbatim from `sprint/epic-td1.yaml` (diff-checked; four distinctive phrases present) and left untouched.

**For TEA:** the checker freeze is the tempest tp1-22 port (git-show-against-audit-commit), but STEP ZERO — establishing the `audit/star-wars` tag on origin from archived history — is a hard prerequisite and is the true blocker; the pin reconciliation (uf1-12 re-anchored 23 pins to HEAD; the freeze wants them at the audit commit) is the bulk of the work, not the checker change. Pushing a tag to origin is outward-facing/one-way — surface it for authorization at the point it happens. Scope is star-wars only.