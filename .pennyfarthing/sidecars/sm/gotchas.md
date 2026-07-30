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

---

### A parked story's blockers can be STALE or FALSE — re-verify each against the current tree before re-cutting, and protect a hand-authored context through sm-setup with an explicit override + md5 check

**Situation:** Re-cutting rb4-16 (8pt, red-baron), parked with a full "⛔ PARKED" banner citing two hard
blockers: (1) "PLONSN's window can't be byte-pinned — the SINE table is a bare ROM address whose data
is in no `.MAC` file," and (2) "AC-R3 is infeasible — frames-in-reach = 0.0 at level 4 for every window,
including no-PLONSN." The story had `started: 2026-07-16`, an archived session, and a curated
context-story file whose body encoded a coordinate premise the banner itself flagged as wrong.

**Problem:** Both blockers had dissolved and nobody had re-checked. (1) The SINE table was NOT missing —
it was in `037007.XXX` (the picture/data ROM, ASCII assembler source), which the parked Dev never
searched because he grepped only `*.MAC`. (2) The 0.0-at-L4 sweep was taken through a gun that a LATER
story (rb4-17) had since DELETED and replaced with a depth-growing one — a stale number, not a wall.
Treating the parked banner as current scope would have handed TEA a story specced around two ghosts.

**Prevention:** When a story carries a PARKED/BLOCKED banner, treat every blocker as a claim to
re-verify against the CURRENT tree and the CURRENT state of its dependencies — especially if a
dependency shipped after the park. A blocker that reads "X is impossible / undiscoverable" is often
"X wasn't found where they looked." `.XXX`/data-ROM dumps are ASCII source too; grep them, not just
`.MAC`. Route the actual re-derivation to Architect/brainstorm — don't rubber-stamp the parked scope.

**Prevention (context protection):** A re-cut's context is often hand-authored and must survive
`sm-setup`, which regenerates story context by default (and the pointer-story YAML body is empty, so a
regen writes garbage). The reliable guard: commit the context first, then pass `sm-setup` an explicit
override ("DO NOT regenerate/overwrite sprint/context/context-story-<id>.md — SKIP that step"), and
AFTER it returns, verify on disk with `git status --short <ctx>` (must be empty) and an md5 match to
your committed copy. sm-setup honored the override cleanly here (`context_file_touched: false`, md5
`e4f00270…` unchanged) — proactive prevention beats the "clobber then `git checkout --`" recovery.

---

### SUPERSEDED-AT-REVIEW choreography — no second finish, archive as `-superseded-<checkout>`, probe the delta against upstream BEFORE seeding the follow-up

**Situation:** cp2-15 ran setup→RED→GREEN here while a sibling checkout ran the SAME story
concurrently and merged+finished it (centipede#35 at 03:40; this checkout's GREEN landed 03:41 —
truly concurrent, so nothing at setup time could have warned; per-checkout sprint state is
invisible until pushed). The Reviewer's fetch-and-grep first step caught it.

**Problem:** the finish flow is the wrong tool twice over: `pf sprint story finish` is not
idempotent (the upstream archive already exists; a re-run corrupts tracking), and the local
sprint YAML edits (in_progress/in_review stamps) CONFLICT with the incoming done state.

