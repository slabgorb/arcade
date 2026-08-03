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

---

### A backlog story's DESCRIPTION can be stale without any banner saying so — measure its premise before `sm-setup`, because `sm-setup` copies it forward as current fact

**Situation:** `/pf-work mg1-9`, a clean 3-pointer with unambiguous ACs. Nothing was parked, nothing
was blocked, no `⛔` banner anywhere. The epic YAML's description said "src/shared/tests is excluded
from the root tsconfig" and "Task 21's `highscore.dom.test.ts` is untypechecked today."

**Problem:** both sentences were false. A later commit had **narrowed the exclusion from the
directory to the single file** `src/shared/tests/synth.test.ts`, so 25 of the 26 shared test files
were already typechecked and `highscore.dom.test.ts` was among them. The real remaining scope was
one file, not a directory. `sm-setup` renders the `description` field into the context's Background
verbatim, so without an override TEA's primary input would have asserted a directory-wide blindness
that no longer existed — and the natural RED test ("prove these 26 files are unchecked") would have
been unwritable or vacuous on arrival.

**The tell, and it is cheap:** the description contained a *falsifiable measurement* ("22 errors",
"is excluded"). Any description that quotes a number or a file's current state is a claim with a
timestamp on it. Running it costs seconds:

```bash
# empty the exclude in a scratch copy, measure, revert — then `git status --short` MUST be empty
npx tsc --noEmit 2>&1 | grep -c 'error TS'
```

22 errors, all in one file — matching the tsconfig comment's own census exactly, which is what
proved the *narrowing* commit was the newer truth and the *story* was the stale one.

**Prevention:** extend the parked-blocker rule (three entries up) to unparked stories. The trigger is
not the banner, it is the falsifiable claim. Re-verify it, then pass `sm-setup` the measured facts as
an explicit correction block in the prompt and tell it to use those for Background while copying the
`acceptance_criteria` **verbatim** — the ACs here were still perfectly good even though the
description around them had rotted. Record the refutation in the SM Assessment too: the epic YAML
still says the old thing, and the archived session is where a later reader learns which came first.

**Second thing this story surfaced: a guard test whose correct fate is DELETION.**
`tests/monorepo-topology.test.mjs` asserted the exclusion exists and equals the one-file list, and its
own comment said "if `<this story>` landed, delete this test with it." So the orchestrator suite
going red mid-work is the *expected* signal, not damage. Say so loudly in the context — a Dev who
reads that red as a regression will restore the exclusion to make it green and fail AC1 while
appearing to succeed. Grep the story's own id (and its pre-split id) across `tests/` at setup;
instructions addressed to the story are usually sitting right there.

---

### The `sprint-<N>-completed.yaml` append conflict hides its danger in the SHARED TAIL — git conflicts only the id/title lines and silently merges `points`/`completed`

**Situation:** finishing mg1-4. A sibling checkout finished mg1-9 in the ~6 minutes between my
`pf sprint story finish` and my `git push`, so `main` had moved and both runs had appended an entry
to the end of `sprint/archive/sprint-2628-completed.yaml`.

**Problem — and this is the part worth keeping.** The two appended records are five lines each with
an identical *shape*, so git's diff aligned the trailing two lines and conflicted only the first
three. The hunk looked like this:

```
<<<<<<< HEAD
  - id: mg1-9
    epic: mg1
    title: "Typecheck arcade-shared's tests: …"
=======
  - id: mg1-4
    epic: mg1
    title: sprint epics still route stories to per-game repos …
>>>>>>> (mine)
    points: 3            <-- OUTSIDE the markers, silently shared
    completed: '2026-07-31'
```

`points`/`completed` sit *below* the closing marker and belong to whichever record ends up last. So
the two resolutions that look obviously right are both wrong: "take both sides" yields one story
with a full record and one with **no** `points`/`completed` at all, and "take mine" **deletes the
sibling's completed story from sprint tracking entirely** while looking like a clean one-line
resolution. Here both stories happened to be 3 points and both completed the same day, which would
have masked a wrong-points resolution completely — do not let a coincidence audit your merge.

**Resolution:** a union means re-typing **whole records**, not un-marking the conflicted lines.
Write out both entries complete with their own `points`/`completed`, taking the values from the
authoritative sources rather than from the conflicted buffer — `git show origin/main:sprint/archive/
sprint-<N>-completed.yaml | tail` for theirs, `sprint/epic-<id>.yaml` for both. Then verify by
parsing, not by eye:

```bash
grep -rn '^<<<<<<<\|^=======$\|^>>>>>>>' sprint/     # must be silent — markers here crash pf
python3 -c "import yaml;rows=yaml.safe_load(open('sprint/archive/sprint-2628-completed.yaml'))['completed_stories'];\
print(len(rows));print([ (r['id'],r.get('points'),r.get('completed')) for r in rows if r['id'] in ('mg1-4','mg1-9')])"
```
Each id exactly once, each carrying its own points. `git status` showing a resolved file is not
evidence; the parse is.

**Also:** the race window is now the FINISH, not just setup. The documented sibling probes protect
the start of a story; nothing protects the gap between `story finish` and `push`. Expect the
rejected push, and after `rebase --continue` re-run the suite **on the merged tree** — the sibling
had edited `tests/shared-tests-typechecked.test.mjs`, so green-before-rebase proved nothing about
green-after. (358/358 both sides here, but that was luck, not method.)

---

### Pre-load the round structure into the `sm-finish` preflight prompt — it is far cheaper than auditing the Impact Summary afterwards

**Situation:** mg1-4 was a two-round story (round 1 REJECTED on a High, round 2 APPROVED). That is
exactly the shape that made the preflight resurrect a closed finding as BLOCKING on sw7-16, the
first entry in this file.

**What changed:** rather than letting it scrape and then refuting its output, the spawn prompt
stated up front — (a) there are two rounds and the session holds both, (b) round 1's High is closed,
with the evidence I had already checked myself (all five `context-epic-*.md` render `arcade`), (c)
attribute every finding to its round and report the FINAL state, and (d) if you still believe
something blocks, cite the file and line so I can read it. It returned `blocking_count: 0` with the
rounds correctly separated, and no refutation was needed.

**Two bonuses worth repeating.** Telling it explicitly *"this is trunk-based, work landed on `main`,
do NOT create a PR or attempt a merge; mark any `merge_pr` step N/A"* meant it made **zero file
writes** — the "PHASE=preflight is not read-only" hazard never materialised because the surface that
causes it (PR creation) was closed by instruction. And it does **not** write the Impact Summary into
the session file; it only returns the text. Appending it yourself is a required step, not an
optional one, since the archived session is the permanent record.

**Still true, still needed:** the epic YAML's `review_findings` held round 1's rejection text sitting
next to `review_verdict: approved`. Rewrite it with `pf sprint story update <id> --review-findings`
(there is a real flag; never hand-edit the YAML), then confirm the write was surgical with
`git diff --stat` — one file, one line — and re-parse all shards.

---

### `sm-setup` will EDIT an AC you told it to copy verbatim — and then write a ⚠ note asserting it didn't. Diff every AC against the epic YAML, and check your own grep before you trust its 0

**Situation:** `/pf-work cp5-1` (3pt, centipede, tdd). I measured the epic description's falsifiable
claims first (per the entry above) and handed `sm-setup` a five-point correction block with an
explicit instruction: copy `acceptance_criteria` **VERBATIM**, do NOT edit AC5's text, and record the
off-by-one line cite as a `> ⚠` block above it instead.

**Problem:** it did the ⚠ block correctly AND edited the AC anyway. AC5 came back as "The bonus-life
cue named by `core/bonus.ts:30-35` (the deferral banner block) has a place in the manifest…" against
the YAML's "…named by core/bonus.ts:32…". Worse, the ⚠ note it wrote directly above ended with "the
AC text remains unchanged" — a self-refuting sentence, since the text three lines below it *was*
changed. Both halves of the instruction were obeyed in isolation and the pair contradicted itself.
Left alone, the context and `sprint/epic-cp5.yaml` would disagree on what the story asks for, with
the only note on the subject claiming they agree — precisely the "disguise a decision as the story
having always said so" failure the mg1-2 entry warns about, arrived at from the opposite direction.

**Prevention:** after `sm-setup` returns, diff the ACs mechanically rather than eyeballing them:
```bash
pf sprint story field <id> acceptance_criteria | tr ',' '\n' | grep -i "<distinctive phrase>"
grep -n "<distinctive phrase>" sprint/context/context-story-<id>.md
```
The two lines must match word for word. Restore the AC from the YAML and let the ⚠ note carry the
correction — and make the note say the AC is reproduced verbatim *and has not been edited*, so the
note is checkable rather than merely reassuring.

**The other half of this, and it nearly cost more than the real defect: verify your verifier.** My
first sweep for the surviving corrections used `grep -Eci "bonus.ts:30-35\|line 31\|off-by-one\|⚠"`
— but under `-E` the alternation is `|`, not `\|`, so that searched for one long literal and
returned **0 hits**. The correction was present and correct at line 56 the whole time; I was ~one
step from "restoring" a thing that had never been lost. A 0 from a grep you just composed is a claim
about your pattern first and the file second. Confirm a 0 with a second, dumber pattern (a bare
`grep -n bonus -i`) before acting on it.

**Two smaller things this story confirmed:**
- **`sm-setup` omitted `**Repos:**` from the session file** entirely (it wrote `**Workflow:**` and
  `**Phase:**` only). `gates/sm-setup-exit` checks fields are set, and the agent-behavior guide names
  all three. Grep for all three, not just the phase pointer.
- **`sm-setup` STILL leaves the story at `status: backlog`** — fourth consecutive confirmation.
  `pf sprint story update <id> --status in_progress`, then verify. Treat as unconditional.

---

## `pf sprint story add` creates a story with NO description — the quarry dies there (jt5-1, 2026-08-01)

`pf sprint story add <epic> "<title>" <points>` writes id / title / points / priority / status /
repos / workflow and **nothing else**. No description, no acceptance criteria. So a finding filed at
finish arrives in the backlog as a title and an empty body, and every ROM line number, call site and
measured refutation that made the finding worth filing is gone — the next reader re-derives it or,
worse, re-litigates it.

Always follow with `pf sprint story update <id> --description "..."`. It exists, it takes the whole
text, and it is the difference between "The FLAP — the two-edge wing cue" and a story that already
knows GOFLAP is :6207-6218 on the press, GOFLIP :6182-6184 on the release, and that the ROM's own
comment at :6217 is a 1982 copy-paste error you must not trust. `--add-ac` (repeatable) is there too.

Escaping: the description goes through a shell string, so `$` in ROM operands needs escaping —
`!N\$12!+\$80` — and a doubled apostrophe inside a YAML-bound quote (`THUD''ED`) survives correctly.

## Filing is not optional, and "the epic owns it" is worth checking

