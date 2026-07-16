# Reviewer Gotchas

Common pitfalls encountered during code review.

---

### A rework that hardens input-validation on ONE side of a trust boundary (encode/sanitize) must be checked on the OTHER side (decode) — and its own test may round-trip past the untouched side

**Situation:** Re-reviewing a rework whose commit message says it "strips control chars from
names" / "hardens the untrusted input" at a serialization boundary (a cookie, a query string, a
wire format). Story lb2-8 round-trip 1: `bf1e2f9` added a C0/DEL strip to `sanitizeName`, which
is called ONLY from `encodeRows` (the WRITE side). `rule_checker` was ENABLED and caught it; the
disabled `security`/`test_analyzer` would have been the usual finders.

**Problem:** `decodeRows` — the function that parses the GENUINELY untrusted value (any subdomain
can write the cookie, a player can hand-edit it) — never sanitized the extracted name at all; it
only checked non-emptiness and validated the score. So the write path stripped more than the read
path re-validated, WIDENING an asymmetry the module's own comment claimed to close ("sanitized on
the way in and re-validated on the way back"). The rework's OWN new test built the hostile name
with `save()` → `encodeRows`, so it round-tripped through the side that WAS fixed and never
exercised `decodeRows` against a RAW poisoned cookie. Green proved nothing about the read path.
Verified by code-trace + a throwaway probe seeding `makeCookieJar({ [COOKIE]: 'A=B:9000' })`
directly: name `A=B` (the `=`) survives decode untouched. `;`/`,`/`:` can't traverse the
cookie/split boundaries and browsers reject raw control chars in `document.cookie`, so `=` is the
only realistic survivor; textContent render means no XSS and there's no read→re-encode path, so
it's cosmetic/self-inflicted (graffiti-tier) — NON-BLOCKING, but a real rule-#10 gap + a lying
comment. Confirmed (not dismissed), rated MEDIUM, routed to a follow-up.

**Prevention:** When a fix touches validation/sanitization at a boundary, enumerate BOTH the
encode and decode functions and confirm the fix is symmetric — a strip added to the writer means
nothing if the reader is the untrusted-input parser. And when the rework adds a test for that fix,
check WHICH side it drives: a test that builds its hostile input through the encoder can't prove
the decoder is hardened. Seed the raw wire value directly (bypass the encoder) and assert the
decoded output. Don't let a green round-trip test stand in for read-path coverage.

**Disposition:** the blocking finding was elsewhere (the AC-6 teardown, fixed + mutation-proven);
this read-side asymmetry pre-existed round 0 and is textContent-safe, so it did not re-block —
recorded as a non-blocking Delivery Finding (apply `sanitizeName` inside `decodeRows`, correct the
comment, add a raw-cookie decode test). APPROVED with the follow-up.

---

### A rotation/teardown test that advances N×period where N ≡ 0 (mod cycle length) wraps the index back to its start — the "stopped" assertion passes even if stop() is a NO-OP

**Situation:** Reviewing a cycling/rotating UI component with a teardown AC (a lobby board that
rotates through the registry on a `setInterval`, a carousel, an attract-mode loop) whose test
proves "stop() halts rotation" by advancing fake timers and asserting the active item didn't
move. `test_analyzer` was DISABLED (toggles: `test_analyzer`), so the mutation check was mine.

