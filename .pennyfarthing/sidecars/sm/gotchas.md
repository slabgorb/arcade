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

---

### When the STORY is wrong, the pipeline still works — but get the repurpose/close ruling from the user BEFORE RED, and expect the review rounds to land on PROSE

**Situation:** jt8-6 (joust, 3pt, `type: bug`) was filed by a Reviewer on jt8-4 with a REPRODUCED repro
and a named fix. TEA's first act was to open the cited ROM lines, and they said the opposite of the
story: `DEATH1 CLR EGGS1` (:4669) clears the egg counter on every death, so the "bug" was faithful
behaviour and the story's prescribed fix ("re-home the count so it outlives the process") would have
been a deliberate fidelity regression. The real defect was the boundary the story explicitly fenced
OUT of scope.

**What worked, in order:**

1. **Ask the backlog-shape question before any code.** "The premise is refuted" has three legitimate
   tracking answers — repurpose the story, repurpose and retitle, or close-as-not-a-bug and file fresh —
   and they are the user's call, not the pipeline's. Fidelity itself needed no ruling (the epic carried a
   binding user ruling that egg collection must match PLYEGG/EGGSCR), so the only real question was the
   board. The user chose repurpose-without-retitle, which means **the story TITLE still asserts the
   refuted premise** — record that in the deviation's forward-impact so a later reader is not misled.
2. **Protect the derived ACs.** This story had `acceptance_criteria: null`; `sm-setup` DERIVED six ACs
   from the Reviewer's finding text. Three of them were refuted. A `⚠ CORRECTION` banner at the TOP of
   the context file pointing at the session's Design Deviations is the right fix — do not rewrite
   `sm-setup`'s ACs in place, and do not leave Dev reading refuted ACs as their primary input.
3. **Let the filed behaviour become a green regression guard.** The single most valuable artifact was a
   test group that PASSES on arrival, guarding the behaviour the story wanted deleted. Its non-vacuity
   came from building the story's own design and watching it fail.

**Where three review rounds went, and the lesson for the Reviewer's budget:** all three rejections were
**claim prose**, never code. The code was correct from round 1 and never changed after it. Rounds 1-3
each died on a claim asserting more than its cited line supports — a universal about death routines,
then a wrong line extent plus a false instruction count, then (caught pre-commit) a wrong "never". Two
structural reasons, both worth acting on:

- **`comment_analyzer` is disabled in `workflow.reviewer_subagents` on this project**, so the ONE domain
  where every defect actually lived had no specialist. Every enabled check was green all three rounds.
- **`tests/audit/citations.test.ts` verifies the `source.line`/`verbatim` PAIR and cannot see line
  references embedded in claim BODIES.** That is exactly where the round-2 errors sat. A truncated
  extent is worse than a wrong fact: it *manufactures* corroboration, because a reader who checks only
  the cited span sees the false count as true.

**The fix that finally held was structural, not a reword:** drop the categories of assertion that keep
being wrong (line extents, instruction censuses) and state each routine's COMPLETE write set instead —
checkable by one grep and stable when line numbers shift. When a claim fails review twice, stop
correcting its values and ask what it should stop asserting.

**Two process notes worth keeping:**
- **An incomplete subagent return is not a clean one.** The round-2 rule-checker's first reply contained
  only its closing lines — no verdicts. It had done the work and lost the report; a `SendMessage` asking
  for the results recovered a full audit that caught both defects. Ask before you either trust it or
  re-dispatch it.
- **Have the specialist audit text YOU drafted.** The Reviewer wrote two of the three failing drafts.
  Dev caught an error in the Reviewer's suggested replacement ("shared, never to one creature" — DEATH4
  is bound by exactly one record) precisely because the reviewer's brief said "I drafted the failing
  text too; verify, don't trust." Say that explicitly in the handoff.