jt5 held exactly ONE story, so all seven TEA findings and three Dev findings on jt5-1 were unowned —
"out of scope" with nowhere to go. Six became stories; the seventh (the lava troll's grab cue)
genuinely had an owner, and I confirmed `uf1-10`/`uf1-11` exist in `sprint/epic-uf1.yaml` rather than
taking the finding's word for it. Check the named owner actually exists before letting a finding rest
on it.

## Verify tracking by PARSING origin, not by reading your own working copy

After `pf sprint story finish` + push, confirm from `git show origin/main:<path>` and parse the YAML:
the story's status and `completed` date in the epic, the record in
`sprint/archive/sprint-<N>-completed.yaml`, the archive file's presence AND that it still contains
the phase assessments. The completed-file tail is the shared surface siblings race, and a silent
merge there looks like nothing in a diff.

Also: `pf sprint story finish` round-trips every epic YAML. jt5-1 had six freshly-added sibling
stories in the same file — diff the epic afterwards and confirm the FINISHED story's own
`acceptance_criteria` count is unchanged (6 here). The SH-1 truncation was root-fixed, but a
one-command check is cheaper than discovering it three stories later.

## Delete the empty claim branch at finish

sm-setup pushes a zero-commit `feat/<story>` branch purely so a sibling's branch probe sees the
claim. On a trunk-based repo nothing ever merges it, so it outlives the story. Confirm
`git rev-list --count origin/main..origin/feat/<story>` is 0, then
`git push origin --delete feat/<story>`.

## `sm-setup` can write rich session ACs and STILL emit a stub context — while reporting it "validated" (sw8-10, 2026-08-01)

Handed sm-setup a full measured-facts block with citations and explicit content requirements. The
session file came back correct (four well-derived ACs, all fields, one phase pointer) — but the
context file was the bare `pf context create` stub: "_No description in the sprint YAML_ … _TEA to
define during the RED phase_", with none of the measured facts. Its report claimed "Story context
validated ✓". The two artifacts diverged and the report vouched for the wrong one.

Check the CONTENT of `sprint/context/context-story-<id>.md` after every sm-setup return — `ls` and
byte-size are not enough (the stub was a plausible 1265 bytes). A context that says "TEA to define"
for a story you just measured is the tell. Fix: author it yourself (context is SM-owned markdown;
mirror the session ACs verbatim, add the measured Background with citations, end with a
do-not-regenerate line) BEFORE the claim commit, so the committed context is the good one.

## `pf sprint story add` mints its OWN id — read it from the output before the follow-up `--description` update, and audit the `repos:` it auto-writes (sw8-10 finish, 2026-08-01)

Filed the sw8-10 follow-up with `story add mg1 …` and immediately ran `story update mg1-11
--description …` on a GUESSED id. The add had minted `mg1-15`; mg1-11 was an existing 5-point
story whose real description ("PLAN DEFECT 14…, two test runners") got silently replaced — pf
reports "Updated story mg1-11" either way. Caught only because the epic diff was read before
committing. Recovery: restore the original text verbatim via `story update` (heredoc with a
quoted delimiter — the text carried backticks) and verify with a parse asserting the old text is
back AND the new story's fields are right.

Two more facts from the same filing: the add wrote `repos: pennyfarthing` (not `arcade`) — audit
the new story's `repos:` every time, and `story update` has NO --repos flag, so a wrong value
takes one surgical sed + parse to fix. And the completed-archive already carries a PRE-EXISTING
duplicate id (SH2-18, twice on origin) — inherited, not from today's union; worth a cleanup chore
someday, but never "fix" it mid-rebase.

---

## `sm-setup` writes your corrections into the SESSION and leaves the CONTEXT raw — then reports it did both (cp5-2, 2026-08-01)

**Situation:** `/pf-work cp5-2`. I measured the epic description first (per the entries above), found
two falsehoods, and handed `sm-setup` a correction block plus a user ruling that settled an either/or
AC. `SETUP_RESULT` came back clean: *"Background: corrected with measured facts about five precedent
games"*, *"Context for TEA: AC2, AC5, attract screen, and test location documented"*, *"User ruling:
prominently recorded"*.

**Problem:** all of that went into `.session/cp5-2-session.md` **only**. The context file was a bare
`pf context create story cp5-2` generation whose `## Problem` section was the epic `description`
**verbatim** — both falsehoods intact, plus the sentence "Decide explicitly whether the dispatch
should throw or degrade", presenting as open a question the user had already ruled on. Its
`## Technical Approach` and `## Scope` were the generic filler ("_Approach hints to be refined by
TEA/Dev_" / "In scope: the behavior described by the story title"). The two files disagreed, and the
one carrying the false version is the one named `context-story-<id>.md`.

**Why it matters more than it looks:** the SETUP_RESULT sentences are not lies about *nothing* — the
work was genuinely done, in the wrong file. So a reader who spot-checks the session sees exactly what
was promised and stops. The prior entries in this file all say "verify sm-setup's claims"; this one
adds **which file** to verify them in. `pf context create` renders `description` verbatim and
`sm-setup` does not go back and edit it, so **the context file's Problem section is ALWAYS the raw
epic description** no matter what you put in the prompt.

**Check, and it is two commands:**
```bash
grep -n "<a distinctive phrase from the FALSE claim>" sprint/context/context-story-<id>.md   # must be 0, or fronted by a ⚠
grep -n "Approach hints to be refined" sprint/context/context-story-<id>.md                  # filler still there = nothing was written
```

**Fix:** don't rewrite the Problem paragraph — front it with a `> ⚠ CORRECTION` block that numbers
each refuted claim, cites the measurement, and says which claims *do* still hold (there were two
load-bearing true ones here; deleting the paragraph would have lost them). Then fill Technical
Approach/Scope with measured pointers — files, line numbers, the precedent table — and not with
design. Keep the ACs untouched; verify that mechanically afterwards by **parsing**, not grepping:

```python
acs = next(s for s in yaml.safe_load(open('sprint/epic-<epic>.yaml'))['stories'] if s['id']=='<id>')['acceptance_criteria']
# assert each `ac in context_text` and `ac in session_text`
```
A `python3` `in` test is byte-exact and immune to the alternation/escaping traps that made a
hand-composed `grep -Eci` return a false 0 on cp5-1. It also survives your own prose quoting an AC
phrase — my Technical Approach quoted "once per stepped frame", so the grep count went 1→2 and
looked like a duplicated AC; the parse showed all five still verbatim.

**Second defect in the same return, and it is the self-refuting-sentence pattern again:** the
Background it *did* write said "there are **FIVE** games with a complete audio seam, not four.
**FOUR** carry the identical 3-site shape (tempest, asteroids, battlezone, red-baron, and joust)" —
a list of five names introduced as four, in a sentence whose entire purpose was correcting a
four-vs-five error. Same shape as cp5-1's "the AC text remains unchanged" written above an edited AC.
**When you hand `sm-setup` a numeric correction, re-read the sentence it wrote to carry that number
and count the items yourself.** It reliably transcribes the correction's *facts* and unreliably
transcribes its *arithmetic*.

**Unchanged, fifth consecutive confirmation:** `sm-setup` left the story at `status: backlog`.
`pf sprint story update <id> --status in_progress`, then verify. It did get the branch right
(pushed empty, `git rev-list --count origin/main..origin/feat/<id>-<slug>` == 0) and all three
header fields (`**Workflow:**`/`**Phase:**`/`**Repos:**`) were present this time — the cp5-1
`**Repos:**` omission did not recur, so grep for all three rather than assuming either outcome.

## Rule an either/or AC from measured PRECEDENT, not from taste — it turns a survey into a one-click confirm

cp5-2's AC3 ("throw vs degrade for an unmapped event kind") is the mg1-2 either/or shape: TEA writes
`expect(...).toThrow()` for one branch and `.not.toThrow()` for the other, so RED is unspecifiable
until it is settled. Before asking, I grepped the default arm of all five precedent games'
`audio-dispatch.ts` — **none throws at runtime**; every one ends in a bare
`const _exhaustive: never = event`. That turned "what would you prefer?" into "5/5 precedents
degrade, the hazard is a frozen frame loop, and both branches cost the same effort — confirm?" The
user picked the recommendation immediately.

The general form: an either/or in an AC almost always has a *measurable* house answer sitting in the
sibling games. Spend the two minutes to find it before spending the user's attention. Ask anyway —
the ruling is theirs and the story explicitly asked for one — but ask with the census attached.

---

## Printing a safety count is not the same as GATING on it — and the sibling checkouts are the recovery path (jt5-5 setup, 2026-08-01)

**Situation:** clearing the stale `feat/jt5-4-…` claim branch at the start of jt5-5. The rule two
entries up is explicit: "Confirm `git rev-list --count origin/main..origin/feat/<story>` is 0, then
`git push origin --delete`." I wrote both in one chained block:

```bash
git rev-list --count origin/main..origin/feat/jt5-4-…   # printed 2
git push origin --delete feat/jt5-4-…                    # ran anyway
```

**Problem:** `;`-chaining makes the check decorative. The count came back **2**, not 0 — the exact
signal that should have stopped the delete — and the delete had already executed by the time I read
it. The check ran, the output was correct, and it protected nothing.

**Fix in one character:** make the guard structural, not visual.
```bash
[ "$(git rev-list --count origin/main..origin/feat/<story>)" = 0 ] \
  && git push origin --delete feat/<story> || echo "NOT EMPTY — inspect before deleting"
```

**Recovery, and this is the genuinely useful part: a deleted branch survives in the SIBLING
checkouts.** `a-2` and `a-3` fetch the same single remote, so both still held
`origin/feat/jt5-4-…` at `8d5da1a` in their remote-tracking refs minutes after the remote ref was
gone. That recovered the tip instantly when nothing local could:

```bash
for d in /Users/slabgorb/Projects/a-{2,3}; do
  git -C "$d" rev-parse origin/feat/<story> 2>/dev/null && git -C "$d" log --oneline -3 origin/feat/<story>
done
```
Note what did NOT work, so you skip it next time: `git fsck --dangling`/`--unreachable` in the
deleting checkout listed 25 unreachable commits and **none** was the branch tip; the GitHub
`DeleteEvent` carries **no** SHA (`head`/`before` are both null); and the events API refuses
pagination past page 1 with a 422. The sibling probe is the first thing to try, not the last.

**Outcome here was benign, and worth knowing WHY** — the 2 commits were `chore(sprint): claim`
(a status stamp jt5-4 has since moved past to `done`) and `chore(sm-setup): … context file`, whose
`sprint/context/context-story-jt5-4.md` is **byte-identical** to main's (`git diff --stat
<sha>:<path> origin/main:<path>` → empty). On a trunk-based repo a claim branch holds exactly the
superseded claim commits, because the real work lands on `main` — so the count being non-zero is
usually *expected*, not alarming. That is precisely why it must be READ rather than merely printed:
the rule's "must be 0" is wrong for any story whose claim was pushed WITH its commits rather than
empty. Verify the content is represented on `main`, then delete.

---

## With the reviewer specialists disabled, a MUTATION BATTERY is the review — and its most useful output is an EQUIVALENT MUTANT (jt5-5, 2026-08-01)

**Situation:** `pf settings get workflow.reviewer_subagents` reports `preflight: true` and the other
eight `false` — nine specialist rows, one live specialist.

**What worked:** 18 mutations against committed source, each run through
`--project shared --project joust`, source restored after. 17 were caught. Re-reading the diff by
hand had found the same two prose defects and none of the mechanism confidence — the battery is what
turned "the tests look thorough" into "truncating SNPCR1 to its cited row reddens exactly 2 tests".

**The lesson is the SURVIVOR, and it is not the one you expect.** Removing the `> 0` floor from
`tick()` (letting the counter run negative) killed nothing. The instinct is to write a test for it.
That instinct is wrong: negative and zero are indistinguishable through the public surface, because
every read is `voiceFrames > 0` and an accept reassigns the field outright. It is an **equivalent
mutant** — no test can catch it because there is nothing to catch. The real defect was that a test
had been NAMED `the window does not go negative`, claiming a property it could not observe. Renamed
to what it proves, with the equivalence recorded so nobody re-derives it.

So: when a mutation survives, ask "is this behaviour, or is this an unobservable internal?" before
demanding coverage. If unobservable, the fix is the test's NAME, not the test's assertions. This is
the same family as `guard-tests-name-uncovered-cases` in the user memory, from the opposite side —
there a test's name over-promised its coverage, here a test's name over-promised what was knowable.

**Also worth keeping: how to build the battery cheaply.** Anchor each mutation on a distinctive
source substring, `assert s.count(old)==1` before applying, and print `ANCHOR MISS` rather than
silently skipping — a mutation that failed to apply looks exactly like one that was caught, and
scores the suite as safer than it is.

## Gate the claim-branch delete on the count — and jt5-6-style "owner" stories need the finding WRITTEN INTO them

Two follow-ups to entries above, both proved out on jt5-5's finish:

**The gated delete works.** `N=$(git rev-list --count origin/main..origin/$BR)` then
`[ "$N" = "0" ] && git push origin --delete "$BR" || echo "NOT EMPTY"`. On jt5-5 the count was 0 and
the branch went cleanly. Never chain the check and the delete with `;`.

**"Owned by <story>" is not a disposition until the owner story SAYS SO.** Three agents routed the
multi-line-sound-table finding to jt5-6. jt5-6 existed, and its description quoted a `+$80` operand —
so a grep for the finding's own tell returned a hit and it *looked* owned. It was not: the
description nowhere stated the continuation RULE or that either table is multi-line, so whoever
picked jt5-6 up would have re-derived the 15x error from scratch. Fixed at finish by appending the
rule, both real extents, and the structural instruction to the description via
`pf sprint story update jt5-6 --description`. **Check the owner story's TEXT, not just its
existence** — the existing rule ("confirm the named owner actually exists") is necessary and not
sufficient.

## `pf sprint story add` wrote `repos: pennyfarthing` again — third confirmation, treat as unconditional

Same as the sw8-10 entry: the add minted `jt5-15` correctly (read the id from the output, do not
guess), wrote no description, and set `repos: pennyfarthing` in an `arcade`-only monorepo. There is
still no `--repos` flag. Fix with a surgical in-block replace — locate `  - id: <new>` and the next
`\n  - id: `, assert the block contains exactly one `repos: pennyfarthing`, replace within that slice
only — then verify by PARSING that no story in the epic has `repos != arcade`. A file-wide sed would
have hit any sibling with the same wrong value and hidden the fact that it was ever wrong.

---

## A "no corrections needed" measurement is still worth recording — and the SIGNALS you cannot resolve should be handed over as claims, not omitted (jt5-10, 2026-08-01)

**Situation:** the standing rule in this file is to measure a backlog description's falsifiable
claims before `sm-setup`, because they get copied forward as current fact. jt5-10's description
carried eight citations. All eight verified. The instinct is to say nothing and move on.

**Say it anyway, in the session.** "No corrections" is a measurement result with a cost attached —
the next reader who applies the rule will re-run the same eight checks unless the session records
that they were run and what they returned. One paragraph saves the sweep.

**The more useful half: what to do with an observation you cannot resolve.** While checking the
citations I noticed two things the description leaned on as evidence and could not settle either:
P7DEC zeroes two RUN entries, and its sixth field is `0` where the buzzards carry `PLYR3/4/5`. I
did not know what field 6 WAS. Two bad options — omit it (TEA re-discovers it, or worse doesn't),
or assert a meaning (a guess arrives labelled MEASURED and outranks the story, which is the
`sm-premeasured-corrections-can-be-wrong` failure exactly).

The third option is the right one: **hand it over explicitly labelled as a claim to verify, with
the not-knowing stated.** I wrote "SM did not determine what that field is. If it is the
animation/picture table, a 0 there is potentially decisive; if it is something else, it is noise.
TEA should identify the field before leaning on it." TEA resolved it in ten minutes — field 6 is
`DPLYR`, "RIDERS IMAGE", and a pterodactyl has no rider. Both signals turned out to be **refuted**,
and both had been offered by the story as supporting evidence. Had I asserted either one, the
refutation would have had to fight my label.

**Rule of thumb:** an SM observation is worth passing on when it is cheap to check and expensive to
miss. Pass it as a QUESTION with the check named. Never launder a guess into the Background.

## Filing the follow-up is a FINISH-phase deliverable, and the story cannot close without it

jt5-10's AC-4 required a follow-up story to EXIST with the finding in its description — and no
phase agent can satisfy it, because TEA and Dev do not file backlog stories. TEA correctly raised
it as a **blocking** Delivery Finding and the Reviewer correctly approved anyway, both noting the
same thing: no code can close it.

That combination is worth recognising on sight. **An AC that names a backlog artifact is SM's, and
it is the one finish-phase item that must be done BEFORE `pf sprint story finish`** — afterwards
the session is archived and the finding's detail is one directory further away. Sequence that
worked: file → write the description → audit the auto-written fields → verify by parsing → only
then finish.

Confirmations from the same filing, all previously documented and all recurring exactly as written:
`story add` minted `jt5-16` (**read the id from the output**), wrote **no** description, and set
`repos: pennyfarthing` in an arcade-only monorepo for the **fourth** consecutive time. There is
still no `--repos` flag; the surgical in-block replace plus a parse asserting no story in the epic
has a wrong value remains the fix. `--priority` DOES exist and worked.

**One judgement call worth recording: not every finding needs its own story.** The Reviewer raised
that the citation gate cannot see line references inside claim BODIES. Rather than filing it, I
checked whether an owner already existed — `jt5-6`'s description had been extended at jt5-5's
finish with exactly that structural instruction. So it was routed there and the reasoning written
into the Impact Summary. The rule "a descope must end with a filed story ID **or an existing
owner**" is satisfied by the second clause only if you actually READ the owner's text; jt5-5's
finish is the story where that check failed and had to be repaired.

---

## The finish parser scrapes `**Branch:**` by PATTERN anywhere in the session — Dev's prose line broke `story finish` (jt8-3, 2026-08-01)

`pf sprint story finish jt8-3` refused with "branch 'trunk-based — GREEN landed on `main`
(`f87a318`), pushed.' cannot be verified" — it had scraped Dev's Assessment line
`**Branch:** trunk-based — GREEN landed on main…` as the Branch FIELD and tried to verify a
branch named the whole sentence. Same family as the `**Phase:**` token rule: the parsers match
labelled tokens anywhere in the file, not by section. Fix that worked: reworded Dev's label to
`**Landed on:**` (with a note saying why) and added an explicit `- **Branch:** none` to Story
Details — the documented escape hatch for trunk-based stories whose work is already on `main`.
Finish then ran clean. Extend the post-`complete-phase` grep habit: `**Phase:**`, `**Branch:**`
and any other labelled token the ceremony parses must each appear exactly once, as the field.

## `pf sprint story add` NOW HAS `--repos`, `--type`, `--workflow`, `--priority` — the repos-repair dance is obsolete (jt8-3 finish, 2026-08-01)

DATED CORRECTION to the four entries above that say the add writes `repos: pennyfarthing`
unconditionally and `update` has no repos flag. `pf sprint story add --help` now shows
`--repos TEXT (default: pennyfarthing)`, `--type`, `--workflow`, `--priority`. Filed jt8-9..12
with `--repos arcade --workflow …` and a parse confirmed every story in the epic carries
`repos: [arcade]` — no surgical sed needed. The OTHER halves of those entries still hold:
the add writes NO description (follow with `story update <id> --description`), and READ the
minted id from the output (it minted jt8-9..12 here). Run `--help` before trusting any recorded
flag gap — the toolchain moves.

## `sm-setup` stamped `in_progress` ITSELF this time — the "unconditional" rule becomes "verify, never assume either way" (jt5-2, 2026-08-01)

DATED CORRECTION to the five entries above that say `sm-setup` unconditionally leaves the story
at `status: backlog`. On jt5-2 it flipped `backlog` → `in_progress`, added `started: '2026-08-01'`,
committed the stamp WITH the context in its claim commit, and pushed — all verified from
`pf sprint story show` and `git log origin/main` afterwards, not from its report. Either the
subagent moved or the prompt's explicitness did; both halves of the check stay: run
`pf sprint story show <id> | grep -i Status` after every return, and stamp only if it did not.
Note a re-stamp on an already-stamped story is harmless, but a skipped verify on an unstamped one
is the same invisible-claim hole as ever. Same return also handled the push race correctly
(rebased over a sibling's sw8-17 completion, non-overlapping) — but its context file still shipped
the `## Technical Approach` FILLER stub even while writing a rich Background above it: the cp5-2
rule ("check the CONTENT, fill Approach/Scope with measured pointers yourself") held exactly.

## Add `- **Branch:** none` to Story Details BEFORE finish on trunk-based stories — proactive beats the jt8-3 recovery (jt5-2, 2026-08-01)

Dated confirmation of the jt8-3 entry, from the prevention side: the session never contained any
`**Branch:**` token (only `**Branch Strategy:**`, which the scraper's `**Branch:**` pattern does not
match), the field was added proactively in the finish phase, and `pf sprint story finish` ran clean
first try. Also confirmed: pre-loading the sm-finish preflight prompt with the round structure, the
routed-findings dispositions AND "zero file writes, return text only" produced blocking_count 0 with
every routing independently re-verified — third clean run of that pattern (sw7-16's resurrection
hazard has not recurred when the prompt carries the structure). And when verifying the pushed archive,
split compound assertions: a `count('HTTP/2 200') == 17` check failed because the Impact Summary's own
"17×" prose mention raised the count to 19 — the archive was right and the checker's expectation was
wrong. Anchor counts to the table's row SHAPE (`^\S+\.wav\s+HTTP/2 200`), not to a bare substring.

---

## The falsifiable claim can live in the EPIC description and be wrong for only ONE of the games it names — and the STORY TITLE can carry it too (ad1-2, 2026-08-01)

**Situation:** `/pf-work ad1-2`, "battlezone self-play attract demo — drive and duel
unattended behind the attract text, then opt in". 5 points, `tdd`, nothing parked. The
standing rule (measure a description's falsifiable claims before `sm-setup`) applied — but
the story's OWN description was empty. The claim was one clause in the **epic** description,
which covers six stories: "star-wars and battlezone show rotating text pages".

**Problem:** false for battlezone. `plugins/battlezone/src/core/sim.ts:10` already reads
"Attract is a SELF-PLAYING demo (story AC)"; the attract branch of `stepGame` runs the same
`stepBattle` real play does, with an autopilot driver, through `stepEnemies` AND
`stepSaucer`; `main.ts:307-309` already says "the demo battlefield keeps playing behind the
text". Three of the title's four clauses were shipped. Only the opt-in flip remained — 1
point of work carrying a 5-point estimate, on a `tdd` workflow whose RED would have been
vacuous on arrival against 11 attract-aware test files.

**Two things this adds to the existing rule.**

1. **Look up a level.** A story with an empty `description` is not a story with no claims —
   its epic's description is what `sm-setup` and every reader will lean on. Measure that
   instead. The tell is the same (a falsifiable statement about a file's current state),
   only the file it lives in changed.

2. **A shared description can be wrong for ONE member and right for the rest, and the fix is
   then NOT to correct it.** That sentence names star-wars too, where it is accurate —
   `ad1-1` is unaffected and its premise stands. Editing the epic description to satisfy
   ad1-2 would have broken ad1-1's Background. Correct it in the STORY (description + ACs +
   session assessment) and leave the epic text alone with a note saying which came first.
   The likely origin is worth naming in the session as well: this looked pattern-matched
   from the sibling game in the same sentence, which is a repeatable way for epic prose to
   be half-true.

**The title is a claim surface too.** The user ruled repurpose-without-retitle (as on
jt8-6), so the board still advertises "self-play attract demo — drive and duel unattended".
Say so explicitly in the assessment: a reader who trusts the title will re-litigate work
that shipped in the bz1-10 era.

## Check who owns the dev port at SETUP, not at verification — and put the result in the handoff

The user memory `dev-port-owned-by-sibling-checkout` describes discovering mid-verification
that a screenshot came from another checkout. Doing the probe at setup costs two commands
and turns it into a handoff line instead of a debugging session:

```bash
PID=$(lsof -ti tcp:5270 | head -1)
lsof -a -p "$PID" -d cwd -Fn | grep '^n'      # → n/Users/slabgorb/Projects/a-2
```

Here 5270 was held by a-2, which had landed `uf1-13` minutes earlier. ad1-2's AC3 is a
served-lobby visual check, so without the warning Dev's most natural action — `just serve`,
open 5270 — either fails on `strictPort` or shows a tree without the flip, and a carousel
missing battlezone would be a TRUE observation about the WRONG working copy. Handed over
with `npx vite --port 5290 --strictPort` and "do not kill a-2's server".

**Related: a recipe that sounds like the AC's check may measure something else entirely.**
`just check-showcase` (shipped by uf1-13, documented at `docs/ops/hosting.md:296-330`) probes
the **production** subdomains for HTTP 200. It says nothing about the carousel's contents or
whether a demo moves, so it cannot satisfy an AC about the local lobby. Name the tool in the
handoff along with why it is the wrong one — otherwise Dev finds it, runs it, and it passes.

## DATED CORRECTIONS: `sm-setup` behaved on all three counts this run

Against `cp5-1` ("will EDIT an AC you told it to copy verbatim"), `cp5-2` ("writes your
corrections into the SESSION and leaves the CONTEXT raw"), and the five entries saying it
leaves `status: backlog`:

- **ACs were byte-exact** in the session AND the context. Verified by the cp5-2 method — a
  `python3` `in` test against `yaml.safe_load`'s `acceptance_criteria`, not a grep. Use it;
  it is immune to both the `grep -Eci` alternation trap and your own prose quoting an AC.
- **The context file carried real content** — no `_Approach hints to be refined by TEA/Dev_`
  filler, and the refuted epic claim appeared only inside its refutation sentence.
- **It stamped `in_progress` and `started` itself** (second confirmation after jt5-2).

The lesson is not "it is fixed" — it is that the checks are cheap and the outcome now varies
run to run. Keep running all three; assume neither outcome. One habit plausibly responsible:
the spawn prompt stated the ACs were JUST rewritten and were authoritative, named the exact
filler strings to replace, and listed the required header fields including
`- **Branch:** none`. Both labelled tokens came back with a count of exactly 1.

## Attach the census to the either/or BEFORE asking — third clean run

Same pattern as cp5-2's audio-dispatch survey. The question here ("what should ad1-2 become?")
was put to the user with the measurement already done, the four dispositions named
(repurpose / repurpose-keeping-tdd / proceed-as-filed / close-and-refile), the recommendation
first, and the cost of the wrong branch stated for each. Answered in one click. The ruling is
the user's — the survey is yours, and it is what makes the ruling cheap.

---

## The token rule is broader than `**Phase:**`, and the riskiest sentence is the one AUDITING the tokens (mg1-5, 2026-08-01)

The jt8-3 and jt5-2 entries say: never write the literal `**Phase:**` / `**Branch:**` token in prose,
because `complete-phase` and `story finish` scrape labelled tokens by pattern from anywhere in the
file. I knew that rule, wrote it into my own setup assessment, and **broke it in the act of
reporting compliance with it.** The sentence read "labelled tokens counted — the pointer token
appears exactly once, `<repos-token>` once, and `<branch-token>` once as the Story Details field."
Spelling those two out took the file from 1 occurrence each to 2 each. Backticks do not help; the
scrapers match the raw string, and a backticked token is the same bytes.

**Two things worth generalising:**

1. **The audit paragraph is the highest-risk prose in the file**, because its subject *is* the token
   set. Anywhere else you might mention a token by accident; there you will mention every one of
   them on purpose. Name them ("the phase pointer", "the branch field") instead of spelling them.
2. **Re-run the count AFTER writing the assessment, not just after `sm-setup` returns.** I ran it
   post-setup (clean: 1/1/1/0), then wrote ~90 lines of assessment, and only re-ran it because the
   assessment discussed tokens. That second run is the one that found the defect. The first run
   proved nothing about the file that would actually be archived.

Cheap form, and it belongs in the exit checklist rather than the setup checklist:
```bash
for t in '\*\*Phase:\*\*' '\*\*Repos:\*\*' '\*\*Branch:\*\*'; do printf "%-18s %s\n" "$t" "$(grep -c "$t" "$SESSION")"; done
```
Each must be 1. (`**Workflow:**` is legitimately 2 — Story Details and Workflow Tracking both carry
it in the template.)

## `sm-setup` leaves you checked out on the CLAIM BRANCH — so `git push origin main` pushes a STALE local main and the rejection mimics a sibling race

Two push rejections in a row on this story, and they had **different causes**, which is what makes
this worth recording. The first was a genuine sibling race (a third checkout had claimed sw8-21 and
pushed `ad1-2` context while I was writing). I rebased, which reported `Successfully rebased and
updated refs/heads/feat/mg1-5-atomic-deploy-html-last` — and I pushed again, and it was rejected
again with the same "remote contains work you do not have" hint.

**Cause of the second rejection: I was never on `main`.** `sm-setup` creates the claim branch and
leaves HEAD there, so the claim commit landed on `feat/…` while local `main` sat 3 commits behind at
`d5e0754`. `git push origin main` from a feature branch pushes the local `main` **ref**, not HEAD —
so it dutifully tried to push a stale ref and was correctly refused. The hint text is identical to
the sibling-race hint, so the diagnosis does not fall out of the error.

**Tell:** read the rebase's own success line — it names the ref it updated. If that is a `feat/…`
branch, your commit is not on `main`. Or just check first; it costs nothing:
```bash
git branch --show-current    # before ANY push on a trunk-based repo
```
**Fix on a trunk-based repo** (working tree clean, verified with `git status --short` first):
`git checkout main && git merge --ff-only <claim-branch> && git push origin main`, then push the
branch too so it lands back at 0 ahead and the sibling probe stays accurate. Verified afterwards
from origin by parsing, never from the working copy: branch 0 ahead, `status: in_progress` in
`git show origin/main:sprint/epic-<epic>.yaml`, and the context's ACs still byte-verbatim in
`git show origin/main:sprint/context/…`.

## A description that survives measurement intact still earns a paragraph — and the measurement is where the story gets SHARPER

mg1-5's description was the rare one where every falsifiable claim held (upload order, content
hashing, the already-non-zero exit). Per the jt5-10 rule I recorded the "no corrections" result so
the next reader does not re-run the sweep. But the more useful outcome was that measuring a *true*
description still produced three findings the story did not have:

- the protection is not "alphabetical" at all — the file contains **no `.sort()`**, so the order is
  raw `readdirSync` with no Node guarantee, and this checkout's APFS returning sorted is an accident
  of filesystem, not of code;
- the cabinet ships **12** HTML entry points, not one per app (star-wars alone has three), so an AC
  saying "every HTML entry point" is plural on purpose;
- the accident currently holds cabinet-wide (measured per game: zero non-HTML objects upload after
  the first HTML in any of them) — which is a *stronger* statement of the story's own point, because
  it explains why a test written against the real `dist/` cannot fail.

**So the trigger for measuring is not "the description smells stale."** It is "the description
contains a falsifiable claim", and a claim that verifies still tells you where the mechanism
actually lives. Two of those three findings changed what the RED test has to look like.

**And when the measurement runs out, hand the remainder over as a QUESTION.** CI deploys from
`ubuntu-latest`, a different filesystem, and I could not measure readdir order there. Rather than
asserting "CI is unprotected" (a guess arriving labelled MEASURED) or dropping it (TEA re-derives
it), it went into the context as an open question with the check named and the not-knowing stated —
the jt5-10 pattern, and it did not block RED because the AC's own fix moots the question either way.

---

## A finding's "obvious owner" can be a story that structurally CANNOT hold it — read the text for the MECHANISM, not the theme (ad1-2 finish, 2026-08-01)

**Situation:** routing ad1-2's finding "nothing asserts a `showcase: true` game actually RENDERS when
framed". Grepping the epics for `showcase` surfaced **uf1-19**, titled *"pin the lobby test apparatus —
five guards that do not bite"*. Same subsystem (the lobby), same failure family (guards that cannot
fail), filed one story earlier by a review of the very carousel in question. It read like the owner.

**It was not.** uf1-19's description is entirely about jsdom **test-apparatus fixtures** —
`accessible-name.ts`'s recursive aria-hidden walk, its nodeType guard, `collapse()`, and
`slideFor`'s ALPHA-only cases. Every deliverable it names is a DOM fixture. My finding is about the
framed GAME's canvas being alive, which **jsdom cannot observe at all**. Filing it there would have
buried a browser-harness question inside a story whose whole apparatus is headless — and it would have
looked correctly routed forever.

**The refinement on the existing rule.** jt5-5 established "check the owner story's TEXT, not just its
existence." This adds: check that the owner's **mechanism** can express your finding, not merely that
its **theme** matches. Themes collide constantly (both stories are "lobby guards that don't bite");
mechanisms rarely do. The question to ask is "if someone did this story exactly as written, would my
finding be closed?" — here the answer was plainly no, and it took one `--description` read.

**Then say so IN the new story.** `uf1-20`'s description carries an explicit *"WHY THIS IS NOT
uf1-19"* paragraph. Without it the next groomer sees two adjacent lobby-guard stories and merges
them, re-creating the exact mistake — the reasoning has to live where the collision will be noticed,
not only in an archived session.

## A zero in a comparison can mean DELEGATION, not absence — check before filing "X does this and Y doesn't"

The Reviewer generated its own strongest finding on this story and then killed it, which is worth the
paragraph because the failure mode is subtle and the check is cheap.

The lead: `plugins/battlezone/src/shell/render.ts` sets `ctx.shadowBlur = 8` at five sites;
`plugins/tempest/src/shell/render.ts` has **zero** non-zero assignments — and tempest is the game
whose live-`shadowBlur` GPU cost was measured and removed by tp1-40. A clean, quantified,
precedent-backed finding: battlezone imports a known-expensive pattern into the lobby.

**Invalid.** `src/shared/glow.ts` describes itself as a set-`shadowBlur`-draw-**reset** envelope — the
shared primitive uses `shadowBlur` internally — and tempest's render calls `withGlow`/`glowPolyline`
**20 times**. Tempest's zero means it *delegates* the blur through a helper, not that it avoids it.
Both games pay; neither is the outlier. One grep of the shared module refuted the whole finding.

**Generalise:** any metric of the form "count of pattern P in file F" silently assumes P is written
inline. The moment a shared helper exists, a low count measures **indirection**, not behaviour — and
it will always point at the game that hasn't adopted the helper yet, which is a refactoring
observation dressed up as a defect. Before filing a comparative finding, open the helper the
zero-side imports. Record the refutation rather than deleting it: the next reviewer runs the same
grep and reaches the same wrong conclusion otherwise.

## When a change forces you to edit a guard, the mutation that VINDICATES the edit is the both-sides-move one

ad1-2 flipped `showcase` in a manifest and in the file generated from it, which reddened
`src/host/registry.test.ts`'s carousel-membership guard. "The guard reddened, so I updated it" is
indistinguishable from "the guard was inconvenient, so I loosened it" — and the story had a logged
deviation admitting it touched a file no AC named.

The mutation that settles it: make **both** sides move together (manifest AND generated registry back
to `false` — a *consistent* opt-out). That mutation sails past the stale-registry drift guard, which
only compares the two files against each other, and is caught **solely** by the membership guard.
That is the proof the guard is load-bearing rather than redundant, and it converted the deviation from
a thing to excuse into a thing to cite.

Generally: for a generated-artifact pair, the drift guard covers *disagreement* and something else must
cover *agreed-upon wrongness*. Test the second one explicitly; it is the one that looks covered and
isn't.

## Two smaller things from the same run

**`pf sprint story add --repos arcade` works** — fourth confirmation of jt8-3's dated correction, and
the old surgical-sed repair is now firmly obsolete. Both `uf1-20` and `ad1-7` came out with
`repos: arcade`, verified by parsing every story in both epics for a wrong value. Still true: the add
writes **no** description (follow with `story update --description`) and **mints its own id** — read
it from the output.

**Python `print()` is buffered; `subprocess.run()` writing to the same stdout is not.** A mutation
battery's closing `git status` appeared ABOVE its per-mutation result lines, which reads exactly like
"the tree was already dirty before the first mutation" — a genuinely alarming misreading of a clean
run. Either capture the subprocess output and `print` it, or `flush=True`. The dirty file was in fact
`sprint/epic-ad1.yaml`, stamped `in_review` by `complete-phase` minutes earlier: benign pipeline
bookkeeping, not battery damage.

## A story's own "BLOCKED ON A DECISION FIRST" can be an assumption about WHO decides — measure the blocker's premise, not just its claims (jt8-7, 2026-08-01)

**Situation:** jt8-7 arrived with an explicit instruction in its description: *"BLOCKED ON A
DECISION FIRST: the ROM has four egg masks … and EggState carries no frame field, so the
variant question must be answered before wiring — do not just hardcode CEGGUP."* Every clause
of that was TRUE. Four masks exist; `EggState` really has no frame field.

**And the blocker still dissolved.** The sentence assumes the variant choice is a PORT DESIGN
decision, i.e. ours to make. It is not: `WEGG` (JOUSTRV4.SRC:3507) recomputes the egg's frame
every single frame from `PVELX`'s sign and `PVELY` against `$0080` and stores only the
resulting pointer. The ROM keeps no frame field *either* — which is precisely why our not
having one is not a blocker. Both inputs were already on `EggState` as `velX`/`velY`.

**The generalisation, and it extends the existing rules in this file.** The standing rule is
"re-verify a parked story's blockers" and "measure a description's falsifiable claims". This
adds a third shape: **a blocker can be built entirely from TRUE claims and still be false,
because the false part is the implicit premise joining them.** The tell here was the phrase
"the variant question must be answered" — a question is only ours to answer if the machine
does not already answer it. So when a story says "decide X first", the first move is not to
schedule the decision, it is to check whether the ROM decides X. That took ~15 minutes of
reading and turned a parked-shaped 3-pointer into a specified 5-pointer.

**What still went to the user:** the *scope* question (three still rows vs the full seven-row
table), with the census attached — the four rows enumerated, the selector's truth table
derived, the additive-ness verified by counting every source and mask, and the jt3-7 precedent
located. Answered in one click. Fifth clean run of "attach the measurement, then ask".

## A sidecar entry can assert a PROJECT FACT that is in no config file — and every later agent inherits it

**Situation:** the SM sidecar's jt5-5 entry said *"This project also stands on 'do not use the
Agent tool unless asked', so even preflight was not spawned."* Stated as settled project
policy, in the file every SM reads before acting.

**Problem:** the user challenged it, and a search found it in **no** config on disk — not
`~/.claude/settings.json`, not the project `settings.json` or `settings.local.json`, not
`CLAUDE.md`, not managed settings, not the launch args. The constraint the entry describes does
exist in the session instructions, but the entry presented it as a property of *this repo*,
which nothing on disk supports. It had been read forward as established practice.

**Prevention:** sidecar entries are unguarded prose — no gate checks them, and the next agent
treats them as measured. When writing one that asserts a PROJECT-WIDE fact (a policy, a
setting, a convention), cite the file and line that establishes it, exactly as we require of a
ROM claim. If you cannot cite one, write it as an observation about that session ("this run did
not spawn subagents") rather than about the project. Same family as the user memory
`prose-claims-are-the-unguarded-surface`, one level up: there the false sentence was in a code
comment, here it was in the institutional memory itself, where it propagates further and faster.

## Check the owner's MECHANISM, not its theme — third confirmation, and this time the near-miss was one loop away

Routing jt8-7's ptero finding, `jt5-17` looked like the owner: same game, same subsystem
(collision), same creature (pterodactyl), `status: backlog`. Reading its description settled it
in one minute — jt5-17 owns the **pair loop's** mixed-pair skip (`PTEBRD` routing so a ptero and
a BUZZARD resolve at all, a pair that currently resolves *nothing*), while the finding is the
**player↔ptero** pass, which already resolves via `resolvePteroAttack` and does so with the
wrong geometry. Different loop, different routine, different failure.

Two things this adds to the ad1-2 entry. First, the collision was closer than usual — not
"same theme, different subsystem" but "same subsystem, adjacent loops in the same function",
which is exactly the distance at which a groomer merges two stories. Second, the fix is the
same: the new story (`jt8-13`) carries an explicit *"WHY THIS IS NOT jt5-17"* paragraph, because
the reasoning has to live where the collision will be noticed, not only in an archived session.

---

## The verdict a story ends on can be reversed by ONE late specialist — budget for the fourth round, and probe rather than diagnose (mg1-5, 2026-08-01)

mg1-5 took **four review rounds** on a 3-pointer. That sounds like a process failure and was not: each
round found a real defect of the same class, and the story that shipped is materially better than the
one approved at round 1 would have been. What is worth recording is the *shape*.

**Rounds 2, 3 and 4 all died on the same error, committed by three different participants** (Dev
twice, then the Reviewer): a claim of the form *"I measured this and it catches X"* where the thing
measured was not the thing written down. Round 2: an assertion that could never fail, under a comment
claiming mutation had proven it. Round 3: its replacement, dead for a subtler reason — subsumed by
the assertion running before it, so it could never be the one to red. Round 4: a comment naming the
case-sensitive mutant when the property belonged to the case-insensitive one. **The Reviewer verified
round 4's claim using the wrong variant too**, i.e. reproduced the exact defect while checking it.

The generalisable rule: **every claim checked by re-running the EXACT quoted string survived; every
claim checked by running something morally equivalent did not.** When a comment says "measured", the
mutant it names must be the mutant that was run, pasted verbatim, so the next reader can re-run the
string rather than reconstruct the intent.

**Two SM-level consequences:**

1. **A late specialist can reverse a drafted verdict.** In round 2 the Reviewer had three clean
   specialist reports, a hand-assessment of the fourth domain, and an APPROVED verdict written — and
   the fourth specialist returned after a `SendMessage` probe with the finding that overturned it.
   The documented pattern ("an overdue specialist is probably ALIVE — probe it, don't diagnose it,
   and never re-dispatch, which consumes the capacity the original holds") paid for itself outright.
   Budget wall-clock for the slowest specialist, not the median: test-analyzer ran 340-560 s across
   rounds while the others finished in 110-290 s.
2. **A long-running specialist's measurement can be STALE ON ARRIVAL.** Round 3's preflight ran ~792 s
   and reported 16 vitest failures from a sibling's jt8-7 RED tests — correctly, when taken. By the
   time it was read, jt8-7's GREEN had landed and the suite was 11105/0. On a trunk-based repo where
   siblings commit failing tests to `main` by design, a subagent's test count is a claim with a
   timestamp. Re-measure before acting, in either direction.

## When the last finding is prose, `/pf-chore` is the exit — not a fifth TDD round

Round 4 approved with one Medium outstanding: a single false sentence in a test comment. Rejecting
would have meant TEA writing a test for a comment, Dev editing a sentence, and four specialists
re-spawning. The Reviewer instead approved and specified the correction **with verified replacement
text**, routed to SM as a chore; SM applied it, re-measured all four combinations, and committed it
(`3c4ab11`) before running `story finish`.

The test for whether this is legitimate rather than a shrug: **is the defect in the code/tests, or in
prose describing them, and does any coverage gap exist?** Rounds 2 and 3 blocked because an assertion
could not fail — the test was defective. Round 4's assertions were all load-bearing and
mutation-proven; only a sentence was wrong. Supply the exact replacement so nothing is re-derived,
record the trade openly (the Reviewer wrote "I am trading a small residual risk for a large process
cost, deliberately"), and say that if the chore does not land the finding must be re-raised rather
than quietly dropped.

## Attribute a red suite BEFORE finishing — a sibling's RED phase reddens `main` for everyone

At mg1-5's finish, `npm run lint` had 3 errors and `test:orchestrator` was 371/1. **None was mg1-5's**
— all of it was a sibling's in-flight uf1-15 RED tests (`plugins/star-wars/tests/core/tie-aim-axis.test.ts`),
and the one failing orchestrator test was `shared-tests-typechecked.test.mjs`, which asserts
`tsc --noEmit` exits 0 and is therefore red for exactly that reason. mg1-5's own surface was 27/27
with no lint error naming a file it touched.

This is the expected steady state mid-sibling-story on a trunk-based repo, not a regression — but it
must be **attributed in writing before finish**, both in the Impact Summary and in the `sm-finish`
prompt. Otherwise the archive implies the story shipped red, and the preflight subagent may report a
sibling's failures as this story's blocker. Pre-loading the attribution into the spawn prompt (along
with the round structure and the routed findings) again produced `blocking_count: 0` with zero file
writes and no PR attempt — fourth clean run of that pattern.

## `pf sprint story add --repos arcade` works; the finish left the ACs intact

Filed mg1-16/17/18 with `--repos arcade --type --priority --workflow` and a parse confirmed every
story in the epic carries `repos: arcade` — the old surgical-sed repair is obsolete, as the jt8-3
correction said. Still true and still worth doing: **read the minted id from the output** (it minted
16/17/18 in sequence) and **follow with `story update --description`**, since add still writes none.
Post-finish parse confirmed mg1-5's own `acceptance_criteria` count unchanged at 5, exactly one
completed-sprint row carrying its own points and date, and the archived session still holding all
four Reviewer Assessments. Note `sprint/archive/sprint-2628-completed.yaml` carries a PRE-EXISTING
duplicate `SH2-18` — inherited, not from this finish; do not "fix" it mid-ceremony.

---

## TWO BACKLOG STORIES CAN OWN THE SAME BUILD — and the deciding question is "can it be descoped?", asked before you offer the split (uf1-9 setup, 2026-08-02)

**Situation:** `/pf-work uf1-9` ("joust DYTBL cadence rows … 11 rows", uf1, 5pt, p3, tdd). Board
was clean by every probe: no remote branch, no sibling session, prerequisites all `done`. While
measuring the description I grepped `BOUPWD` across the epics and hit **`jt5-8`** ("The enemy's
wing-down LATCH", jt5, 5pt, p3, tdd, `backlog`) — which cites `BOUPWD :3864-3865`, `BOUPWU :3894`
and `DYTBL :7314-7315` **by line** and names the identical risk ("MOVES EVERY jt2 SEEDED-REPLAY
FINGERPRINT" vs uf1-9's "a real determinism blast radius on the demo replays").

**What is new here.** The existing entries in this file are about routing a *finding* to an owner
story (ad1-2, jt5-5, jt8-7: "check the owner's MECHANISM, not its theme"). This is the other
direction — **two unstarted stories, in different epics, that both build the same thing.** Neither
is a finding needing a home; both are funded work. Nothing in the tracking system objects, because
each is individually well-formed. The tell was cheap and worth making a reflex: when a story names
a ROM routine or symbol as its central build, **grep that symbol across `sprint/epic-*.yaml`**, not
just across the code. Same points, same priority, same workflow and the same cited lines is not a
coincidence.

**The move that made the user's ruling one click.** The obvious offer is a clean split — "let jt5-8
own the latch, uf1-9 wires rows on top". I nearly offered it. Measuring first killed it: **all nine
of uf1-9's timer rows write `PJOYT`** — the four wing rows *and* all five decision timers (`STA
PJOYT,U` at `:3910`, `:4061`, `:4284`, `:4317`, `:4376`), which I only knew because I had read each
cited line's *next* line. So uf1-9 needs the latch regardless of who owns it, and the clean split
was never available. Offering it would have handed the user a choice that did not exist.

**Generalise:** before presenting an ownership either/or, check whether the shared component is
reachable from *both* stories' remaining scope. If it is, the only real options are ordering and
merging — say so, and do not pad the question with a split you have not verified is possible. This
is the "attach the census" rule (cp5-2, ad1-2, jt8-7) applied to the option list itself rather than
to the recommendation: the census should prune options, not just rank them.

**Disposition recorded in three places** so it cannot be lost: the ruling paragraph in the session,
a `🔨 USER RULING` block in the context naming jt5-8 as **not the phase agents' to edit**, and a
finish-phase obligation to re-scope jt5-8 to what actually remains (the dumb brain's wingbeat
`LNTUP :3746-3748`/`LNTOFP :3759-3762`, which is not a DYTBL row). That last one is the jt5-10
shape — an obligation no phase agent can discharge — so it must happen **before** `story finish`.

## A story's own PREREQUISITE can invalidate its description's identifiers — `git log -S` names the commit

uf1-9's description names `smartDecision` four times as the function to change. It does not exist:
`uf1-8` — listed in uf1-9's own description as the story that shipped the seam — **deleted it**,
splitting it into `boundr`/`b2undr`/`shadow` behind a `runBrain` dispatcher. `git log --oneline -S
smartDecision -- plugins/joust/src/core/enemy.ts` named the commit (`2346bed feat(uf1-8): GREEN`) in
one call.

The existing rule says measure a description's falsifiable claims. This sharpens *where to look
first*: *if the description credits a prerequisite that has since shipped, every identifier the
description names is suspect*, because that prerequisite is exactly the change most likely to have
renamed them. The trap is that the story reads as *more* trustworthy for citing its prerequisite.
Note also what survived the rename — `tests/difficulty-wiring.test.ts`'s `knightsBelowTheBuzzards`
and `brakeDecidingFrames` are still there, so the staging *advice* was good and only the *mechanism
sentence* around it had rotted. Correct the identifier, keep the advice.

## "each of these five" is a claim about EVERY member — and it was false for one, twice, in one story

Two independent instances in a single description, both caught only by checking every member:

- "the DECISION timer BOLETM, HULETM, SHLETM, SHUPTM, SHCLTM (**each** 'TIME UNTIL NEXT DECISION')"
  — four carry that ROM comment. **SHCLTM `:4375` carries a bare `#8`** and sits under `SHDICL …
  SLOW DOWN!!! GOING INTO A CLIFF`: a cliff-avoidance brake dwell, a different mechanism. The
  misgrouping had already propagated into shipped code — `ROW_DISPOSITION` labels it
  `missing: DECISION`.
- "**Each** row's GA1 column 1 equals the pre-DYTBL immediate in its own ROM comment … a free
  check" — true for **nine of eleven**. SHLETM is `$0015` (21) against a comment of `8+1` (9);
  SHUPTM is `$000A` (10) against `8+1` (9). A blanket eleven-row sweep reddens on two *correctly
  ported* rows, so the AC now requires the two be excluded **by name** with the divergence recorded.

Both were confirmed from two independent sources before being written down (the vendored `.SRC` and
the already-decoded table in `difficulty.ts`, which agree) — the
`sm-premeasured-corrections-can-be-wrong` guard, since these arrive labelled MEASURED and outrank
the story. The cost of checking all members is one `awk` over the cited lines; the cost of trusting
the quantifier is a RED phase built on a false universal. Related but distinct from the user memory
`rom-table-continuation-bit`: there the *extent* of a table was under-read; here the *predicate* was
over-generalised across members that were all correctly enumerated.

## Small confirmations from the same setup

**Push the beacon without checking out.** `git push origin main:refs/heads/feat/<id>-<slug>` creates
the zero-commit claim branch while leaving HEAD on `main`, which structurally prevents the mg1-5
stale-ref trap (there, `sm-setup` left HEAD on the claim branch and `git push origin main` pushed a
stale ref while the error text mimicked a sibling race). Verified 0 ahead afterwards.

**The push race is now routine, and the rebase can touch your own file.** The rejection here was a
genuine sibling (`a-3` landing `uf1-15`) — and `uf1-15` lives in the **same epic YAML** I had just
edited. It rebased with no conflict, but that was luck: verify afterwards by parsing that both
stories survived with their own field values, plus the conflict-marker grep over `sprint/`. Read the
rebase's success line for the ref it updated (`refs/heads/main` here) before pushing again.

**Authoring the context beats correcting it.** With `acceptance_criteria: null` and five defects in
the description, the documented `sm-setup` failure modes (stub context, edited-AC-plus-a-note-saying-
it-was-not-edited, corrections written to the session only) were all live at once. Writing both files
directly avoided every one of them; the verification that matters is unchanged — a `python3` `in`
test of each AC against `yaml.safe_load`, and the labelled-token count re-run **after** the
assessment prose was written, not just after setup.

---

## A story whose DELIVERABLE is citations must have its own citations measured — four of sw8-18's eleven had already rotted (sw8-18 setup, 2026-08-02)

The standing rule is "measure a description's falsifiable claims." This story is the case that
shows *when the rule is not optional*: sw8-18's entire body is twelve file:line claims, and its
deliverable is correcting file:line claims. If its own pointers have drifted, every correction
lands in the wrong place — and four had (item 9 by +32 lines, item 10's three anchors by +38,
+13, +3). The claims survived at the corrected lines; only the pointers rotted, which is the
story's own thesis demonstrated on itself.

**The ROM, by contrast, held perfectly** — ten premises verified line-exact. That asymmetry is
the reusable finding: **vendored ROM source is immutable and its citations never rot; in-repo
citations rot continuously.** Spend the measurement budget on the in-repo half.

## The sharpest finding was that the story's ROOT CAUSE was false, and it arrived labelled as a root cause

sw8-18's title promised "the mechanical guard that would have caught them" and its root cause
explained that its absence was why all eleven survived. Both false. Classifying each item against
the guard's own spec — extract `<file>:<line-span>` from source comments and re-open them — gave:

- **item 7 only** is caught as specced. Item 8's citation is the bare-colon form `:2273-2290`
  (no filename — the known `bare-colon-citations-evade-gates` trap); item 4's is a bare filename
  with no line; item 2's span still *contains* its quoted verbatim, so verbatim-matching passes it.
- **item 10's span is CORRECT** (`WSSTAR.MAC:98`). The false part is the prose around it. No
  span-checker can ever see that class.

Three of twelve, once widened. Unmeasured, TEA would have written an unfalsifiable AC or a
Reviewer would have bounced a correctly-built guard for missing items it structurally cannot see.

**Generalise:** a "root cause" paragraph is the highest-status prose in a filing and the least
likely to have been checked — it is written last, when the finder is certain. Classify each item
against the proposed fix *individually* before accepting that the fix addresses the class. The
test is mechanical: for each item, ask "would the proposed guard have fired?" and count.

## Two counting errors, both mine, both caught by re-measuring rather than by thinking harder

1. **The over-count.** Item 10 cited five `LDD ST.UX` sites to refute sole readership. Three sit
   inside the `.REPT 0` block — assembled OUT, as the very same bullet list already correctly
   says, and that block is *item 8's own subject*. Only two are live. The refutation survives on
   two, but a fix citing five would reintroduce the defect class inside the correction.
   **Adjacent items in one filing can share a mechanism and contradict each other; read them as
   a set, not a list.**
2. **The under-count.** My condensation sweep used a case-sensitive `only reader` and missed a
   site writing `ONLY reader`. Count went 9 → 10. The AC now mandates a case-INSENSITIVE check,
   because the obvious verification passes while a site survives. Same family as
   `measured-claims-need-exact-strings`: the check that feels equivalent is not.

## Predicting a sibling collision, then watching it land inside the same setup

I filed a Delivery Finding that uf1-15 (RED committed to `main`, story `in_progress`) would move
this story's `tie-status.ts` anchors. Its GREEN landed ~15 minutes later, in the sibling race that
rejected my first push, moving the anchor **+79 lines**. Re-measured after `5a15f21`, rewrote the
ACs against the new numbers, and converted the finding from prediction to fact with both commit
SHAs in it.

**The baseline number changed twice, in both directions.** First measurement: 2103/10 failed, all
ten attributable to uf1-15's RED. At handoff: **2113/2113 green**, because its GREEN closed them.
Attribution was correct *and* re-measuring was still necessary — handing off the first number
would have started TEA reproducing a red suite that no longer exists. The existing entry says a
subagent's test count is a claim with a timestamp; this extends it to **your own** count.

## `sm-setup` was not spawned at all, and the setup was stronger for it

Session instructions bar the Agent tool unless the user asks. So context, session and ACs were
hand-written. Given this file's rap sheet against `sm-setup` — stub contexts reported as
validated, corrections written to the session but not the context, ACs edited while asserting
they were not — the hand path cost one extra pass and removed an entire class of verification.
State this as what happened on this run, not as project policy (per the entry on sidecar entries
asserting unciteable project facts).

**One thing the hand path must not skip:** the labelled-token count, re-run AFTER the assessment
is written, not just after the files are created. Ran clean here (1/1/1/2) on both passes.

## The user's backlog ruling is a FINISH deliverable with a deadline — and the re-scope must rewrite the TITLE too (uf1-9, 2026-08-02)

The setup ruling ("uf1-9 owns the PJOYT latch; jt5-8 gets re-scoped at finish") is the jt5-10 shape:
an obligation no phase agent can discharge, due BEFORE `pf sprint story finish` archives the session
that explains it. Done here in the right order — re-scope, file, verify, then finish.

Two refinements on the existing entries.

**Rewrite the title, not just the description.** jt5-8 was titled "The enemy's wing-down LATCH — our
brains recompute each wake and latch nothing". uf1-9 built that latch, so the board was advertising
shipped work. The jt8-6 and ad1-2 entries in this file record the *opposite* case (the user rules
repurpose-WITHOUT-retitle, and the stale title must then be disclosed) — the distinction is who
decided: there the user chose to keep it, here the ruling was to re-scope, and a re-scope that leaves
the title advertising the old scope is half a re-scope. `pf sprint story update --title` exists.

**A re-scoped story needs an explicit ALREADY-SHIPPED, DO-NOT-REBUILD paragraph.** Not just "what
remains" — the next picker's real risk is re-deriving the part that landed. jt5-8's rewrite names the
`PjoyState` union, the asymmetric entry, the frozen down-seek hold and the flap/flapHeld split as
done, then states the remainder (`LNTUP`/`LNTOFP` and the player-side `flapHeld`) and why it is
genuinely separate: neither is a DYTBL row. That sentence is what stops the next groomer merging it
back.

## Prose defects the review found: fix in place, but say so in the Impact Summary

Two false universals were fixed at finish rather than filed — `difficulty-wiring.test.ts`'s "Every
DYWORD row's GA1 column 1 reproduces EXACTLY the immediate" (false for two rows, which is this very
story's AC6) and `audio-flap.test.ts`'s "ONE bit doing both jobs" (which the story made false by
splitting them). Neither is asserted by any test, which is exactly why they survive; filing them
would have parked a known-false sentence in the tree for a sprint.

The rule that keeps this honest: an in-place prose fix must appear in the **Impact Summary** as a
fix, with the reason it was not filed. Otherwise the archived record shows a clean finish and the
next reader cannot tell a corrected claim from one that was always right. Same for the three stale
line-citations — repairing them as NAMED references (`BOUNDR_DOWN_BRAKE`, `ROW_DISPOSITION.LAVGRA`)
rather than corrected line numbers is the durable fix, because the next story that grows the file
breaks the numbers again.

## Filing three follow-ups: check the MECHANISM of every candidate owner, and expect none

Searched every open story in jt5/jt8/uf1 for `B2UP3`, `SHUP3`, `PPVELX`, `BOLEV2`, `BOFAST` before
filing — zero hits, so all three findings were genuinely unowned. Worth doing even when you expect
that answer: the ad1-2 and jt8-7 entries in this file are both cases where a plausible owner existed
and was WRONG, and one grep is cheaper than either mistake.

`pf sprint story add --repos arcade --workflow --priority` behaved (fifth confirmation), still writes
no description, and still mints its own id — jt5-18, jt5-19, jt8-16 were read from the output, not
guessed. The one that would have bitten: jt8-16 exists only because jt8-2's own source comment
DEFERRED `PPVELX` to uf1-9 by name, and uf1-9 did not do it. A deferral written into a code comment
is invisible to every backlog grep; when a story's module carries "this belongs to <story>", check at
that story's finish whether it actually landed.

---

## A completed-sprint conflict can have SHARED trailing fields — a marker-strip silently robs the sibling's row (sw8-18 finish, 2026-08-02)

The finish raced a sibling's and both appended a row to `sprint/archive/sprint-2628-completed.yaml`.
The conflict looked like the usual add/add:

```
<<<<<<< HEAD
  - id: uf1-9
    epic: uf1
    title: …
=======
  - id: sw8-18
    epic: sw8
    title: …
>>>>>>> 8c00d7b
    points: 5
    completed: '2026-08-02'
```

**Look at where `points` and `completed` are: OUTSIDE the markers.** Git found the two rows'
trailing fields identical and left them unconflicted, so they belong to *whichever row ends up
last*. The union-resolve reflex used everywhere else in this file — strip the three marker lines,
keep both sides — produces a `uf1-9` row with **no points and no completion date**, and a valid
YAML file that parses, commits and pushes clean. Nobody would see it until someone totted up the
sprint.

**Prevention:** on any conflict inside a LIST OF RECORDS, do not resolve by deleting markers.
Reconstruct each record whole, taking its authoritative fields from the two sides:
`git show origin/main:<file>` for theirs, `git show <your-sha>:<file>` for yours. Then assert both
records are complete before continuing:

```bash
python3 -c "import yaml;rows=yaml.safe_load(open(F))['completed_stories'];
print([ (r['id'],r.get('points'),r.get('completed')) for r in rows if r['id'] in (A,B) ])"
```

The tell that you are in this case: the conflict block ends and the next line is still indented as
a field rather than starting a new `- id:`. Same family as the existing entry on union-resolving
sidecar files, but the opposite conclusion — sidecars are prose and union is right; record lists
are structured and union is a data-loss bug.

## EXTEND the existing story when the MECHANISM is literally the same clause

The ad1-2 and jt8-7 entries say: check whether an existing story's mechanism can express your
finding, and if not, file a new one with a "WHY THIS IS NOT X" paragraph. This run hit the other
side of that test and it is worth recording, because the reflex by now is to file.

The Reviewer found that the new guard's relocation hint is first-occurrence and can name the wrong
routine. `td1-14` already owned exactly that defect — "count occurrences of the verbatim; if > 1,
refuse to guess" — for a *different* tool (`reanchor-citations.mjs`). Different tool, different
artifact, and different blast radius (that one silently WRITES a wrong anchor; the new one only
PRINTS a wrong suggestion). By the strict mechanism test they are separate stories.

**But the mechanism here is a four-line guard clause, identical in both call sites.** Filing a
second story would have produced two adjacent stories a groomer merges on sight — the exact
outcome the "WHY THIS IS NOT X" paragraph exists to prevent. So: extended td1-14's description to
name the second tool and its measured near-miss, and bumped 2pt → 3pt.

**The refinement:** the question is not "same theme or same mechanism" but **"would one edit close
both?"** If yes, extend and say what you added and why the points moved. If the two need different
code in different places, file separately. Splitting one clause across two stories invites one of
them to drift.

## Verify the Reviewer's numbers before applying the chore they route to you

The Reviewer rejected a headline metric as false and handed me exact replacement text. The
standing rule says a subagent's status claims are unsourced — that applies to the Reviewer too,
and the chore was about to write a *correction* into the permanent record, where being wrong twice
is worse than being wrong once.

Re-ran it: throwaway worktree at the pre-story SHA, final checker against it → **49**, current
tree → **35**. The Reviewer's decomposition held exactly. Cost: two commands. Had it not held I
would have been about to commit a false correction of a false claim.

Same for the other two items — I re-opened the guard's own header citation and confirmed the
observation had moved, and re-ran the ratchet against the live count before tightening it. All
three stood. **Verifying a correction is cheap and the failure mode is recursive.**

## Chore-as-exit, third clean run — and this time the chore MUTATION-PROVED itself

mg1-5 established that a prose-only finding exits via `/pf-chore` rather than another TDD round.
This story extended it: one of the two required corrections was a *test* change (a ratchet from
146 to 35), which is not prose. It still belonged in the chore, because the test for whether a
finding needs a round is "does anything need to be re-derived?" — and here nothing did: the
Reviewer supplied the number, the measurement was already in the transcript, and the change is one
token.

What made it safe was proving the tightened guard now bites: adding one stale citation reddens
both the ratchet and the per-file gate, where at 146 it reddened neither. **A chore that changes a
threshold must mutation-prove the new threshold**, or you have swapped one unfalsifiable assertion
for another and called it a fix.

---

## When the story's deliverable is a MEASUREMENT TOOL, RUN it — reading the source verified the filing, running it produced three findings the filing did not have (sw8-23 setup, 2026-08-02)

**Situation:** `/pf-work sw8-23`, four review findings against
`plugins/star-wars/tools/audit/check-comment-citations.mjs`. Every claim was a statement about
that file's behaviour, so the cheap path was to read the four cited line numbers and confirm
them. That path works: all four findings verified exactly as filed, including both numeric ones
(744/1000 = 74.4%, six `fromFile` call sites). A "no corrections needed" setup.

**The three findings that only appeared once the tool was EXECUTED** — importing `checkTree` /
`checkCitations` / `extractCitations` into a scratch script and running them against the real
tree — are each larger than anything reading found:

1. **The guard opts ITSELF out.** It *defines* the pragma as a string literal
   (`export const IGNORE_PRAGMA = 'citation-guard: ignore-file'`), and a separate finding says
   the opt-out gates on an unanchored `raw.includes`. Independently filed, mechanically coupled:
   `checkCitations(<the guard's own source>) -> 0 errors`, so the finding "it cannot see its own
   directory" survives its own fix. **A test asserting "the guard now checks itself" passes
   vacuously unless the opt-out is anchored first.** Neither finding mentions the other.
2. **Two stated limitations were ONE population.** The filing read "744 of 1000 get range-checking
   only … *and* a single-token adjacent quote is never verbatim-checked", which a reader totals.
   Re-running the adjacency scan without the `isFragment` filter gave 744 = **698** with nothing
   adjacent + **46** single-token, i.e. a subset, because the filter nulls a non-fragment and
   downstream that is indistinguishable from "no quote". Writing both into the tool's honest-scope
   paragraph would over-claim its blindness — the same defect class the tool exists to catch.
3. **Widening a guard's scope to include its own source surfaces its DOCUMENTATION as defects.**
   Three errors appeared inside `tools/audit/`, all correct as written: an elided `…design.md:47-48`
   in a format example, a deliberately-historical span the header preserves to explain the
   bare-colon case (the live citation it describes is already corrected), and a `.d.mts` doc
   comment whose bare span inherits the wrong filename. **Audit tooling documents its format by
   exhibiting it.** Fixing them into currently-true citations destroys what they document; the
   module already shipped the mechanism (a `RETIRED:` marker for prose that quotes a citation in
   order to disown it).

**Generalise:** the standing rule is "measure the description's falsifiable claims." This adds
*how* to measure when the subject is executable: **import it and run it, do not read it.** Reading
confirms the claims that were filed; running finds the ones nobody thought to file — interactions
between findings, populations that turn out to overlap, and what the change will do on arrival.
Budget for it: three scratch scripts, ~15 minutes, and it is also the only way to satisfy a
description that says "measure the fresh count before promising green".

**Corollary for scope-widening stories generally** (a linter, a gate, a typecheck exclusion, a
CI matrix): the first thing a widened scope hits is the tool's own tree. Measure that specifically
and separately from the headline count — here it was 10 fresh errors in unrelated bake tools
versus 3 inside the audit tooling itself, and only the second group needed a design decision.

## A census can PRUNE the option list, not just rank it — and one of the two questions then answers itself

Both either/ors went to the user with the measurement attached (the documented pattern), but they
behaved differently and the difference is worth keeping.

- **`fromFile`: wire it or drop it.** The census — **zero** relative-path citations exist anywhere
  in the scanned tree, so the feature has no users; and the 8 real basename collisions are already
  covered by a path-qualified rule the tool's own header documents — did not merely favour "drop",
  it removed the argument for "wire". One click.
- **The `.mts` scan gap** (SM-found, not in the filing: `extname('x.d.mts') === '.mts'` and
  `SCAN_EXT` lacks it, so both type declarations stay invisible even after the directory is added).
  Genuinely a scope call — fold in, or file a follow-up about a one-token array edit. The user
  folded it in.

**The tell for which kind you have:** if the census can make one branch *pointless* rather than
merely *worse*, say so in the question. If it can only make one branch bigger, it is a real scope
call and the user is choosing sprint shape, not correctness. Do not dress the second up as the
first — and do not skip asking the first just because the answer looks obvious once measured.

## Not every SM observation resolves — hand the unresolved one over with the check named

Two of the ten fresh errors are bare `.test.mjs` "cited file does not exist" entries with no
filename stem, and the same shape appears **five times in the existing baseline**. `FILE_RE`
accepts a leading `.`, so this may be an extractor defect rather than ten citations to re-anchor.
I did not determine which, and asserting either would have arrived labelled MEASURED and outranked
the story. It went to TEA as "classify these before treating them as remediation work — if it is
an extractor defect it is arguably out of scope and should be filed." Same shape as the jt5-10
`PLYR3/4/5` field-6 hand-over, and the reason it is cheap: the check is named, so resolving it is
minutes rather than a re-derivation.

---

## An OWNER story's number goes stale when your story changes the thing it counts — re-measure it at finish, and rewrite its TITLE (sw8-23 finish, 2026-08-02)

**Situation:** routing sw8-23's findings, `sw8-24` was the obvious owner of the tree-wide
sweep — it exists solely to close what this guard reports. Its mechanism fit perfectly, so by
the standing rule ("check the owner's MECHANISM, not its theme") it was a clean route.

**What the rule does not cover:** sw8-24's *description* was built on measurements my story had
just invalidated. It said "35 stale citations", planned the work around a migration-artefact
grouping (`math3d.ts:607-618`, `context-story-8-3.md`, `.session/8-6-session.md`), and promised
"grouping those may make the sweep much smaller than the count suggests." Measured at finish:
the count is **29**, over a **wider** surface, and **none** of the three worked examples is
reported any more. A picker following that description would plan around a grouping that no
longer exists and be surprised by a different 29.

**The addition to the rule: a story that changes what an owner story MEASURES owes that owner a
re-measurement, not just a routed finding.** The tell is mechanical — if your story moves a
number, `grep` the epics for that number and for the tool that produces it. Cost: one command
and one `--description` update. Cost of skipping: the next picker re-derives the whole shape,
or worse, trusts it.

**And rewrite the TITLE.** sw8-24's title carried "~35" on the board. `--title` exists; a
re-scope that leaves the title advertising the old number is half a re-scope (same conclusion
as uf1-9's jt5-8 rewrite, arrived at from the measurement side rather than the scope side).

## "Would one edit close both?" resolves EXTEND-vs-FILE — and it can answer differently for two findings from the same review

Three routing decisions on one story, all using the same test, landing in three different places:

- **EXTEND `td1-14`** with the relocator's window defect. Strictly, one edit does *not* close
  both clauses (one adds a uniqueness check, the other changes a window seed). But both live in
  the **same six-line loop**, and shipping them separately means two stories editing the same
  lines — the drift hazard the rule exists to prevent. Extended, points 3→5, second clause named
  explicitly.
- **FILE `sw8-25`** for the association rule binding a quote to the wrong citation. Same file,
  same theme (relocation accuracy), and I nearly folded it into td1-14 — but it is **upstream**:
  the wrong quote is chosen *before* any relocation search runs, so td1-14's fixes would
  faithfully relocate a quote that was never that citation's. Different function, different edit.
- **FILE `sw8-26`** for two findings at once (a failed opt-out is invisible; one unreadable file
  aborts the scan). Different symptoms, but one claim — *a green run means every file was
  checked* — and both fixes touch the same function.

The refinement worth keeping: when two findings sit in one file, ask **where in the pipeline**
each one fires. "Same file" and even "same subsystem" routinely hide an upstream/downstream
split, and the downstream story silently assumes the upstream one is correct.

## Verify the routed chore's NUMBER by the method that would have caught the original error

The Reviewer routed two corrections with replacement text. The standing rule says verify them —
I did, and one needed a *different verification method* than the one that produced it.

The claim was "seven phantoms, not six". My first re-derivation classified each vanished error
by asking "would the new extractor produce this name?" in a synthetic one-line fixture. That
returned **six** — agreeing with the number under correction, and looking authoritative. The
seventh (`Sheet.ts`) passes in isolation and is rejected only **in situ**, because the mechanism
rejecting it is a lookbehind on the preceding character. A classifier that re-creates the
context destroys exactly the cases whose defect *is* the context.

Re-derived from the real vanished-error set instead: 7 phantoms, 9 real, and the accounting
closed (`44 − 16 + 1 = 29`). **When a correction is about a count, verify it against the real
before/after sets, never against a reconstruction of the cases** — and treat agreement with the
number you are correcting as a warning sign rather than a confirmation.

## Two things the finish surfaced that are NOT this story's to fix

- **`sprint/archive/sprint-2628-completed.yaml` has six rows missing `points` and/or
  `completed`** — `tp1-2`, `tp1-20`, `cp4-3`, `sw8-2`, `jt4-4`, `sw8-12`. That is the
  shared-trailing-field data-loss bug this file already documents, with six historical victims.
  Mine landed complete (`sw8-23, 3, 2026-08-02`). Do not repair them mid-ceremony; worth a
  dedicated cleanup chore, and worth a parse (not an eyeball) after every finish — the check is
  `[r for r in rows if r.get('points') is None or r.get('completed') is None]`.
- **A finding can be a CONFIGURATION choice rather than work.** `comment_analyzer` is disabled
  in `workflow.reviewer_subagents`, and it is the specialist whose domain held four of round
  one's six findings — across two consecutive stories in this epic whose only real defects were
  claim prose. That is strong measured evidence, but it is a setting the user chose. Filing it as
  a backlog story would queue someone else's decision; it belongs in the report to the user with
  the numbers attached. **Not every finding wants a story — some want a sentence to the person
  who can change it.**

---

## A filed repro can be EXACTLY right and reproduce on only ONE of four harnesses — the filing names the seed and forgets the fixture (jt9-1 setup, 2026-08-02)

**Situation:** jt9-1's headline evidence was "REPRODUCED in real seeded play, not argued: seed
0x2468, frame 2688, process 514 promotes to boundr while carrying `{kind:'glide'}` — 1 of 11
promotions across 0xbeef/0x2468/0xface at 3000 frames." Six independent particulars, all
falsifiable, filed by a Reviewer who had actually run it. The sw8-23 rule said run it rather than
read it, so I did.

**Every particular was correct — and it reproduced on one harness of the four I tried.**

| harness | promotions | glide-carrying |
|---|---|---|
| `createGame` + both players **IDLE** | **11** | **1** — 0x2468 f=2688 proc 514 ✓ |
| `createGame` + the plugin's `scripted` inputs | 14 | **0** |
| `createWaveDemo` + `scripted` | 6 | 0 |
| `createWaveDemo` + idle | 10 | 0 |

The filing named no harness, and the harness it did *not* use is the one anyone would reach for:
`scripted`/`inputsAt` is the shared jt5-1/jt5-3 script, the vocabulary of every audio test in the
plugin, and the coordinate system of all four files the same story's determinism warning names.
On it, the cited process promotes at frame **1792** carrying nothing. **A TEA taking the obvious
path measures zero and concludes the finding is stale.**

**Generalise — the missing axis is not the number, it is the SETUP.** The existing entries in this
file cover claims that are wrong (re-measure) and counts that go stale (re-measure at fix time).
This is a third shape: the claim is *right*, reproducible, and honestly reported, but it is
conditioned on an unstated experimental setup, and the default setup falsifies it. The tell is
mechanical — **a repro citing a seed and a frame but no harness, input script, or entry point is
under-specified.** Ask "what would I have to type to see this?" and if more than one answer is
plausible in the repo's own vocabulary, run all of them.

**Corollary: a rare effect needs its control filed alongside the fixture.** The effect here is
1 promotion in 11, so the post-fix AC ("sweep for a glide-carrying promotion, assert the count is
ZERO") is a hair from vacuous — a broken sweep passes it forever. I measured the control in the
same run: glide is carried on 132–466 enemy-frames in *every* harness including the ones with zero
glide-carrying promotions. That number is what makes a zero an observed zero, and it went into the
AC. **When you hand forward a "count is zero" criterion, hand forward the positive control that
proves the sweep can see the thing.**

## The Reviewer's own "file this with X" line is a routing instruction nobody executes

jt5-8's Reviewer filed seven findings. The story carried three forward. **R-2's disposition column
literally read "file with R-1" — and it was filed nowhere**, in any epic. R-4's said "reword or
drop the count" and its target comment is still on disk, word for word, ten commits later.

The existing entry says filing a follow-up is a FINISH deliverable. This adds the audit that
catches the miss: **at SETUP, open the predecessor's findings table and check off every row against
the board, not just the rows your story's description mentions.** The description is a *summary* of
the handover and summaries drop rows. Cost: one `grep` of the epic per finding id. Both misses here
were found that way in under a minute, and one was a MEDIUM.

**And check the leftovers for staleness in both directions** — R-5 was real when filed and is now
moot (its only wrong text is in an archived session; the live pin already carries the corrected
number). Reporting "R-5 needs no work, and here is why" is worth the same sentence as filing it.

## When your story makes a finding's SUBJECT unreachable, dispose of it — do not fence it

R-2 said a promotion fence "cannot fail": deleting `pjoy: undefined` from `promote()` left all 2463
tests green under mutation. The reflex is to write the test that would have failed.

The sweep answered it better. Every promotion in all four harnesses entered carrying `none` or
`glide` — **never** the other two variants — so a dumb bird's state is only ever absent-or-glide.
Once this story gates promotion on the glide, that clear is unreachable **by construction**, not
merely redundant. So the right AC is "delete it, or comment it as unreachable and say why", and
explicitly **no test**. Building a fence around a branch that cannot be taken is the exact mistake
R-2 caught the first time.

**The tell:** if your change narrows the input domain of a function, re-ask whether the finding's
subject survives the narrowing at all. A finding filed against the wide domain may have no referent
in the narrow one — and the honest close is a deletion plus a sentence, not a new test.

## Attribute a red `main` by BISECTION, and expect one of the failures to be the port

The existing entry says attribute a red suite before finishing. Doing it properly here took two
runs and split 9 failures three ways:

- Ran the orchestrator at the **sibling's tip** (`git checkout <their-sha>`) as well as at mine:
  **8 fail there, 9 fail here.** The 8 are their in-flight RED, landed straight on `main`. Naming
  the delta is what makes "not mine" evidence instead of an assertion.
- The 9th — `canonical-serve.test.mjs` — failed only in the *full* run. Alone: **15 pass / 0 fail**.
  `lsof -a -p <pid> -d cwd` showed the port held by a **different checkout** (`a-2`). That is the
  documented dev-port gotcha showing up as a phantom regression in someone else's suite, and it is
  worth writing into the handoff by name, because the next agent will otherwise burn the time.
- Net: zero attributable to this story, and `--project joust` all-green — which is the baseline the
  next phase actually inherits and the only number worth stating without a caveat.

---

## The completed-file race, worst case: the sibling's number EQUALLED mine (jt9-1 finish, 2026-08-02)

This file already documents the shared-trailing-field conflict in `sprint-2628-completed.yaml`. This
run produced its nastiest form and it is worth recording precisely.

The conflict was the documented shape — `points:` and `completed:` sitting BELOW the `>>>>>>>`
marker, so they attach to whichever row survives a marker-strip. What was new: **the sibling's story
was also 8 points.** A lazy resolution keeping both rows and stripping markers would have produced a
file that was *correct by accident*, parsed clean, and told me nothing about whether I had robbed
them. The existing rule ("re-type whole records, parse to verify") saved nothing visible here — and
that is exactly why it has to be unconditional rather than applied when the diff looks risky.

**The step that made it verifiable:** read the sibling's row from `origin/main` and re-type it from
that, rather than reconstructing it from the conflict hunk. `git show origin/main:<path> | python -c
"yaml.safe_load..."`. The conflict hunk is missing the fields under dispute — by definition — so it
is the one source that cannot settle them.

Second conflict in the same file, easier but worth naming: `completed_epics` wanted BOTH sides
(`sc1` from them, `jt5`/`jt8` from my finish's epic archival). A "take mine" or "take theirs"
resolution silently loses an archived epic, and nothing downstream ever complains.

## `pf sprint story finish` ARCHIVES completed epics — and that moves files out from under tests

Unadvertised side effect, and it reddened the orchestrator suite **after** a clean pre-finish run.
`archive_epics` moved `sprint/epic-jt5.yaml` and `sprint/epic-jt8.yaml` (both 100% done) into
`sprint/archive/`. `tests/jt5-7-epic-yaml-truth.test.mjs` reads `sprint/epic-jt5.yaml` by literal
path — eight tests red, none of them related to the story that had just landed.

**So the finish ceremony is not gate-neutral: re-run the gates AFTER `story finish`, not only
before.** My pre-finish run was 390/0 and my post-finish run was 382/8.

The fix worth copying: the guard is about the epic's PROSE, which is as worth guarding once the epic
is a record as while it was live — so it now resolves **live path first, then archive**, instead of
pinning one location. Same shape as the `sprint-repo-routing` exemplar fix earlier in this story:
**a test that names a sprint artefact by path or by id has a lifecycle bug waiting, because epics
finish.** Prefer resolving a candidate list, or asserting the property (an epic with open stories)
rather than the name.

## Check whether a sibling inherits your false claim — then check whether it is false FOR THEM

Dev measured that this story's determinism warning was wrong (zero pins moved, one promotion shifted
by one wake). The obvious next move is to sweep the epic for stories that inherited the same
language and correct them.

I did the sweep — two stories used "blast radius" — and then did the step that matters: **read the
sibling's mechanism before correcting it.** jt9-18 changes level flight to flap every other wake,
which perturbs every level-flying enemy on every wake. That is jt5-8's shape, not jt9-1's, so its
re-baseline expectation is CORRECT and "correcting" it would have introduced the error I was
removing.

**Generalise: a claim being false for your story is not evidence it is false for theirs.** The
sweep finds candidates; the mechanism decides. Same rule as routing findings to owner stories, in
the opposite direction — and the failure mode here is worse, because a wrong correction arrives
labelled MEASURED and outranks the story.

---

### Second occurrence of the archive-epics breakage (cp6-1, 2026-08-02) — four things the jt9-1 entry above does not cover

The entry above is from jt9-1. cp6-1's finish reproduced it **independently and identically**:
pre-finish 390/0, post-finish 382/8, all eight in `tests/jt5-7-epic-yaml-truth.test.mjs`, same
`archive_epics` sweep of jt5 and jt8. Two stories, same trap, one day apart — so treat it as
structural, not anecdotal. Four additions:

**1. Catch it BEFORE the finish, not after.** The post-finish gate run is the safety net; the
cheap pre-check is one command, and it tells you whether this finish will break anything:
`grep -rn "sprint/epic-" tests/*.mjs`, then compare the hardcoded epic ids against the epics
that are about to be swept (any epic whose stories are all `done`).

**2. Demand a MUTATION PROOF on a path fix specifically.** This is the part most likely to be
skipped, because a path repair "obviously" works when the suite goes green — but green is
exactly what a broken read looks like once the ENOENT stops throwing. A fix that silently
resolved to an empty or wrong file passes just as loudly. Require: corrupt the ARCHIVED file in
a way one of the assertions must catch, show the red, restore, byte-compare.

**3. `git checkout --` cannot restore the archived file.** At that moment the archived YAML is
newly-added/untracked, so checkout has nothing to restore from and will not error usefully. Use
a `cp` backup and `cmp` to verify the restore — the same rule the Dev sidecar records for
mutating an uncommitted deliverable.

**4. The Impact Summary defect fires in the same ceremony, and it is SILENT.** cp6-1's finish
emitted **no** Impact Summary at all — no warning, no error, just an absent section. Always
`grep -n 'Impact Summary' sprint/archive/<id>-session.md` after a finish and rebuild it by hand
if it is missing or stale, saying in the text that it was hand-written. This matters more than
it looks: `.session/` is gitignored here (`.gitignore:11`), so the archived session and the epic
YAML's `review_findings` are the ONLY durable trace of the whole story. Note `pf sprint story
update --review-verdict` flips the verdict but leaves `review_findings` carrying the PREVIOUS
round's text, so a multi-round story archives "approved" beside a rejection narrative unless you
pass `--review-findings` too.

**5. Routing, not doing.** The fix is a test-file edit, which SM does not make. Route it to Dev
with the constraint written out ("resolve by existence, live-first; do not weaken any assertion;
mutation-prove it"), then verify the diff and re-run the suite yourself.

---

## jt9-2 finish — item 4 fires TWICE, and the second half has a new cause

Both silent defects item 4 warns about fired on this story. Item 4 is right and its check is
cheap; two additions.

**The Impact Summary was absent again, and the preflight said why.** `sm-finish` reported that
`write_impact_summary_to_session()` could not run — `pf` was not importable from the `.venv` —
and correctly called it non-blocking. It is non-blocking for the *finish*; it is not harmless.
Read that line as "the archive will have no Impact Summary" and plan to hand-write one, rather
than as an incidental tooling note. Grep after the finish either way.

**`review_findings` can be absent for a reason item 4 does not name: the update never ran.**
Item 4 warns that `--review-verdict` leaves *stale* findings from a previous round. There is a
second path to the same empty field — `pf sprint story update` **validates its enum values
before applying anything**, so a single invocation passing both `--review-verdict APPROVED` and
`--review-findings "…"` fails whole. `APPROVED` is rejected (the enum is lower-case
`approved`/`rejected`/`pending`), and the findings text goes with it. Re-running only the
corrected verdict then leaves the story archived as `approved` with **no findings at all** —
which reads, to anyone later, like a review that found nothing.

- Pass the verdict **lower-case**: `--review-verdict approved`.
- After any partial failure, re-run the *other* flags too; do not assume the half that was
  well-formed landed.
- The check is one line and worth making reflexive at every finish:
  ```bash
  python3 -c "import yaml;s=[x for x in yaml.safe_load(open('sprint/epic-<E>.yaml'))['stories'] if x['id']=='<ID>'][0];print(s.get('review_verdict'),'|',(s.get('review_findings') or '*** ABSENT ***')[:80])"
  ```

**Why this pair matters more here than the wording suggests.** `.session/` is gitignored, so a
finish that drops both leaves the story's entire reasoning — every measurement, every mutation,
every disposal — recorded nowhere durable. The commits and the archived session are the record;
if the ceremony silently skips half of it, the work looks like a diff with no argument behind it.

---

## RUN the candidate fix at setup — a zero-red blast radius is the story's biggest RISK, not its good news (sw8-19 setup, 2026-08-02)

**Situation:** sw8-19 is a 2-point bug whose whole content is "gate C_PS on C_PV". The sw8-23 rule
says run an executable subject rather than read it; I extended that from the story's *deliverable*
to the story's *proposed fix*. Applied the one-line gate to committed source, ran the game suite,
restored from a `cp` backup with an md5 re-match.

**Result: 2238 passed / 200 files / zero red.** The instinct is to report that as good news — no
fixture rework, the estimate holds. That reading is half of it and the less important half.

**The other half: nothing already in the tree can observe the change.** A fix invisible to 2238
tests is a fix whose entire observable footprint is the test nobody has written yet — the exact
shape in which a guard ships as scenery (`guard-must-be-mutation-tested`). So the measurement's
real output was an AC: the mutation proof is **mandatory** here, with the mutated string recorded
verbatim, and the number 2238/200 written into the AC as the *reason*. Without that sentence the
next reader sees "mutation-proven" as boilerplate and treats it as optional.

**Generalise:** at setup, apply the story's own proposed fix and measure the blast radius. Both
outcomes are load-bearing and they point opposite ways — a large red set sizes the fixture rework,
and a zero red set tells you the fix is unobservable and the test is the whole deliverable. Cost:
one apply, one suite run, one restore. Neither conclusion is available by reading.

## A filing can be RIGHT in every particular and still understate its own mechanism — check whether the ROM gate is CONTROL FLOW rather than adjacency

sw8-19 described its ROM gate as implicit: the sole `CHSET C$PS` "sits INSIDE the object draw pass,
so an object the cabinet does not draw cannot receive the sights bit". True, checkable, and it
frames the fix as a plausible inference ("Likely fix: gate C_PS on C_PV").

Reading the enclosing routine turned that into a transcription. `S2VW` (`WSMAIN.MAC:3755`) has
**exactly four exits before the `CHSET C$PV`** — `:3826`, `:3828`, `:3836`, `:3842`, all branching
to `RTS1: RTS` at `:3754`, and those four are its only references in the file. Those four tests
**are** C_PV's definition. `CHSET C$PV` is `:3846`, `CHSET C$PS` is `:3930`, and the only branch
target between them is a forward local label. So the sights bit is *unreachable* unless the view
bit was set 84 lines earlier on the same object in the same pass.

**The move that found it:** grep the routine's RTS target and count its references, instead of
reading the cited span. A span tells you what the code says; the exit list tells you what can reach
it. Same family as the user memory `port-init-cites-wrong-actor` — a real ROM line, read at the
wrong altitude. Where "the ROM does X near Y" appears in a filing, ask whether X is *guarded by* Y,
and answer it from the branch targets.

It also answered the story's own open question ("check whether the draw pass has other implicit
gates worth porting") — a `JSR` between the two setters cannot gate anything, because it returns to
the caller's next line; and the neighbouring block's `ENDIF`s all closed before the C_PS block, so
C_PS was never nested inside them. Both are structure questions, not content questions.

## A prerequisite that shipped can make the defect BIGGER — say so, because the filing predates it

sw8-19's description opens "DEPENDENCY: DO uf1-14 FIRST", correctly, and explains the ordering as
avoiding rework. Measured, the ordering mattered for a stronger reason nobody had written down:
the divergence region's extent is `band / tan(half-angle)`, so uf1-14 narrowing the pyramid from
±45° to a rendered 30° moved the crossover from 500 to **866** — a 73% deeper region — and made it
aspect-dependent (866/aspect). The filing's "behaviourally small (the fighter is about to collide)"
was measured against the *pre-uf1-14* geometry and is now false past the worked example: at depth
800 the fighter is 3.7× its hit radius from the cockpit.

The existing entries cover a prerequisite **renaming** a description's identifiers (uf1-9). This is
the quantitative twin: a shipped prerequisite can move the *magnitude* the filing asserts, in the
direction that makes the story more worth doing. The tell is the same — the story credits a
prerequisite that has since landed — but the thing to re-derive is the number, not the symbol.

## Deriving ACs: write them to the YAML FIRST, then generate the context FROM the YAML

With `acceptance_criteria: null` the ACs are SM's to derive, and the documented failure modes
(context and session disagreeing, an AC edited under a note saying it was not) all come from
authoring the same text twice. Writing them with `pf sprint story update --add-ac` first and then
building the context file programmatically from `yaml.safe_load` makes them byte-identical **by
construction** rather than by verification — the `python3` `in` test afterwards then confirms a
property that cannot have failed, which is the right order. `--add-ac` is repeatable and took six
in one call; `git diff --stat` was one file, 7 insertions.

---

## The `lsof -ti tcp:<port>` recipe in this very file can return a CLIENT, not the server — and I wrote an unrun measurement into my own assessment (cp6-2 setup, 2026-08-03)

**Two lessons, and the second one is about me.**

**1. The documented port probe is wrong, and it fails in the direction that looks authoritative.**
The ad1-2 entry above prescribes:
```bash
PID=$(lsof -ti tcp:5270 | head -1)
lsof -a -p "$PID" -d cwd -Fn | grep '^n'      # → n/Users/slabgorb/Projects/a-2
```
Run here, it returned **pid 1702 — Google Chrome's network service**, a *client* holding a
connection to the port, whose cwd is `/`. Not a dev server at all. `lsof -ti` lists every process
with the port open in any role, and `head -1` picks whichever sorts first. The output is not an
error; it is a confident, wrong attribution — "cwd `/`" reads like an unidentifiable system process
and would have been reported as "nobody owns it, safe to serve".

Ask for the **listener**:
```bash
LPID=$(lsof -nP -iTCP:5270 -sTCP:LISTEN -t | head -1)
lsof -a -p "$LPID" -d cwd -Fn | grep '^n'     # → n/Users/slabgorb/Projects/a-1
```
That found `node` pid 7744 serving from **a-1**. And confirm it serves the *cabinet* rather than the
SPA fallback the same way `canonical-serve.test.mjs` does — compare a game path against a nonsense
control and assert they DIFFER (`/centipede/` vs `/banana-not-a-game/`: different md5s). An all-200
sweep proves nothing, because the fallback answers 200 to everything.

**2. I wrote "the dev port was checked at setup and is unheld right now" into my assessment without
having run it.** It was plausible, it was in the handoff section, and it was false — the port was
held by a sibling. What caught it was mechanically re-verifying every number in my own assessment
before committing, exactly as this file demands of a *subagent's* claims. The rule "a subagent's
status claims are unsourced; grep the line or run the command" has always been written outwards. It
applies to your own prose with equal force, and the highest-risk sentences are the reassuring ones
in the handoff — the ones written last, from memory, about environment rather than about code. Four
numbers in that assessment were wrong on first draft (the port, a two-line span, a mention count,
a banner extent); all four were caught by re-running, none by re-reading.

## A prerequisite story live in a SIBLING is invisible to the branch probe when the prerequisite is trunk-based

The mg1-2 entry says the branch probe (`git branch -r | grep <id>`) "is the reliable half now that
all checkouts share one remote". For a *prerequisite* it can be the useless half. `git branch -r |
grep -Ei cp6` returned **nothing** while cp6-1 was live in a-2 sitting at its finish phase with a
round-trip count of 2 — because trunk-based work lands on `main` and the beacon branch is deleted at
finish. The `.session/` sweep across `/Users/slabgorb/Projects/a-*/` was the only probe that fired,
and what it found was not a competitor for *my* story but **my own prerequisite, mid-finish**.

That is a distinct hazard from the documented one. A sibling racing the same story is a collision;
a sibling *finishing your prerequisite* is a timing window — proceed and TEA is told to "consume
cp6-1's recorded lengths" against a dossier not yet in this checkout. Run both probes and read the
sibling session's phase pointer and round-trip count, not just its filename. Here the resolution was
a plain `git pull`, after which cp6-1 was `done` and its whole deliverable was on `main`.

## A description can be stale against its OWN epic-filing commit

cp6-2's description said the README "currently points readers at 'the open epic
`sprint/epic-cp5.yaml`'". `grep -c epic-cp5 README` → **0**, and `git log -S` named the fixing commit:
`c6d75c4 chore(sprint): file epic cp6` — **the commit that filed this very epic also fixed the
README**. The description shipped describing a world its own filing had already changed.

The existing rule ("measure a description's falsifiable claims") catches it, but the *tell* is new
and worth knowing: when a story's remedial clause describes a state its own epic was filed to
repair, check whether the filing already did it. The consequence is not cosmetic — half of AC-6 is
now **true on arrival**, so a guard written for it passes immediately and looks like coverage. Hand
that to TEA as "mutation-prove this one" rather than letting it be discovered at review.

**Related and worth chaining:** the stale pointer had *moved*, not vanished — `shell/audio.ts:16-19`
still named a "LATER cp5 story" as the owner. Correcting prose in one file and leaving the identical
claim in another is the `wrong-prose fix: grep all phrasings` failure. Grep the synonym set, not the
one string the story quoted.

## A finding marked "BLOCKING FOR <story>" in a commit message is filed NOWHERE

Third confirmation of the jt9-1 entry, and the sharpest instance yet. cp6-1's finish commit says
"filed **BLOCKING FOR cp6-2**"; its Reviewer's assessment says the same; the archived session names
cp6-2 **43 times**. The `epic-cp6.yaml` diff of that same commit is **two lines** — `status` and
`completed`. A term count over cp6-2's description scored **0** for `voice 0`, `preempt`,
`arbitration`, `fixture`, `sound.md`, `invention` and `stand-in`.

So the audit is cheap and should be unconditional: **at setup, term-count the predecessor's routed
findings against the successor's actual description text.** Not "does the owner story exist" (jt5-5)
and not "can its mechanism express the finding" (ad1-2) — those both pass here. The question is
whether the words ever landed in the field the next agent will read. When the successor predates the
predecessor's review, the answer is almost always no.

---

## `git stash` is the wrong tool for capturing a before-state in THIS checkout — use a `git worktree` at HEAD (sw8-19 finish, 2026-08-03)

**Situation:** the finish chore added 11 comment lines to `sim.ts`, and the citation guard went
29 → 32 against sw8-18's ratchet ceiling. To say which of the 32 were *mine*, I needed the guard's
output at HEAD. The obvious move is `git stash push -- <paths>`, run the checker, `git stash pop`.

**Two failures, and the second is destructive.** The `stash push` failed on a path prefix — the
shell's cwd had persisted inside `plugins/star-wars/` from an earlier command, so the pathspec
resolved to `plugins/star-wars/plugins/star-wars`. Nothing was stashed. The follow-up `git stash
pop` then popped **`stash@{0}` — an unrelated WIP from an old rb2-4 session** — leaving
`sprint/archive/epic-rb2.yaml` in `UU` conflict. Recovered with `git checkout HEAD -- <path>`; the
stash entry was kept (pop refuses to drop on conflict), so the list still holds its original 4
entries and nothing was lost.

**This checkout carries 4 parked stashes.** Any bare `git stash pop` here targets somebody else's
work. Treat `stash` as a shared mutable stack that this repo already uses for long-term parking,
not as scratch space. The right tool has no shared state at all:

```bash
git worktree add -f "$SCRATCH/head-wt" HEAD
(cd "$SCRATCH/head-wt" && node <the checker>) > before.txt
git worktree remove "$SCRATCH/head-wt" --force
```

**Two smaller traps in the same sequence, both worth their own line.** The Bash tool's working
directory persists between calls, so a `cd` three commands ago silently changes what a relative
pathspec means — prefer absolute paths in anything destructive. And `check-comment-citations.mjs`
writes its findings to **stderr**, so `2>/dev/null | wc -l` reports a confident, wrong `0`; a
before/after comparison built on that would have "proved" the chore introduced nothing.

## A comment insertion has a THREE-population citation blast radius, and the guard reports only one

`sim.ts:159 +11 lines` broke citations three separate ways. Fixing what the gate reports gets you
a green gate and a half-corrected tree:

| population | how many | visible to the comment guard? |
|---|---|---|
| `file.ts:N` refs in comments | 3 | **yes** — these are what turned the suite red |
| bare `:N` refs in the SAME comment blocks | 6 | **no** — the guard needs a filename to associate |
| `ours` citations in `docs/audit/findings/*.json` | 23 | **no** — different gate entirely (`citations.test.ts`) |

The middle row is the dangerous one, and it is the user-memory rule `bare-colon-citations-evade-gates`
arriving from a new direction: `surface-traversal-end.test.ts` carries `(:1122-1123)`, `(:1145-1150)`
and `(:965-969)` sitting in the same comment block as the `sim.ts:983` the guard *did* flag.
Re-anchoring only the flagged one leaves a comment where some numbers are right and their immediate
neighbours are silently wrong — **worse than uniformly stale**, because the corrected neighbours
lend it credibility. All 11 were shifted by hand, each replacement asserting `count == 1` on its own
line before writing. The third row has a tool (`tools/audit/reanchor-citations.mjs --write`); the
tell that it worked is that **every** shift was exactly +11 (sim.ts) or +2 (state.ts), matching the
two insertions, with 0 lost. A shift that is *not* uniform means the quote moved for a second reason.

**And measure the delta, do not read the count.** Of the 5 guard lines that looked new, **2 were
pre-existing stale citations whose *reported target* had merely shifted by 11** —
`coaching-clears-on-death.test.ts: sim.ts:163` reported "now at :185" before and "now at :196"
after. Same defect, same count, not mine. `comm -13 before.txt after.txt` on sorted output says so;
a count of 32-vs-29 does not, and would have had me "fixing" two citations belonging to sw8-24's
sweep.

## The Reviewer's FLAG on a logged Design Deviation can be discharged by the FIX, not by prose

The Reviewer accepted TEA's far-clamp deviation but flagged its stated rationale as false — *"if
either constant moves, this says so"*, when the test pinned `TIE_SPAWN_DISTANCE` and reachability is
bounded by `PLAY_CUBE_MIN`. It added: "it must be corrected because the archived session is the
permanent record."

The reflex is to annotate the deviation entry. The better close was to make the rationale **true**:
the chore changed the assertion to `VIEW_FAR > |PLAY_CUBE_MIN|`, and the Reviewer's own mutant
(`PLAY_CUBE_MIN = -33000`, previously green across all 2252 tests) now reddens that test on its own
assertion rather than via a sibling. The deviation text then needed no edit at all — as of the
finish commit it describes what the test does.

**Generalise:** when a flagged rationale describes a property the code *should* have, ask whether
the story can give the code that property inside the finish chore. Editing another agent's session
entry to say "this was wrong" preserves a defect in the tree and a correction in an archive nobody
greps. Fixing the code makes the archive accurate for free. Only annotate when the claim is about
something unfixable — history, a measurement, a decision.

## Two generator failures in one `story finish`, both silent-ish, both routine now

`pf sprint story finish sw8-19` printed `AI generation failed (Command '['claude', '-p', '--model',
'sonnet']' timed out after 120 seconds), falling back to templates` and then its usual clean step
list. Consequences, neither of which appears in that step list:

- **The Impact Summary was never written.** This is the fourth recorded occurrence (cp6-1, jt9-2,
  and this one) with a third distinct cause — not an unimportable `pf`, just a timeout. The standing
  rule held: it was hand-written into `.session/` **before** running finish, so it archived intact.
  Writing it beforehand is strictly better than grepping for it afterwards, because after the finish
  the session file has already moved.
- **`sprint/demos/sw8-19/` is template fallback** — `demo-script.md` inlines the story's entire
  1,400-character title as the presenter's spoken line, three times. Prior finishes commit the whole
  demo directory including `deck.pptx` (uf1-14, uf1-15, jt5-7 all do), so it was committed for
  consistency and the fallback named in the commit message rather than quietly shipped as content.

Also confirmed working as documented: `archive_epics` swept **nothing**, because no epic is 100%
done. The one-command pre-check (`grep -rn "sprint/epic-" tests/*.mjs` against the epics about to be
swept) took seconds and correctly predicted a gate-neutral finish — post-finish orchestrator was
390/390, matching pre-finish.

## Expect to rebase TWICE, and re-run the gates in between

A sibling checkout (`a-3`, on cp6-2) pushed **6 commits** during the chore and **1 more** during the
post-rebase gate run, so the first `git push` after a clean rebase was still rejected. Both rebases
were conflict-free — their work was centipede-only, mine star-wars — but the second push attempt
came *after* I had already verified gates, so the gates were re-run against the new base before
pushing. Their diff touched `justfile`, which the orchestrator suite guards, so that was not a
formality.

**The claim-branch deletion succeeded on the rejected push run**, because branch deletion is a
separate ref update and does not care that `main` was behind. Worth knowing: a failed `push origin
main` in the same command list does not mean the `--delete` beside it failed.


---

## When the user OVERRULES your sizing estimate, MEASURE the estimate — mine was wrong by a mile (sw8-27 setup, 2026-08-03)

**Situation:** sw8-27's filing carried an OPEN QUESTION (do the ROM's L1 diamond and our L2 sphere
disagree about a specific seat?). I measured the answer, then offered the user two dispositions with
the census attached, per the documented pattern. My non-recommended branch said folding in the shape
fix would "turn a 3-point visibility story into a hit-test rewrite touching every hitscan fixture in
the game". The user chose it anyway.

**That sentence was an ESTIMATE dressed as a cost, sitting inside a decision aid.** The rules in this
file demand a measured census attached to an either/or; I attached one to the *recommended* branch
(the ROM geometry, one-sided containment, 0/2000 directions) and an unmeasured guess to the *other*.
So I measured it after the ruling, before writing it into the ACs: applied the ROM box-and-octagon
kill region inside `beamHit`, ran the game suite. **Zero red across 2252 tests.** The L1 sights
diamond: **one** test, the very pin being changed. Not "every hitscan fixture" — one.

**Why zero, and this is the part that generalises:** the containment I had already measured
*predicted* it and I did not connect the two. The port's disc is a strict SUBSET of the cabinet's
region, so no currently-passing hit stops passing, and all the new behaviour lives in octagon corners
(1.0-1.118 R at atan(1/2) = 26.57°) that no fixture seats. **A subset-widening change has a blast
radius near zero by construction.** When you know the direction of a shape deviation, you already
know the sign of its fixture damage — check that before quoting a cost.

**The rule:** the cp6-2 entry says a subagent's unsourced claims apply to your own prose with equal
force, and names the handoff's reassuring sentences as highest-risk. This adds a second high-risk
site: **the losing branch of a question you put to the user.** You write it to be dismissed, so it
gets the least verification and the most rhetorical weight — and if they pick it, it silently becomes
the scope premise. Measure both branches, or label the unmeasured one as an estimate in the question
itself. Record the correction in the session too: a wrong estimate that reached the user deserves the
same permanent-record treatment as a wrong claim about code.

## A ROM gate proven for one object CLASS has a sibling class with its OWN gate, in another file

sw8-19 established that the cabinet's laser-hit block is unreachable for an undrawn TIE, from
`S2VW`'s four exits in `WSMAIN.MAC`. sw8-27's filing inherited that and wrote "the SPACE-arm CALL
SITE" — singular. The port has **two**: `sim.ts:546` (TIEs) and `:554` (enemy fireballs), four lines
apart in the same block, and the code's own ROM quotation two dozen lines above says why they are
adjacent (`CLSLZ` ranks `CL.GDS` and `CL.ADS` in ONE contest).

Fireballs are not aliens, so they are not in `WSMAIN.MAC` at all. **`VWGUN::` (`WSGUNS.MAC:852`) has
exactly the same four-exit shape** — `:885` near (`CMPD #01`), `:887` far (`CMPD #7F00`), `:896` and
`:903` ratio — before its `;GUN SHOT IS VISIBLE` marker at `:904`, with the `CL.GDS`/`CL.GP`
hit-record at `:906-948` below all four. Different literals, identical structure. Nothing in this
repo had recorded it.

**The tell is cheap: if the port's call site is one of N in a loop over N object lists, the ROM has N
draw passes and you have read one.** Find the other pass by the object's own type prefix (`A$` alien,
`G$` gun) rather than by grepping the routine you already know. And do not copy the known pass's
constants onto the new one — the near clamps differ (`#01` vs `#10`).

## "Closing this story means retiring that assertion" — check WHAT the test calls

sw8-27's filing said its own pinned guard (`does NOT change the GUN`) would have to be deliberately
retired. Measured by applying the story's own prescribed **caller-side** fix: the file stays GREEN,
because the test calls the shared helper `beamHit` DIRECTLY, not through `sim`. What it pins is "the
gate is not in the helper" — which the story still requires. A TEA following the description would
have deleted the guard protecting the fix's own shape.

**Generalise:** a filing that names a test as "the thing that must be retired" was usually written
against a *different* candidate fix than the one it ends up prescribing. The check is one suite run,
and the failure mode is silent — nobody reviews a deletion the story authorised.

## A stale citation in NEITHER the guard's report NOR the sweep story

`tie-sights-visibility.test.ts:270` cites `sim.ts:535` for the player's laser; the call is at `:546`,
exactly +11 — the shift from sw8-19's own finish chore, which inserted 11 comment lines at
`sim.ts:159`. The comment-citation guard does **not** report it: with no verbatim adjacent it
range-checks only, and 535 is in range. So it is absent from the guard's 29 AND from `sw8-24`'s sweep
of that 29.

The sw8-19 finish entry already names a three-population blast radius for a comment insertion. This is
a fourth population, and the worst kind: **a `file.ts:N` citation that the guard CAN parse and still
cannot falsify.** After any line-shifting edit, re-anchor by the shift arithmetic over the touched
file's neighbourhood, not by the guard's report — the report is the population it can see.

---

## A finding routed "BLOCKING FOR <next story>" can be declined by BOTH stories and belong to neither — the filing is SM's, at finish (cp6-2, 2026-08-03)

**Situation:** cp6-1's Reviewer filed a voice-0 contention finding marked **BLOCKING FOR cp6-2**. At
cp6-2's setup I measured that it had never reached cp6-2's description — that finish commit's epic
diff was two lines, `status` and `completed`. I recorded it in the context. At cp6-2's review it was
*still* unactioned, and a grep of every epic YAML for its own vocabulary returned only my own
round-1 findings text.

**The part that is new, and worth the entry.** This is not the usual "nobody executed the routing"
failure (already documented from jt9-1). cp6-2 **could not** have fixed it: cp6-2's scope fence
forbids editing the `CHANNELS` map, inherited from cp6-1's own AC-5 ("it rules, it does not edit"),
and none of cp6-2's six ACs mention voice arbitration. So cp6-1 correctly declined to fix it, cp6-2
correctly declined to fix it, and the finding belonged to **neither**. The existing rules all assume
an owner exists somewhere; this is the shape where the honest answer is that none does.

**The tell:** a finding whose fix touches a surface the receiving story's scope explicitly protects.
When you see "blocking for X" and X's scope fence names the very file the finding concerns, the
routing was wrong at the moment it was written — X was never able to take it.

**Whose job:** SM's, at **finish**, before `story finish` archives the session that explains it. Same
class as the jt5-10 "an AC that names a backlog artifact" rule. Filed as `cp6-3` with the mechanism
written into the description (four ROM citations, the measured divergence, the fixture record that
is its input, why it is not a baker change, and the dossier guard it will have to retire) — because
a story filed as a title with an empty body loses everything that made the finding worth keeping.

**Check the epic still stays open.** `archive_epics` sweeps any 100%-done epic. Filing cp6-3 into
cp6 kept it open, which is correct — there IS remaining work — and it meant the sweep correctly
moved nothing. Had the finding gone into a different epic, cp6 would have archived with a known
unowned defect against it.

## Verify a routed chore's GAP before you write the fix, not just the fix afterwards

The Reviewer routed two coverage findings as a finish chore. The standing rule is "verify the
Reviewer's numbers before applying the chore". For a chore that ADDS TESTS, the thing to verify is
the *gap*: I ran both mutations first and confirmed each survived the full suite, then wrote the
tests, then re-ran and confirmed each was caught — with a control mutation to prove the battery
itself still worked.

Both halves matter. Skipping the "before" measurement means you cannot tell a test that closed a
real gap from one that was always going to pass; skipping the "after" means you have swapped an
unfalsifiable claim for another one. The whole check cost three suite runs.

**One design note that generalises.** Closing the first gap needed a *seam*, not just an assertion.
The ROM rule in question (a zero control byte is exempt from a volume boost) was only observable in
the rendered audio as a peak difference — which cannot distinguish "the delay bytes stayed zero"
from "the delay bytes were boosted a little". Exporting the emitted byte stream made the rule
checkable byte by byte. **When a guard is hard to write, the usual cause is that the property is
being inferred from a downstream measurement rather than read where it is decided.**

## `complete-phase` scans the FIRST `## Reviewer Assessment` — on a multi-round story, demote the earlier ones

The gate requires tags for **enabled** specialists only (here `rule_checker` → `[RULE]`), and it
reads exactly one section. On a two-round story with `## Reviewer Assessment` for round 1 and
`## Reviewer Assessment — round 2` for round 2, it scanned round 1's and rejected the transition
even though round 2's assessment carried six `[RULE]` tags.

The fix is the convention cp6-1's own session already used: the **final** round owns the bare
`## Reviewer Assessment` heading, and earlier rounds are demoted to
`### Round N Reviewer Assessment (REJECTED — superseded by round M)` with their content untouched.
It passed immediately after. Do this when writing round 2, not when the gate refuses.
