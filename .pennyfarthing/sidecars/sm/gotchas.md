# SM Gotchas

Common pitfalls encountered during story coordination and the finish ceremony.

---

### `sm-finish` PHASE=preflight compiles the Impact Summary from ALL rounds' Delivery Findings — it can resurrect a fixed finding as BLOCKING

**Situation:** Finishing sw7-16 (2pt, star-wars, TDD, 3 review rounds). Reviewer's verdict was
APPROVED with "no Critical or High" and six-of-six required round-2 items marked FIXED and
independently verified. The `sm-finish` preflight subagent nonetheless reported
`**Blocking:** 1 BLOCKING items` and wrote into the session's Impact Summary: "Round 1's finding 3
is **not fixed** — the false pointer was replaced by another false pointer."

**Problem:** The Impact Summary is compiled by scraping Delivery Findings across the whole story,
and a multi-round story carries every round's findings. Round 2's blocking finding was quoted
verbatim, in round 2's "not fixed" framing, with no awareness that round 3 (`a903e09`) had closed
it. The round-3 Delivery Finding two sections above it in the SAME file already restated the
residue correctly as **non-blocking** — the compiler read the stale one. Had I trusted the
subagent, I would have refused a finish the Reviewer had already approved and bounced an approved
2-point story into a fourth round. The refutation took one grep: `src/core/sim.ts:1407-1418` now
reads "caught **via `moveEnemy`**" and explicitly discloses `spawnTie` as unguarded and its `dir`
vestigial — precisely what round 2 demanded. The blocker was false on its face.

**Prevention:** Treat the preflight's Impact Summary as a DRAFT keyed on stale input, never as a
gate. Before acting on any "BLOCKING" item, read the cited line of code and diff it against the
Reviewer's verdict table — the Reviewer's round-N assessment outranks a scraped summary. When they
disagree, the code decides. Then FIX the Impact Summary in the session file before archiving: it
is about to become the permanent record, and an archived summary that says a shipped fix "is not
fixed" will mislead whoever greps it next. Same applies to `review_findings` in the epic YAML —
after a multi-round story it can hold round 2's "REJECTED …" text sitting next to
`review_verdict: approved`. Rewrite it to the approving round's outcome.

**Related:** the mirror-image failure (`subagent reports claim false fixes` — preflight/reviewer
summaries confabulating a fix that never happened). Both directions are the same rule: the
subagent's status claims are unsourced; grep the line or run the command before acting.

---

### `pf sprint story finish` lists `merge_pr` but does not merge a subrepo PR — and the preflight will try to merge it for you

**Situation:** Same story. No PR existed at finish time. The `sm-finish` preflight subagent, spawned
for read-only checks, created PR #101 itself and then attempted an automated merge — which tripped
the auto-mode classifier (self-authored + self-reviewed) and stalled the subagent mid-run.

**Problem:** `PHASE=preflight` is NOT read-only despite the name. Separately, `pf sprint story finish`
prints `2. merge_pr` in its step list whether or not anything merged: it runs `gh pr merge <N>` from
the orchestrator directory with no `-R`, so it resolves against `slabgorb/arcade` (which has no such
PR) and silently no-ops. The printed step list is not evidence.

**Prevention:** Get the user's merge authorization BEFORE spawning preflight, and merge the subrepo
PR yourself with an explicit `-R slabgorb/<repo> --squash` (star-wars convention: one squash commit
per PR, `(#N)` suffix). Verify with `gh pr view <N> --json state,mergedAt` — the word "MERGED" from
a command, not from a subagent. Then run finish and verify its claims independently: story `status:
done` in the epic, an entry in `sprint/archive/sprint-<N>-completed.yaml`, the archive file present,
and `.session/<id>-session.md` gone.

**Prevention (merge safety):** `develop` moves under long stories. Trial-merge before merging the PR
— `git merge origin/develop --no-commit --no-ff`, run the FULL suite, then `git merge --abort` —
because local-green on a stale branch has masked a merge-red before. sw7-16: develop was 1 commit
ahead (a version bump only), merged tree stayed 1483/1483.