**Finish went clean:** `develop` had not moved (no trial-merge needed), PR #43 squash-merged with an
explicit `-R slabgorb/joust` and verified `state: MERGED` from `gh` itself, and the push was rejected
first time because a sibling checkout had landed 11 sw8-8 commits — `pull --rebase` resolved with no
conflict. Verified afterward that the fix is really on `develop` and the suite is green THERE, not just
on the branch.

**One hook trap on the way out:** after `cd joust && git checkout develop` to verify the merge, the next
orchestrator commit was BLOCKED — pf's branch-protection hook judges the repo/branch from the SESSION's
working directory, which was still `joust/` on the protected `develop`, no matter what `cd` the command
itself began with. Run a bare `cd <orchestrator> && pwd` first, or use `git -C <abs>` throughout.

---

### POST-MONOREPO (2026-07-30 collapse): the claim is still TWO pushes, but now to ONE remote — and the sibling probes changed shape

**Correction to the entry above** ("the two pushes go to DIFFERENT remotes and both are needed").
That was true when the games were subrepos. After the plugin collapse there is exactly one repo and
one remote, so the two pushes are `origin main` (the epic-YAML stamp + `sprint/context/context-story-<id>.md`)
and `origin <feat-branch>` (empty, tip == main, purely so `git branch -r | grep <id>` lights up for a
sibling). Both still needed, same remote. Done for mg1-2: claim commit `0e57baa` on `main`, branch
`feat/mg1-2-multi-app-dev-server` pushed at zero commits ahead.

**The sibling probes still work but one of them silently no-ops now.** `ls /Users/slabgorb/Projects/a-*/.session/*-session.md`
returned `zsh: no matches found` — that is the glob failing, NOT a clean board, and under a different
shell it would have printed nothing and looked identical to "no sessions." Read the probe's output,
don't just check it ran. The branch probe (`git fetch --prune && git branch -r | grep -Ei "<epic>"`)
is the reliable half now that all checkouts share one remote — it sees every sibling's branches
directly instead of needing a per-subrepo fetch.

**`sm-setup` STILL leaves the story at `status: backlog`** (confirmed again on mg1-2, third time).
Stamp it yourself with `pf sprint story update <id> --status in_progress` and verify with
`pf sprint story show <id> | grep -i Status`. Treat this as unconditional, not as a maybe.

### When a story's AC is an either/or, get the ruling BEFORE `sm-setup` — and annotate the AC rather than rewriting it

**Situation:** mg1-2's AC1 read "Either the dev server genuinely serves each game at /<id>/ …, or the
recipe and its docs are renamed and reworded so nothing claims a cabinet-wide dev server exists." Two
completely different deliverables — a 5-point build vs. a doc rename — behind one AC.

**Why it must be settled at setup:** TEA writes a different RED test for each branch, so an unruled
either/or does not merely risk rework, it makes the RED phase unspecifiable. This is the same shape as
the jt8-6 "when the STORY is wrong" entry: the backlog-shape question is the user's, not the pipeline's.
Cost of asking: one question. Cost of not: a whole discarded RED.

**Tell for spotting it cheaply:** compare the points against a same-epic doc-only story. mg1-2 was 5pt
while mg1-1 (a pure truthfulness fix) was 1pt — the estimate had already implicitly chosen "build",
which is worth putting to the user as the recommended option rather than asking cold.

**Handling the losing branch:** `sm-setup` copies ACs verbatim from the epic YAML, so the rejected half
lands in the context as TEA's primary input even when the ruling is recorded above it. Do NOT edit the
AC text — add a `> ⚠` block immediately above it saying which branch is dead and why, leaving the
original visible. Rewriting it would disguise a decision as the story having always said so, and the
epic YAML would then disagree with the context with no record of which came first.

**Also worth a grep at setup: story ids cited in prose go stale on an epic split.** mg1-2 was `uf1-19`
until the 2026-07-31 split; `CLAUDE.md:134,136` and the migration plan still named the dead id, and one
of those was a test's own explanation of when it should redden. `grep -rn "<old-id>" *.md docs/ sprint/`
costs nothing and the hits are usually inside the story's own blast radius.
