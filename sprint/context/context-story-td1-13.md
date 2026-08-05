# Story td1-13 Context

## Title
star-wars citation gate still reads the WORKING TREE — port tempest's tp1-22 audit-commit freeze and retire the re-anchor loop

## Metadata
- **Story ID:** td1-13
- **Type:** chore
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Tech debt — fleet-wide fixes and carried-open items from the joust jt1 epic

## Problem
Found by Dev during uf1-12 (2026-07-29). CORRECTED AFTER FILING — the first version of this story claimed star-wars has no re-anchor tool and asked for one. It has one (tools/audit/reanchor-citations.mjs, nearest-match, skips remediated_by, dry-run then --write) and it works: run after uf1-12's hand re-anchoring it reported '96 already correct, 0 re-anchored, 0 lost', i.e. it would have produced the identical result. Dev hand-rolled a throwaway script without checking the repo first; that was the miss, not a missing tool. The REAL story is one level up. star-wars's checker re-opens each `ours` citation in the WORKING TREE (check-citations.mjs:155, readFileSync(join(repoRoot, f.ours.file)) then lineAt(f.ours.line)), so every edit to a cited file moves the pins below it and reddens tests/audit/citations.test.ts — uf1-12 inserted 5 lines in src/core/sim.ts and had to move 23 pins across 9 findings files, and sim.ts alone carries 36. tempest RETIRED that whole loop in tp1-22: its gate re-opens each quote against the AUDIT COMMIT ('git show 4232ed4:<file>', tempest/tools/audit/reanchor-citations.mjs:1-23) instead of the working tree. Because the audit record is immutable by construction, a finding that is green once is green forever no matter how the code is later refactored; ours.line becomes decorative and the quote is matched by TEXT within the frozen file. tempest's re-anchor tool is consequently demoted to a health check that only reports LOST quotes. Port that. What it buys beyond saved churn: it removes a real silent-corruption path. Under the working-tree model a duplicate verbatim can be re-pointed at the WRONG occurrence and the gate still goes green — in sim.ts `      damage++` occurs at 616, 1016 and 1101, and `    if (collides(s.pos, ship, COCKPIT_HIT_RADIUS)) {` at 615 and 1100 (the space and surface damage paths are near-identical), so a mis-anchored S-016 would describe the surface routine while reading green forever. The existing tool's nearest-match rule holds for insert-only edits (order is preserved, so nearest-to-old is right whenever the shift is less than half the gap to the next duplicate) but it is an ASSUMPTION stated in its own header, and a code MOVE breaks it. Freezing makes the question moot. Pick star-wars's audit commit deliberately — the commit that RECORDED the findings, verified by checking a sample of pins resolve there — and expect some pins to be LOST at that commit if any were re-anchored after it (uf1-12's 23 moves are exactly such a case: they are correct for HEAD, and the freeze wants the text as audited). That reconciliation is the bulk of the work, not the checker change. Fleet note: tempest is the reference implementation, so port rather than re-derive; scope here is star-wars only.

NEW PREREQUISITE, ADDED 2026-07-31 BY THE MONOREPO MIGRATION — DO THIS STEP FIRST OR THE STORY CANNOT BE DONE. This story's central step is 'pick star-wars's audit commit deliberately — the commit that RECORDED the findings'. That commit is no longer reachable from this repo: the 2026-07-30 collapse imported each game as ONE SQUASHED commit, so star-wars has no per-file history here. The migration's Task 2 anticipated exactly this and cut tags for the two gates it knew depended on frozen commits — `audit/tempest` and `audit/red-baron` exist on origin. THERE IS NO `audit/star-wars` TAG. The pre-migration history survives in two places only: the archived GitHub repo slabgorb/star-wars (archived, private — the durable copy) and a local .migration-backup/star-wars.git in the a-1 checkout (not present in every checkout). So step zero is: identify the audit commit in the archived repo, fetch it, and push an `audit/star-wars` tag on origin — before anything prunes it and before the freeze can be built against it. VERIFIED STILL TRUE post-migration: plugins/star-wars/tools/audit/check-citations.mjs:29 is still a bare readFileSync against the working tree, so the defect this story fixes is unchanged. FLEET NOTE, out of scope but now measurable: six games ship tools/audit/check-citations.mjs (battlezone, centipede, joust, red-baron, star-wars, tempest) and only two have a frozen audit commit.

> ⚠ **MEASURED 2026-08-05 (SM, against the current tree) — read before building step zero:**
> - **Confirmed:** No `audit/star-wars` tag on origin (origin carries only `audit/tempest` = 4232ed4 and `audit/red-baron` = 6038a07). The pinned-commit ACs cannot be met until an `audit/star-wars` tag exists on origin. Defect confirmed unchanged: `plugins/star-wars/tools/audit/check-citations.mjs:29` is a bare `readFileSync(path,'utf8')` against the working tree.
> - **Both prerequisite sources are reachable right now:** (a) archived repo `slabgorb/star-wars` (archived, PRIVATE, reachable via `gh`), and (b) a bare mirror `/Users/slabgorb/Projects/a-1/.migration-backup/star-wars.git` — present in the a-1 checkout, **NOT** in this a-2 checkout.
> - **TRAP — do not skip:** the migration manifest records star-wars's import tip as `822ee06…` (tag v0.0.33). That is the **IMPORT** commit, **not** necessarily the audit commit. The audit commit is "the one that RECORDED the citation findings" — identify it deliberately from the archived history and verify a sample of `ours` pins resolve there before tagging. Do **not** assume 822ee06 is the audit commit.
> - **Scope:** star-wars ONLY. Six games ship `check-citations.mjs`; tempest and red-baron are already frozen. The other three unfrozen games (battlezone, centipede, joust) are explicitly out of scope — this story freezes star-wars alone.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- The citation gate re-opens each `ours` quote against a pinned audit COMMIT (git show <commit>:<file>), not the working tree, mirroring tempest's tp1-22 checker; editing a cited file no longer reddens the gate (prove it: insert a comment line above a pinned line and the suite stays green).
- The pinned commit is chosen and documented with evidence that the findings' quotes resolve there; every `ours` pin is either resolvable at that commit or explicitly carried by `remediated_by`, and any LOST pin is reconciled by re-baselining its quote to the audited text — not by deleting the finding.
- tools/audit/reanchor-citations.mjs is demoted to the health check its tempest twin became (reports LOST, moves nothing), and its header no longer instructs stories to re-anchor after edits.
- `remediated_by` findings keep their frozen historical citation under the new checker, and the existing negative tests in tests/audit/citations.test.ts (never-shipped module, node_modules `ours`, non-matching verbatim) all still hold.

---
_Generated by `pf context create story td1-13` from the sprint YAML._
