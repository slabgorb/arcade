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

### A `?raw` source-guard test is silently defeated when a story adds a COMMENT containing the searched token near the guarded call site — re-run the mutation test whenever comments change

**Situation:** Reviewing a tempest/star-wars render or shell change where an AC is pinned by the repo's `?raw` convention — a test that reads `render.ts?raw` and asserts a window around a call site `toMatch(/token/)` (render is undrivable in vitest's node env, so the "is the guard present?" seam is a source-text search).

**Problem:** These guards search a fixed-size window of RAW SOURCE TEXT — comments included. tp1-10's AC-3 test did `renderSrc.slice(iStar - 240, iStar).toMatch(/progress/)` to prove the starfield draw sits behind `if (s.warp.progress >= WARP_STARFIELD_GATE)`. Dev's GREEN added a 3-line explanatory comment right above that call — "...gated on the dive **progress**..." — which lands inside the 240-char window. Now the test passes on the COMMENT, not the code: reverting the real `if` to the pre-story unconditional `drawStarfield(...)` — the exact regression the test exists to catch — STILL PASSES. The guard became scenery, and nothing in preflight/tsc/1200-green shows it. This is the [prior lesson: a guard must be mutation-tested] wearing a `?raw` hat: the window matched a TOKEN in prose, not the CLAIM in code.

**Prevention:** For EVERY `?raw` window/`toMatch` guard whose file the story TOUCHED (code OR comments), run the mutation test yourself: revert the real guard in the source, run the guard's test file, require RED, then restore. Do NOT trust it because it's green — a `?raw` guard is green by default. Especially suspect it when the story added/reworded comments near the call site (ROM-fidelity stories add dense citation comments — high risk of a searched token leaking into the window). The reviewer-test-analyzer subagent does this automatically and flagged it high-confidence; if that subagent is disabled (toggles: `test_analyzer`), YOU must do the reversion by hand.

**Fix (hand back):** the durable fix is to stop grepping raw text — extract the guarded decision into a named boolean (`shouldDrawStarfield(s)`) and unit-test THAT, or strip comments from the searched window before matching. A quick unblock is to reword the comment so the token appears only in the guard code within the window — but that's fragile (the next comment re-breaks it), so prefer the extraction.

**Example (tp1-10):** the render comment "the starfield does not open until the dive is ~29% down the well ... gated on the dive **progress**" defeated `tests/shell/tp1-10.starfield-gate.test.ts`'s `/progress/` window check. Mutation-proven (revert the `if` → still 4/4 green). Rejected → TEA to harden. Note the companion `expect(renderSrc).toMatch(/WARP_STARFIELD_GATE/)` was separately trivial — satisfied by the top-of-file `import` alone, regardless of use.

---

### When the reviewer wrote the code (same session did dev+review), the adversarial subagents are your independence — weight their MUTATION-PROVEN findings over your own "it looks right"

**Situation:** A peloton/relay session where one agent ran GREEN as Dev and then relayed straight into `/pf-reviewer` on the same story (context carried over). You "know" the code is correct because you wrote it.

**Problem:** That knowledge is the trap — the whole point of review is independence, and you have none. The reviewer critical rule "DO NOT RUBBER-STAMP" is hardest to honour against your own work: every finding feels like a nitpick because you remember why you wrote it that way. tp1-10 shipped a functionally-correct implementation (all 6 ROM findings delivered, 1200 green, purity + citation gate intact, re-seats sound) — and it would have been easy to APPROVE. The independent subagents, running MUTATION tests, proved a tautological AC guard and two untested new behaviours that "it looks right" completely missed.