**Choreography that worked:** (1) discard the local sprint YAML phase stamps (`git checkout --`)
— upstream's committed done state wins; (2) move the local UNTRACKED context-story file aside
(upstream committed its own; yours blocks the pull); (3) stash sidecar edits, pull --ff-only,
pop, UNION-resolve (both checkouts' TEA wrote a gotcha about the same story — keep both, and if
one contains a claim your probe REFUTED, append a dated CORRECTION between them rather than
editing their voice); (4) archive the whole session as
`sprint/archive/<id>-session-superseded-<checkout>.md` (tp1-9 precedent) — do NOT delete it, it
is the follow-up story's spec; (5) BEFORE seeding the follow-up, run your branch's suite against
the merged upstream tree in a scratch worktree — the pass/fail split IS the delta scope, and it
can surface divergences upstream doesn't know about (here: 2 failures inside the filed follow-up
scope + 2 OUTSIDE it, a real ROM-fidelity bug in the merged code); (6) hand-author the follow-up
context file citing the archived session + the pushed reference branch, with the sm-setup
DO-NOT-REGENERATE banner; (7) leave the local branch pushed as reference — no PR (it would trip
the sibling's merge gate).

**Prevention next time:** none available at setup (concurrent starts are invisible); the net is
the Reviewer's fetch-first step + this choreography. Expect an add/add conflict if both
checkouts named a new test file identically — the follow-up treats the reference branch as
spec-with-proofs, never as a mergeable branch.

**CORRECTION (2026-07-29, sw8-8):** "none available at setup" is too pessimistic — there ARE two
cheap setup-time probes, and they cost seconds. See the entry directly below.

---

### A sibling's claim is invisible until PUSHED — probe the remote branch list and sibling `.session/` dirs BEFORE spawning `sm-setup`

**Situation:** `/pf-work sw8-8`. Every board signal said GO: `pf agent start sm` reported
`NEW_WORK_STATE`, `pf sprint backlog` listed sw8-8 as available, the epic YAML said
`status: backlog` **on `origin/main` as well as locally**, the merge gate was clean, and
`gh pr list -R slabgorb/star-wars` returned nothing. Nothing in the tracking system objected.

**Problem:** a-2 had been running sw8-8 for ~13 hours and was sitting in Reviewer **round 2**
(`setup` 10:32 → `red` → `green` 3h19m → `review` → `green` 7h55m → `review` re-entered 31 minutes
before I looked). It had pushed three commits to `origin/feat/sw8-8-incoming-fire-reaction-window`
but had **not pushed its sprint status stamp**, and per-checkout `.session/` files are never
committed. So the entire claim was invisible to `pf`. Setting up here would have duplicated an
11-hour green, raced the same `sim.ts` `homeShots` path, and collided add/add on the RED test file.

**The two probes that caught it (both seconds, both before any spawn):**
```bash
git -C <subrepo> fetch --prune origin          # then:
git -C <subrepo> branch -r | grep -E "<story-id>"        # a pushed feat/ branch = someone owns it
ls /Users/slabgorb/Projects/a-*/.session/*-session.md    # live sessions across ALL checkouts
```
The branch probe alone was decisive: three commits with a `rework round 1` message dated *today*
is a story in review, not a backlog item. The `.session/` sweep then named the owner and the exact
phase. Run BOTH — a sibling that hasn't pushed yet is caught only by the second.

**Prevention:** treat `pf sprint backlog` / `status: backlog` as **necessary but not sufficient**.
The authoritative question is not "what does tracking say?" but "does a branch or a session file
exist for this story anywhere?" Make the two probes a reflex in the New Work Flow, before
`sm-setup`. Cost of the probe: ~10 seconds. Cost of skipping it: the whole
SUPERSEDED-AT-REVIEW choreography in the entry above.

**Corollary — push your own claim immediately.** The reason sw8-8 was invisible is that a-2's
stamp sat local. After `sm-setup` returns, commit the epic-YAML stamp + the context file and
**push** in the same breath; an unpushed claim is an invisible claim, and you are the sibling in
someone else's version of this story. (jt8-4's claim was pushed within a minute of setup — the
push was rejected first time because `main` had moved, so expect a `pull --rebase`.)

**Push the claim branch EMPTY — don't wait for a commit to carry it.** The decisive probe above is
`git branch -r | grep <story-id>`, and at setup time there is nothing to commit in the subrepo yet,
so the natural instinct is to defer the branch push until RED lands a test. That leaves the widest
possible invisibility window open across the whole RED phase. `git -C <subrepo> push -u origin
fix/<id>-<slug>` works fine on a zero-commit branch (tip == `develop`) and lights up the sibling
probe instantly — jt8-6 was claimed this way. Note the two pushes go to DIFFERENT remotes and both
are needed: the orchestrator stamp+context to `arcade` `main`, the branch to the subrepo. The pf
branch-protection hook judges from the *session* cwd (orchestrator `main`, `trunk-based`), so
`git -C joust push` of a `fix/` branch sails through.

**Also worth knowing:** `sm-setup` created the session, context and branch correctly but left the
story at `status: backlog` — it did NOT stamp `in_progress`. Verify with
`pf sprint story show <id> | grep Status` and stamp it yourself
(`pf sprint story update <id> --status in_progress`). An unstamped story is invisible to the
sibling probes above even after you push.

**Never write the literal `**Phase:**` token inside your assessment prose.** `pf handoff
complete-phase` rewrites the phase stamp by pattern, not by position — it hit all three occurrences
in jt8-4's session file, silently turning a sentence that began ``  `**Phase:** setup` Workflow
Tracking at line 15… `` into ``  `**Phase:** red Workflow Tracking at line 15… `` (it ate the
closing backtick and the separator). The header of my own setup assessment was relabelled `red`
too. Say "the phase pointer read `setup` on arrival" instead, and after `complete-phase` run
`grep -n '\*\*Phase:\*\*' <session>` — exactly ONE hit (the real pointer) is correct. Anything else
is prose the next rewrite will corrupt, and the session file is the permanent archived record.

**Contention is broader than the story.** sw8-8 owns the star-wars TIE fire gate, so `uf1-14`
(C_PV pyramid), `uf1-15` (C_AS cone) and `sw8-16` (C$T9/A$GLW coverage) all touch the files a-2 is
actively reworking — they were the *worst* available picks despite two of them being p1. When a
story is blocked by a sibling, rule out its whole file neighbourhood, not just its id.
