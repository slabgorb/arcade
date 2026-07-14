# Reviewer Gotchas

Common pitfalls encountered during code review.

---

### FIRST review step: fetch and grep origin's LOG for the story id — a sibling checkout may have merged the same story mid-flight

**Situation:** Reviewing any story in this multi-checkout arcade setup (a-1/a-2/a-3 all
run the same combined backlog with pf sessions of their own).

**Problem:** tp1-9 went through setup→RED→GREEN here while a sibling checkout ran the
SAME story and merged it (tempest #113) plus archived it in the orchestrator — and
nothing in the pipeline noticed: the SM merge-gate checks OPEN PRs only (a merged PR
is invisible), preflight reported "3 ahead / 2 behind" as routine drift, and the suite
stayed green because the branch never rebased. ~4 hours of duplicated work reached
review before the race was caught — and only because the reviewer chased WHY the
branch was behind instead of accepting it.

**Prevention:** Before any analysis: `git fetch` BOTH the game repo and the
orchestrator, then `git log HEAD..origin/develop --oneline | grep -i {story-id}` and
`git -C <orchestrator> log HEAD..origin/main --oneline | grep -i {story-id}`. A hit
means SUPERSEDED — stop reviewing code quality and start comparing implementations
(what did upstream cover, what is this branch's unique delta, which API won). Also
watch the prime banner: sprint totals moving between agent activations in one session
(261/486 → 271/496) IS a sibling session landing work.

**Disposition pattern:** upstream (merged) wins the API; the local branch's unique
delta re-scopes onto whatever follow-up story upstream filed for its descoped ACs
(tp1-9 → tp1-31). Never hand-merge two implementations of one story under review
pressure — the epic-11-6 lesson.

---