**Problem:** lb2-8's AC-6 (timer torn down, never fires against a detached DOM) had three tests
and ALL THREE were vacuous. The load-bearing one advanced to index 1, called `stop()`, then
`advanceTimersByTime(INTERVAL * 5)` and asserted still `GAMES[1]`. There are exactly **5 games**,
so five more fires walk `1→2→3→4→0→1` — the index returns to 1 whether or not the timer was
cleared. The assertion holds against a `stop()` that does nothing. The other two only asserted
`not.toThrow()`: `render()` on a *detached-but-alive* node (after `panel.remove()`) doesn't throw,
and `clearInterval` twice vs a no-op twice both don't throw — so neither pins teardown either.
Net: a stated AC with **zero effective coverage**; a future regression to `stop()` (memory leak,
detached-DOM writes) ships green-forever. The implementation was correct — the guard was scenery.
This is the tp1-10 verification-integrity pattern (lang-review #8) wearing a modulo-arithmetic hat.

**Prevention:** For any cycling-teardown test, DON'T trust a "still on the same item" assertion —
mutation-prove it. Revert the real teardown (`stop(){}` no-op), run the file: if the teardown
tests stay green, it's vacuous → REJECT to TEA. The blind spot is specifically `advance = k ×
period × cycleLength` (wraps to origin) and `not.toThrow()` (holds for detached-but-alive nodes).

**Fix (hand to TEA):** assert teardown DIRECTLY, independent of cycle-length arithmetic —
`vi.useFakeTimers()` then after `stop()` expect `vi.getTimerCount()` to be `0`; OR advance a
NON-multiple of the cycle length (e.g. one interval) and assert the item DID change if alive /
did NOT if stopped; OR spy `clearInterval`. `getTimerCount()===0` is the cleanest — it pins the
timer, not a downstream side effect, and survives a change to the game count.
### The radix trap bites on the ONE table operand that exceeds 0x09 — a bare (no-dot) CONTOUR start/end ≥ 0x0A is HEX, and a decimal-reading port silently mis-scopes a whole record

**Situation:** Reviewing a tempest tp1 ROM-transcription story that lifts CONTOUR/WTABLE
tables (ALWELG.MAC) into `rules.ts` as `ContourRecord[]` with `start`/`end` wave bounds.
ALWELG.MAC has NO `.RADIX` directive → default is HEX; a trailing dot means DECIMAL
(proof: `TB=0A`/`TR=0C` at :413-414 are invalid decimal; `AND I,1F`, `.BYTE ...,0E0` are
bare hex; decimal values carry dots, `CMP I,98.`). Almost every table bound is either ≤9
(hex==decimal, harmless) or dotted (`16.`,`32.`,`99.`), so a decimal misread is invisible
99% of the time.

**Problem:** tp1-7's WSPIMX record 6, ROM :633 `.BYTE T1,35,39.,1`, has `35` with NO dot
while `39.` has one. `35` = **0x35 = 53**, so the assembled record is `[start=53,end=39]` —
a backwards, DEAD range: the real arcade gives spiker-max 0 on waves 35-39. The port read
`35` as decimal (`{start:35,end:39}`), returning max 1 — a live divergence. It is a genuine
ROM typo (the parallel WSPIMI min table :625 dots it, `35.`, and its min=1 there makes the
assembled max=0 self-contradictory). Nothing caught it: the value isn't consumed by tp1-7
(only `firstNonZeroWave`=4 is), no test pins :633, and the source-rules suite that could
skips in CI anyway. Reading the port's `start: 35` "looks right" — you re-make the author's
radix mistake the same way. Only an INDEPENDENT `od -c` of the raw byte + decoding the radix
from the equates catches it.

**Prevention:** For every `ContourRecord` `start`/`end` (and any `.BYTE` operand) ≥ 10 that
the port stores as a decimal literal, `od -c` the ROM line and confirm the operand carries a
trailing dot. If it does NOT, it is HEX — the port's decimal transcription is wrong. Cross-
check the twin table (min vs max, WSPIMI/WSPIMX) for the same wave: if one dots it and the
other doesn't, the un-dotted one is the typo. This is the ONE finding an independent auditor
earns its keep on across eight otherwise byte-perfect tables — spawn it (subagents were all
toggled off here) and give it the raw ROM path + "mind the radix", exactly as tp1-35 said.

**Disposition:** REJECT even though the shipped behavior is 100% correct and the record is
descoped to the next story (tp1-8) — a "transcribed verbatim" table (AC-1) with an
unnoticed, undocumented radix misread is not done, and it becomes a live, self-contradictory
(min>max) divergence the moment tp1-8's solver reads the full curve. Fix is one line: match
the assembled ROM (`start:53`/drop the record → waves 35-39 = 0, as every other gap in this
table is handled) OR keep `35` as an EXPLICITLY DOCUMENTED deliberate deviation citing the
:633 typo + the WSPIMI min=1 contradiction. Route red→TEA to pin :633's raw byte.

**Re-review closure (what "fixed" looks like):** the correct fix is `{ start: 53, end: 39 }` —
a DEAD DESCENDING range that reads like a bug (start>end). Do NOT re-flag it; it is the verbatim
transcription of the un-dotted hex byte, and it needs its inline citation comment to survive the
next dev's "helpful" un-fix. Verify the fix TWO ways, both mandatory on a self-authored rework:
(1) MUTATION — revert `53`→`35`, run the suite: the CI-SAFE port test (`tp1-7.contour-tables`,
reads rules.ts) must go RED while the ROM-side source-rules pins stay GREEN (they anchor ROM
truth, not the port — that split is correct, not a gap). (2) INDEPENDENT re-decode — a general
auditor re-derives the radix + record from raw bytes and returns CORRECT. Also confirm the ONLY
consumer is unmoved: `firstNonZeroWave(WSPIMX)`=4 is set by record 1, so a latent record-6 change
cannot shift the spiker intro — full suite stays byte-identical (1377/1377, zero RNG ripple).
APPROVE once both confirm and the min>max contradiction is routed to tp1-8 as a blocking finding.

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

---

### A stroke-structure fix to a point-set geometry pin has THREE mutation axes — merge, split, reorder — and the secondary assertion needs its own liveness proof

**Situation:** Re-reviewing a fix that adds structure pins (a stroke/run COUNT plus a locality
check) on top of a sorted-point-set shape comparison — tp1-19 round 3, the TEMLIT logo's
`toHaveLength(11)` + per-stroke letter-window containment, added after a merged-polyline
mutation (M7) sailed through the point-set pin.

**Problem (axes):** the natural probe set is bigger than the mutation that prompted the fix.
MERGE (bridge two letters) is killed by the count; SPLIT-to-compensate (merge one place, split
another to keep the count) preserves the count and is only killed if the locality check fires
on the bridge and/or the split's duplicated point trips the shape pin; REORDER (permute a run's
interior vertices, multiset preserved) slips ALL of point-set + count + windows — a scrambled
letterform ships green. Judge the reorder residual by REACHABILITY: `flat()` is a refactor's
natural reach, interior permutation is not, and run-direction REVERSAL (the one plausible order
change) draws the identical picture and SHOULD pass. The one-assertion cure that subsumes all
three axes is comparing the SEGMENT multiset (consecutive point pairs, canonical endpoints).

**Problem (liveness):** when a test has a primary count assertion followed by a secondary check,
every natural mutation dies on the count FIRST — so the secondary check can be dead code and
you cannot tell from green/red alone. Construct a count-PRESERVING mutation (M10: merge E→S,
split M) and require the failure message to come from the secondary assertion itself.

**Also (self-authored rounds):** with reviewer subagents toggled off and Dev+Reviewer in one
session, an "expected split" derived from the test file's own transcription is an echo, not
evidence — spawn an independent auditor on the PRIMARY source (mind CRLF + `.RADIX 16`) to
re-derive the pinned number. tp1-19: ALVROM.MAC:1301-1351 independently returned 11 =
[2,2,1,1,2,1,2], matching both the test and the prior round's trace.