**Prevention:** Spawn the subagents and treat their mutation-proven findings as ground truth over your own recollection. A mutation proof (revert the guard/line → suite still green) is not a matter of opinion — it is evidence the behaviour is unverified, and per "PROJECT RULES ARE NOT SUGGESTIONS" (lang-review #8, test quality) you cannot dismiss it. Reject on verification-integrity even when the CODE is correct: a correct implementation with a lying guard is not done. Cost of a rework cycle << cost of a scenery guard reaching green-forever main.

**Example (tp1-10):** self-authored GREEN, relayed to review; test-analyzer + rule-checker (independent) found the tautological starfield guard, two mutation-proven coverage gaps, and 5 dead RED-scaffolding casts. Verdict: REJECTED to TEA despite pristine implementation — the right call.

---

### Re-reviewing a UNIFICATION merge — the signature bug is a surviving DUPLICATE PATH, not a missing one; grep the dropped symbol to zero and mutation-prove the surviving path is SINGLE

**Situation:** Reviewing a merge that reconciled TWO independently-built implementations of the SAME feature (tp1-10's warp fly-in vs tp1-13's warp space-phase — same post-descent beat, opposite wave++ orderings, built in parallel checkouts). Dev unified them to one model and dropped the redundant half.

**Problem:** Normal review hunts for a MISSING guard. A union-merge's unique failure mode is the opposite — a guard/path/counter that should have been DELETED but survived, so BOTH implementations run. Here the live risk was a double wave++ (advance once at the new `beginFlyIn` AND again at a surviving `advanceLevel`) and a double-pay of the skill-step bonus. Vitest can stay green on this: if the old path is only reachable via a fixture the re-seated suite no longer drives, the duplicate is invisible to the suite even though it fires in real play. "1253/1253 green" does NOT prove the dropped half is gone.

**Prevention:** For every symbol the merge claims to have removed (function, field, constant, event-emit, ordering), prove it to ZERO in the working tree, not just "not in the diff": `grep -rn "advanceLevel\|inSpace\|spaceFrames\|WARP_SPACE_FRAMES" src/` must return only comments. Then mutation-prove the SURVIVING path is single: revert the ONE remaining site (delete `startBonus = 0`; change the single wave++) and require a test RED — if the suite stays green, a second live path is silently compensating. Also verify the two merged exhaustive tables (event census + dispatch switch) each still carry a compile-time `never` guard, so a lost arm breaks the BUILD, not just a runtime count.

**Also (concurrent mutation-testing collides in the LIVE tree):** the test-analyzer subagent mutation-tests by editing real source and restoring per-cycle. During review you (or a harness file-change notification) can catch a TRANSIENT mutated state — e.g. audio-dispatch.ts momentarily missing a `stopLoop` — that looks like a real regression or an "external edit to preserve." It is neither. Do NOT act on it, do NOT preserve it. Wait for ALL subagents to finish, confirm `git status --short` is empty (they restore), then run YOUR OWN mutation checks serially. See the dev-side lesson `dont-verify-while-subagents-mutate`.

**Example (tp1-10 round-trip 2):** APPROVED. Confirmed `advanceLevel`/`inSpace`/`spaceFrames`/`WARP_SPACE_FRAMES` all grepped to zero (dead removed), bonus paid in exactly one place (mutation-proven single-pay), 20-event union `never`-guarded in both dispatcher + census. All 6 unified guards RED-on-revert (test-analyzer + my own reversions). One LOW nit: a re-seated test's docstring oversold its LOCAL double-pay coverage (the regression is caught by a sibling test) — non-blocking, recorded as a follow-up.

---

### On a tempest tp1 remediation story, AUDIT THE FINDINGS DIFF for laundering, and expect ONE `ours` line to close findings in MULTIPLE pair files

**Situation:** Reviewing any tp1 story that fixes audit findings — it will edit `glyphs.ts`/`render.ts`
lines the findings cite as `ours`, mark them `remediated_by`, and run `reanchor-citations.mjs`. The
citation gate (`citations.test.ts`) will be GREEN by the time you review (Dev made it so).

**Problem:** A green citation gate does NOT prove the remediation was honest. `remediated_by` freezes a
finding's `ours` quote as history and STOPS the gate re-opening it — so a Dev could smuggle a real
divergence past review by stamping `remediated_by` on a finding they only re-SPELLED (the dev-side
`two-honest-exits` trap), or by editing a finding's `verbatim`/`claim`/`reasoning` PROSE to match the
new code (laundering the audit's own record). The gate can't see either; only the DIFF can.

**Prevention/Fix:** Run `git diff origin/develop...HEAD -- docs/audit/findings/` and confirm every
changed line is EITHER a `"line": N` reanchor OR a `+  "remediated_by": "<story>"` addition — grep the
+/- lines for `verbatim|claim|title|reasoning|"source"` and require EMPTY. Any prose edit is a red flag:
the ROM `source` side and the audit narrative must never change (the 1981 source doesn't change). Then,
for each `remediated_by` stamp, confirm the code actually REMOVED that finding's divergence (not
re-spelled it) — cheapest is to mutation-revert the fixed line and require a unit test RED. And expect
the fix to close findings OUTSIDE the story's named set: tp1-35's one enemy-bolt line was the `ours` of
BOTH V-009 (pair-2) AND DA-018 (pair-3, frame cadence); Dev correctly stamped both. `grep -rl` the
fixed symbol across ALL pair files to be sure no cited finding was left pointing at a deleted line
(that would fail the gate on the NEXT story, not this one).

**Also — when ALL pf reviewer subagents are toggled off (`workflow.reviewer_subagents`) AND the review
is self-authored (Dev+Reviewer one session):** you have ZERO independence. Do not hand-check your own
transcription — you'll read it the same wrong way twice. Spawn an INDEPENDENT general-purpose auditor
to re-decode the ROM coordinate-by-coordinate (mind the radix: ALVROM/ALDISP trailing `.`=decimal else
hex) and mutation-test every load-bearing guard, then re-run one mutation yourself serially after it
leaves the tree clean. tp1-35's auditor caught nothing (transcription was faithful, all 5 guards bit) —
but that NULL result is only trustworthy because it came from independent eyes, not from the author's.
