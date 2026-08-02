# Reviewer Gotchas

Common pitfalls encountered during code review.

---

### After a coordinate-space refactor, Dev's sibling re-seat DEFANGS a PASSING test in the same block — mutation-test the WHOLE describe-block, and break the feedback loop that hides the regression

**Situation:** Reviewing a story that moves a shared mechanism into a NEW coordinate space (rb4-16:
the enemy servo went from reading stored WORLD position to POST-DIVIDE SCREEN
`(world−eye)×POSITH_SCALE/positionZ`). Dev correctly re-seated the sibling tests that turned RED,
logged the deviation, and the full suite is green.

**Problem — a green sibling can be silently VACUOUS.** When Dev re-seats a describe-block after a
space change, they fix the tests that FAILED. But a test in the same block that still PASSES can be
defanged by the very same change: with the default fixture depth (`positionZ=P_INDP`), a hand-built
world `x` that used to sit "just inside the inner window" now projects into a DIFFERENT zone
(`screen ≈ 3.88×world`), so the assertion no longer exercises the behavior its comment claims. It
stays green — not because the behavior holds, but because it stopped testing it. Grepping the failing
tests misses it; the FULL suite misses it (it passes). Only MUTATION catches it: delete the inner-
window reversal in the production code and this test stays green while its re-seated siblings fail.
Confirm it's a REGRESSION (not merely a weak test) by applying the same mutation to the PRE-refactor
version of the identical test (`git show <base>:path`) — if the old one FAILS the mutation and the
new one passes, the refactor defanged a previously-sound guard. That is the round-1 "green suite,
unguarded behavior" pattern in miniature, and it is exactly what the reviewer exists to catch.

**Problem — a feedback-loop guard COMPENSATES for the regression it names.** A reachability/UX guard
that drives an outer control loop (rb4-16 AC-R3: a "chasing pilot" `flightStep`-ing toward the
plane) can absorb the exact defect it claims to pin. Mutation-tearing the eye out of the servo (the
round-1 soft-lock) left 3 of 5 levels green and the others failing by <1% — the pilot's own error-
correction closed the gap. The guard's PROSE ("the reachability regression guard") oversold it; a
different test (AC-1's direct "OBSERVES the eye") was the real proof. Always mutation-test a
feedback-loop guard by breaking the INNER mechanism and checking it fails HARD, not thinly.

**Problem — a new field with a totality docstring is usually UNtested and sometimes FALSE.** The
story added `plonsnLimit`/`plonsnClamp` with loud totality claims ("PLONSN's own clamp sinks a NaN
X"; "a non-finite limit leaves the position untouched"). The existing NaN totality test only sets
`x`/`y` NaN — never the NEW `positionZ` field. Feed the new divide/clamp path degenerate values
directly (a 6-line node repro of the exact expressions): a NEGATIVE `positionZ` → negative `limit` →
`Math.abs(offset) > negative` is always true → the plane teleports to the WRONG side; `-Infinity`
→ non-finite `x` that persists (no backstop). Both unreachable via `spawn` today, but a named
successor (AC-4 reads the raw PLSTAT+19 LSB into that field) is a dated trigger — and the claim is
simply false, in a module that disciplines totality and whose OWN AC-5 corrected a totality
overclaim two functions away.

**Prevention:** For any space/mechanism refactor: (1) mutation-test the ENTIRE describe-block Dev
touched, not just the re-seated tests, and diff-compare the survivors against the pre-refactor
version to prove the mutation used to be caught; (2) mutation-test feedback-loop guards by breaking
the inner mechanism (assert they fail hard); (3) for every new function with a totality/never-throws
docstring, reproduce the degenerate inputs of its NEW parameters directly. None of these are live
product bugs, so they will never show up in the green suite or the AC checklist — they are pure
safety-net erosion, which is the reviewer's job to find. REJECT with a tightly-scoped, mutation-
VERIFIED finding list (a one-line re-seat, a domain guard, a totality test), not a vibe.

**Example (rb4-16):** REJECTED with [HIGH] one defanged inner-window test
(`enemy-machine.test.ts:208` — add `positionZ: identityZ()`), [MED] the `plonsnLimit`/`plonsnClamp`
negative/-Infinity totality gap (`Math.max(0, positionZ)`), [MED] AC-R3's eye-overclaim prose, [MED]
stale ±olim assertions passing by boresight coincidence, [LOW] two stale mock-type contracts. The
machine and every ROM citation were sound; only the net had tears.

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

---

### A ROM servo ported onto coordinates the ORIGINAL re-projected each frame will drive the target out of a FIXED weapon's reach — and no unit test can see it, because the gun tests hand-build their target and the servo tests never fire

**Situation:** Reviewing a ROM-fidelity story that ports an authentic movement machine (rb4-6: Red
Baron's PLNDEL window-servo — the ROM genuinely reverses AWAY from centre at P.ILIM, `EOR I,0FF`,
:2794-2796) into a clone's existing entity coordinates. Every constant is byte-exact, the suite is
1051/1051 green, `tsc` clean, and the guards mutation-bite. Nothing looks wrong.

**Problem:** The ROM's servo runs on DISPLAY coordinates that TRACK the player's view (PLSTAT+8 is
";X SCREEN POSITION", :3157) — the plane weaves away from wherever the pilot is LOOKING, and the pilot
chases it. Our `enemy.x/y` are STATIC world coords the camera merely looks at (`main.ts:187-197`
builds `projView` for RENDER only; nothing re-projects the enemy), and the gun collides in that same
static space against a shell pinned at `y: 0` for its entire flight (`guns.ts:321`; `guns.step` only
advances `z`), reaching at most `32*sqrt(2)=45.25`. So a servo that pushes |y| away from centre into
`[P.ILIM, P.OLIM]` pushes the plane out of the ONLY region the gun can ever reach. Measured (200
planes/level, isolated worktrees, HEAD vs origin/develop): baseline in-reach for its whole life at
every level; at HEAD, GMLEVL 2/3/4 → avg **1.0** frames in reach (the spawn frame, before step() has
run) and **0/200** planes reachable afterwards. `PLNLVL` hits GMLEVL 2 at **5 kills** → the game
SOFT-LOCKS: no 6th kill is possible. Not a crash, not a red test — the game just quietly stops meaning
anything. This is the `rom-normalization-vs-displacement` trap one level up: Dev correctly refused to
re-apply HORIZN because "our y is already display space" — but our display space is FIXED, not
player-relative, so the deeper premise (that our coords are the ROM's display coords) is only half true.

**Why 1051 green proves nothing:** the two halves of the engagement are each tested in a world where
the other doesn't exist. `engagement.test.ts:47` HAND-BUILDS its target at `y: 0` (so the gun is tested
against a fixture that can't move), and every servo test drives `step()` without ever firing. The seam
is untested, so the regression is invisible. The ONE artifact that did notice — the cockpit determinism
fingerprint moving 52→53 because "one more shell lives out its flight instead of ending early on a
plane that used to sit still in Y" — is the bug FILING ITSELF, and it was re-pinned as benign. A
fingerprint that moves because a shell stopped connecting is a hittability regression wearing a
determinism hat.

**Prevention:** When a story changes WHERE an entity is allowed to be, do not stop at "the constants are
byte-exact." Find the consumer that must REACH that entity (gun, hitbox, cursor, click target) and ask
whether the producer's new range still intersects the consumer's fixed one. Then PROVE it empirically —
`git worktree add --detach <scratch> HEAD` + a second at `origin/develop`, symlink `node_modules`, and
probe both: "what fraction of entities are ever reachable, and for how many frames of their life?"
Report frames-in-reach PER LIFE, not per run — a story that also shortens lifetimes (fly-past) confounds
any per-run hit count, and "EVER reachable" is confounded the other way by the spawn frame (I over-claimed
"never reachable" on a first probe that skipped frame 0; the honest number was 1.0 frames = spawn only).
The worktree is also how you dodge the concurrent-mutation problem — test-analyzer mutates the LIVE tree,
and preflight self-retracted its own counts here after catching a transient `DRINZ`-removed state.

**Disposition:** REJECTED (CRITICAL). Do NOT accept "widen WINDOW_Y" — that hides it. The seam is a user
decision: project enemy x/y through the player's attitude before the gun tests them (what the ROM does),
or bound the servo to the reachable window. Route red→TEA with a reachability guard: spawn → stepWave →
guns.step must land a hit at EVERY GMLEVL. That test is the missing regression seam, and it is what
should have existed before the servo was touched.

---

### "No baked artifact to arbitrate" is a claim, not a fact — grep the assembler's own `.MACRO` block before accepting a descope justified by an unverifiable scale

**Situation:** A ROM-fidelity story descopes a table transcription because the source uses a macro whose
scale can't be confirmed. rb4-6: TEA and Dev BOTH asserted (suite header `enemy-machine.test.ts:40` and
`enemy.ts:122`) that P.ODLX/P.IDLX/P.IIDL's `.2WORD`/`.3WORD` macros "carry an unverified ×2/×3 scale"
with "NO baked artifact to arbitrate a transcription — pinning a byte here would risk the exact 'read the
table, ship a fabricated constant' trap the epic exists to kill."

**Problem:** The claim was FALSE, and falsifying it took one grep. The macros are DEFINED at
RBARON.MAC:20-27 — in the same md5-verified file both agents cite, 47 lines above the `.RADIX 16` at :74
that they DID read: `.MACRO .3WORD .A,.B,.C,.D / .WORD 3*.A,3*.B,3*.C,3*.D` and `.MACRO .2WORD ... /
.WORD 2*.A,...`. Corroborated independently: the author wrote each table's 5th entry LONGHAND (`.WORD
80*2` :2949, `2C*3` :2953, `40*3` :2956) precisely because the macro takes only 4 args — the same
multiplier, spelled out. `.LEVLS=5` (:504) plus `LDA I,.LEVLS*2` / `.LEVLS*4` (:2791/:2797) prove the
three tables are contiguous and indexed zone×GMLEVL, and P.WCHK (:2806-2864) servos the delta TOWARD them
("ACCELERATE SO DELTA=MAX", :2832) — not one symmetric cap. Tables recover with ZERO ambiguity:
P.ODLX=[288,280,264,248,256], P.IDLX=[24,60,84,108,132], P.IIDL=[0,48,72,120,192]. So the story shipped an
INVENTED `weaveSpeedCap(ilim)=sqrt(ACCEL·ilim)` to avoid the risk of inventing something — inverting the
epic's purpose while wearing its vocabulary. AC-1 literally names P.IIDL ("accelerates toward the P.IIDL
target by level"); it survives only as prose in a comment.

**Prevention:** A descope's RATIONALE is reviewable evidence, not context. When a story says a ROM value
is unknowable, spend 60 seconds disproving it before accepting: `grep -n "\.MACRO" <source>` (assemblers
define their macros in the file), check whether a sibling/longhand entry re-states the same arithmetic, and
look for the equate that fixes the table stride (`.LEVLS`-style). A deviation resting on a false premise is
not a deviation — it is an unlogged gap, and it must be FLAGGED, not stamped ACCEPTED, even when TEA
pre-authorised it and Dev honestly labelled the stand-in as "inferred". Honest labelling of a constant does
not make the reason for needing it true. rule-checker initially marked this COMPLIANT ("honestly labelled
inferred, plausible reason") and upgraded to a violation only when handed the ROM evidence — so ASK the
subagent to verify the premise, don't just ask it to check the label.

**Disposition:** FLAGGED the deviation, HIGH finding, REJECTED. Fix = transcribe the three tables with
citations, servo toward the zone target, delete the sqrt, and correct the false claim in BOTH the suite
header and the source comment (the lie is duplicated, so a one-file fix leaves it half-alive).

---

### A regression guard that REIMPLEMENTS its consumer cannot guard it — mutate the named production function and require the guard RED; and a hypot/circumscribed-circle "reach" OVERSTATES a rotated-box hit-test

**Situation:** Re-reviewing rb4-6 round 2 — the rework whose whole deliverable was "the soft-lock
guard": AC-R3 in `display-space.test.ts`, a chase rig asserting frames-in-reach > 10 at every
GMLEVL. The suite's own header says "the guard whose absence let round 1 ship. Never delete this."
Dev's mutation table claimed "collides ignores the eye → 3 RED".

**Problem:** AC-R3 never CALLS the production hit-test. It judges reach as
`Math.hypot(now.x, now.y) <= 32*Math.SQRT2` — its own copy of the window geometry — so reverting
`guns.collides` to ignore its eye (round 1's EXACT defect, the one the guard names) leaves all six
AC-R3 tests green; only AC-R2's two pointwise tests fire (the "3 RED" was 2). Worse, the circle
CIRCUMSCRIBES the real rotated 32×32 box, so the guard's margin systematically overstates the
game's: re-measured through the real `collides` (same rig, boresight shell at the plane's depth),
GMLEVL 4's margin was 10.8, not the reported 11.6 — a future WINDOW_X/Y change moves the real
margin while the guard applauds. Same file, same disease in miniature: the "ramp cannot strand the
player" test asserted `PLNLVL[5] === 2` on its own LOCAL literal while `scoring.ts` EXPORTS the
real table — mutating the real export left all 11 tests green. A literal compared to itself is not
a test.

**Prevention:** For any guard whose story names the production function it protects, run the
guard-vs-defect mutation YOURSELF: re-introduce the named defect in the named function and require
the named guard RED — "some sibling went red" doesn't count (here ace-wiring caught one mutation by
crashing, which proves nothing about the guard). Grep the guard's body for the production symbol:
if the guard never imports/calls it, it is a parallel reimplementation and its green is about
itself. For geometry guards, check the metric: circle-vs-box (or any convex-hull stand-in)
overstates reach; run the measurement THROUGH the production predicate before trusting a thin
margin. For any table/constant assertion in a test, check the operand's provenance: a re-typed
local literal pins nothing — assert the EXPORT.

**Disposition:** REJECTED (HIGH) even though production was proven correct — the Reviewer's own
probe through the real `collides` cleared every level (597.3/112.5/24.1/20.2/10.8 vs bar 10), so
the rework is a guard rewrite, not a code fix. Route red→TEA; expect the honest GMLEVL 4 margin
≈ 10.8 and do NOT let anyone re-tune the bar to manufacture slack.

---

### Approving a round the SAME session authored: the fix's own comment is a CLAIM to verify (check #13 covers prose), and a multi-round session file needs its superseded `## Reviewer Assessment` headings retitled before the approval gate reads it

**Situation:** rb4-6 round 3 — a relay session that ran Reviewer→TEA→Dev→Reviewer, so the review
covered tests and fixes written by itself minutes earlier. The delta was tiny (3 test files + 3
source one-liners) and every author-claimed mutation was already "proven".

**Problem (two):** (1) The NaN-safe clamp fix was correct for what it named — but its COMMENT
claimed to be "the total answer for a degenerate hand-built fixture", and the independent
test-analyzer found NaN DELTAS flow unclamped (self-perpetuating: NaN fails every servo comparison)
into the render-facing `bank`. The code fix matched its spec; the comment overclaimed past it — a
fix-introduced small lie that only an agent who didn't write it caught. The author's own re-read
"verified" the comment because the author remembered what it meant, not what it said. (2) The
`gates/approval` gate hunts the session file for "an explicit APPROVED verdict" under
`## Reviewer Assessment` — and after two rejection rounds the file carried TWO earlier assessments
whose verdict lines read REJECTED. A haiku gate reading the first match would fail (or worse,
waver on) a legitimate approval.

**Prevention:** (1) On any self-authored round, treat every comment the fix ADDED as a falsifiable
claim and hand it to the independent agent with the code — "re-scan the fix diff" (lang-review #13)
includes the prose. Weight the subagent's mutations as the approval's evidence; the author's own
mutation table is testimony, not proof. (2) Before running the approval exit on a multi-round
session file, retitle superseded assessments so exactly ONE heading matches `## Reviewer
Assessment` — e.g. `## Round-2 Reviewer Assessment (REJECTED — superseded by round 3)` — keeping
history intact while making the current verdict unambiguous to a fuzzy gate. Same logic as the
"first ## Reviewer Assessment wins the tag scan" lesson: the gate reads headings, not narrative.

**Disposition:** APPROVED with the comment overclaim + delta-NaN gap as a non-blocking Delivery
Finding (production-unreachable, same class the prior round rated LOW with "optional one-liner").
Rejecting a third round over an adjacent latent edge the spec never named is goalpost-moving; the
right cost is a routed finding, not another cycle.
---

### A fix round convened to DELETE false claims can net-ADD them — re-run every row of its own verification table, and know that a behaviour-PRESERVING revert is uncatchable by construction

**Situation:** Re-reviewing round 2 of a story you rejected for shipping a true fix beside false
comments (sw7-16: the surface gun). Dev/TEA return with a mutation table (M1..M6′) proving every
guard now bites, and the round-1 blocking findings genuinely fixed.

**Problem:** The fix round is the *highest-risk* place for new false claims, because the author is
now writing prose ABOUT their own corrections and nobody re-audits prose. sw7-16 round 2 deleted 3
false claims and added 7: a guard-file header asserting "Round 2 makes `shipPoint` exhaustive over
Phase" (TEA wrote the RED expecting it, Dev deliberately declined, nobody reconciled — so the file
asserts a source property that does not hold); "JSDoc trimmed rather than grown" (measured 22→28,
+27%); "crosshairOn is GONE / One copy" (the trench copy survives and that file doesn't import the
shared helper); and round 1's finding 3 RE-BROKEN — a false pointer replaced by another false
pointer ("`tie-peel-away`… the suite that actually drives these paths (`spawnTie`, `moveEnemy`)" —
it drives `moveEnemy` only; retargeting `spawnTie` alone left 1056/1056 green).

**THE STRUCTURAL TRAP — a behaviour-preserving revert cannot be caught by any value assertion.**
Dev claimed "re-inlining the literal reddens 5". `render.ts` called `surfaceShip(altitude)` and the
test asserted `eyeOf(s)` == `surfaceShip(s.altitude)` — BOTH SIDES CALL THE SAME FUNCTION. Reverting
render.ts to the inline `[0, state.altitude, 0]` returns the IDENTICAL value, so 45/45 stayed green.
"Did you call my function or retype the same literal?" is a question about SOURCE STRUCTURE; a value
test can only ever catch DRIFT. Any "reddens N" claim about such a revert is false *by construction* —
you can refute it from the armchair, but run it anyway (10 s) because the author will not believe
the armchair. Corollary: the RED that drove such a story is often a COLLECTION error from the missing
export, not a behavioural failure — "13 reds → green" proves the export exists, nothing more.

**Prevention:** (1) Treat the fix round's verification table as UNTRUSTED — re-run every row you
would cite. (2) For each round-1 finding, ask "is it FIXED, or re-broken in a new form?" — a comment
pointing at the wrong test is often "fixed" with a comment pointing at a *nearly* right test; mutate
EACH caller the comment names, separately, not the helper as a whole (mutating the helper reddens via
the guarded caller and hides the unguarded one). (3) Grep the fix round's own prose for falsifiable
claims (`trimmed`, `GONE`, `One copy`, `exhaustive`, `every guard`, `reddens N`) and falsify each.
(4) When TEA's test header describes a SOURCE change, diff it against what Dev actually shipped —
a declined "recommended" finding silently strands the header.

**Also — CHECK THE HOUSE STYLE BEFORE FLAGGING PROSE AS ROT.** An independent auditor flagged
"the header says this file won't compile but it's 13/13 green" as a Moderate staleness defect. It is
a repo-wide CONVENTION here (`events.test.ts:20`, `aiming.test.ts:19`, `surface-hazard.test.ts:70`
all preserve present-tense RED narrative in merged code). Dismissed with evidence. Auditors reason
from first principles and don't know the house style — grep for the pattern before confirming.

**Also — when 7/9 pf subagents are toggled off AND the review is self-authored (one session ran
TEA+Dev+Reviewer):** spawn independent auditors for the disabled domains and say so in the table
("Skipped/disabled — covered by independent auditor X"), never claim the disabled row as coverage.
On sw7-16 the four independent auditors produced EVERY sharpest finding (the `spawnTie` mutation
proof, the JSDoc measurement, the NaN inversion). Constrain them READ-ONLY and run all mutations
yourself, serially, after they return and `git status` is clean — round 1's test-analyzer left a live
mutation on disk. One auditor independently chose to mutation-test in a disposable copy with
symlinked `node_modules` — that is the pattern to ask for when you want a mutation from an agent.

**Watch your own perl/sed mutations actually APPLY.** My first M1 silently didn't match; the suite
stayed 32/32 and would have "proven" a guard inert. `git diff --stat` after every mutation, BEFORE
trusting the run — an unapplied mutation looks exactly like a passing guard.

**Disposition:** REJECTED again, on the cluster — specifically round-1 finding 3 unfixed + a
provably false row in the verification table. Fix is ~15 lines of prose + optionally 2 lines of code.
Be explicit that the engineering is right and the round is cheap: a second rejection reads as
ceremony unless you show the mutations. Also record where the author corrected YOU (sw7-16: my
round-1 "88 > COCKPIT_HIT_RADIUS (80)" compared the wrong sphere — 80 is the *player's* hit sphere;
the bolt only needs `TURRET_HIT_RADIUS`=200, so no kill was ever lost). Stamp that ACCEPTED loudly —
a review that only ever finds fault in one direction is not being read as adversarial, just hostile.

---

### A multi-aspect finding whose `ours` cites only the FIXED aspect gets stamped `remediated_by` honestly-looking — audit the CLAIM for aspects with no citation anchor

**Situation:** Reviewing a tp1 remediation story that stamps `remediated_by` on findings whose
cited `ours` line the diff genuinely fixed (tp1-20: V-018's quote was the cycling-colour HUD line,
and the colours WERE fixed).

**Problem:** The citation only anchors ONE aspect of the finding. V-018's claim carries three:
cycling colours (fixed), invented captions (fixed), and the SCORES-template LAYOUT — hi-score under
P1's score, level below, a GREEN SCHIIN initials field — which the story deliberately left alone.
The stamp freezes the WHOLE finding, so the un-cited layout divergence vanishes from the audit
permanently. Everything mechanical is green (quote resolves, reanchor 0 lost, citations pass): the
laundering-audit grep for prose edits also passes, because nothing was edited — the overclaim is in
what the stamp SAYS, not in any diff line. Only reading the claim against the stamp catches it.

**Prevention:** For every `remediated_by` added, read the finding's FULL claim and enumerate its
aspects; for each aspect ask "did this diff remove it?" Any live aspect → the stamp overclaims:
require the half-remediated split (W-030/tp1-24) — drop the stamp, re-point `ours` onto living
evidence of the un-fixed aspect, file a curator note for the now-historical fixed half. The session
record (TEA had logged the layout gap as a follow-up) does NOT substitute: the audit JSON is the
machine-checked record, and it must not overclaim even when the sprint files tell the truth.


---

### The eyeball run does NOT require playing to the moment — drive render() directly on models.html with fabricated states

**Situation:** tp1-38's warp-dive render change delegated "the visual" to the Reviewer's eyeball,
but reaching a level-1 warp means clearing a 16-enemy wave — impractical to automate, and tempest
has no dev phase-jump keys (unlike star-wars' 7/8/9).

**Prevention/Recipe:** tempest serves a SECOND entry, `/models.html`, that boots only the contact
sheet — no game loop, so render.ts's module singletons (phosphor, starfield) are yours alone.
Playwright: navigate there, then one evaluate that imports `/src/core/state.ts`, `/src/core/
geometry.ts`, `/src/shell/render.ts`, `/src/shell/fx.ts`, appends an own canvas, and defines
`window.__probe(spec)` = fabricate `initialState(seed)` → set mode/warp/spikes/level per spec →
call `render(ctx, s, W, H, createFx(), 1, 1/60)` ~30 times (settles the phosphor) → screenshot per
state. Four frames covered tp1-38: pre-dive baseline, mid-expansion, the flagged rim-gone phase,
and the fly-in. Verify the PORT OWNER first (`lsof -ti tcp:5273` → cwd) — 5273 belonging to THIS
checkout is what makes the probe evidence, not someone else's tree.

**Also:** screenshots land in the ORCHESTRATOR repo root by default (Playwright MCP cwd) — move
them to the session scratchpad or they dirty the tree the SM is about to commit from.

---

### A mutation-testing subagent reverted my SOURCE files (not just tests) in the live tree — commit BEFORE review so `git checkout HEAD` restores it

**Situation:** rb4-7 review. I spawned reviewer-test-analyzer + reviewer-rule-checker (background,
parallel). Mid-review, PreToolUse system-reminders fired that `src/core/scoring.ts` and
`src/core/waves.ts` had been "modified on disk" — reverted to their PRE-fix `develop` versions — and
debug `console.error` lines had been injected into a test file. A subagent was mutation-testing in the
LIVE working tree (revert source → run suite → confirm the tests go red → restore), and its transient
reverts + my reads overlapped.

**Problem:** This is the "don't verify while subagents mutate" hazard in its worst form — it hit the
PRODUCTION source, not just tests. Any test run I did during that window would show FALSE failures
(mission-clock.test.ts red because scoring.ts was reverted, not because my code is wrong), and a naive
"tests are failing!" reaction would be exactly backwards.

**Prevention:** (1) COMMIT the implementation before review — then a subagent's stray revert is fully
recoverable with `git checkout HEAD -- <files>` (a `git reset --hard` also works; the commit is the
source of truth). I had committed (3d268b6), so recovery was one command. (2) Detect the mutation from
the system-reminders, then WAIT for the subagents to go idle before touching anything — I used a Monitor
polling both subagent transcript sizes until 20s of no growth, then reset, then re-verified SERIALLY.
(3) Treat every subagent test-failure claim during the run as suspect; re-run yourself against a clean
HEAD before believing it. (4) Pass subagents the DIFF as a static file (I saved `git diff develop...HEAD`
to scratch) so their primary input doesn't depend on the live tree they're about to mutate.

**Bonus finding worth reusing:** a RED-phase `as unknown as XModule` cast (needed when the source
interface was still mid-migration) becomes a REMOVABLE leftover once GREEN ships the matching shape —
both reviewer subagents tsc-probed that a single `as XModule` compiles clean and flagged it under
type-safety-escape (check #1). When a story renames an interface field, grep the test casts in the same
commit for a now-stale `unknown` bridge.

---

### A HUD-migration geometry test that pins bbox BOUNDS + a scale RATIO still lets a WRONG-SCALE (half-size) HUD ship green — the ratio is scale-invariant; demand ACTUAL COORDINATES for a known glyph at a known size

**Situation:** Re-reviewing the rework of a font/HUD migration you rejected round 0 for shipping
UNPINNED geometry (an upside-down HUD passed the whole suite). rb4-19 routed red-baron's HUD
text (SCORE/PLANE/GUNS HOT/GAME OVER) through `@arcade/shared/font` via a new pure core renderer
`hudTextSegments`. The rework added `tests/core/hud-font.test.ts` and the whole suite is green
(1253/1253). Round-0 finding F1 explicitly named the axes to pin: "catches y-flip sign, **scale**,
baseline".

**Problem — the delivered geometry test caught 4 of 5 axes and LIED about the 5th.** Mutation-
proven (mine, in an isolated worktree; test-analyzer independently reproduced against the full
suite): invert the y-flip → RED; flip the baseline sign → RED; double the centre offset → RED;
delete the zero-size guard → RED. But `scale = size / CELL_H` → `size / (CELL_H*2)` (a half-size
HUD, or any constant-multiplier scale bug) → **ALL 1253 tests GREEN**. Root cause: the "height
scales linearly with `size`" test asserts only the RATIO `h40/h20 ≈ 2`, which is invariant to any
constant scale factor. Nothing pinned an ABSOLUTE height for a known size. The test's own comment
"(catches a broken scale factor)" is disproven by mutation — a lying guard, the project's cardinal
test sin — and it reproduces the EXACT round-0 reject symptom (a geometry mutation, whole suite
green) on the magnitude axis instead of the orientation axis. Catastrophic scale errors (missing
`/CELL_H` → 24× too big → breaches the left-align `minY>=8` band; near-zero → breaches `h20>4`)
ARE backstopped, so it's a loose `~[0.4×,1.2×]` window, not wide-open like round 0 — but "loosely
pinned + a comment that claims it's pinned" is still a rework in a fidelity project, and F1 NAMED
scale, so it isn't goalpost-moving.

**This is `renderer-migration-routing-vs-geometry` (my own memory) in miniature:** that memory says
"routing tests pass while an upside-down/**mis-scaled** HUD ships green; pin actual output
COORDINATES in a core unit test." The rework pinned bbox BOUNDS + RATIOS instead of COORDINATES —
which is precisely why scale magnitude slipped. Round-0 F1 had asked for the right thing verbatim:
"a known glyph at known x/y/size" (absolute coords catch scale for free); the rework substituted
bounding-box comparisons.

**Prevention:** For any glyph/geometry renderer, require at least ONE assertion that pins an ABSOLUTE
coordinate or extent for a known input at a known size (e.g. "SCORE at size 20 → cap height 20px ±2"),
not just a ratio and not just min/max bounds. A ratio catches non-linearity; bounds catch gross
displacement; NEITHER catches a wrong linear coefficient. Mutation-prove it with a constant-multiplier
scale change (`/(CELL_H*2)`), which is the one mutation a ratio test is structurally blind to. And
when a test's comment names what it "catches", mutate exactly that and require RED — a self-authored
rework is where a comment quietly overclaims past what the assertion delivers.

**Also — the INVARIANT-tail "was-it-drawn" boolean is coarse.** rb4-19's `hudDrawn =
livesCalled && windscreenCalled && hudTextCalled` is a single OR'd flag across four HUD-text draws;
deleting the SCORE draw is caught only because the pinned seed yields an enemy-less frame 0 (SCORE
the sole `hudTextSegments` caller there) and the loop throws on the first failing frame. Deleting
PLANE slips INVARIANT-4 entirely (SCORE keeps the flag true) — caught only by the adoption test's
`routedContent().includes('PLANE')`. No NET coverage hole, but the mock comment overclaims
per-readout protection the single boolean doesn't provide. Capture the specific text per frame and
assert SCORE appears every frame if you want the guard to mean what its comment says.

**Disposition (rb4-19 round 1):** REJECTED. Production is CORRECT (independent auditor worked the
arithmetic: upright, exact centring, AC-4 placement equivalent to the old fillText anchors to the
pixel) — so this is a TEST-hardening rework, not a code fix. Blocking = the scale-magnitude gap +
lying comment (route red→TEA: add an absolute-extent assertion, mutation-prove with `/(CELL_H*2)`).
Fold in the coarse INVARIANT-4 comment, a non-`readonly` `Box` test interface, and a "no descenders"
comment that's false for the shared `,` glyph (true only for the HUD charset). All test/comment side;
~5 lines. Every round-0 finding (F2/F3/F4/F5/F6/V1/V2/V3) verified genuinely fixed.

**Re-review closure (rb4-19 rounds 2→3, what "fixed" looks like):** the durable fix is an ABSOLUTE
assertion, not a tighter ratio — `expect(|h20 − 20|).toBeLessThan(2)` for a size-20 readout (cap
height == size px because the HUD caps/digits fill the full CELL_H; MEASURE it first, it's
integer-exact so ±2 is pure headroom). Keep the linearity ratio too (catches a non-linear mutation
the two absolute points might both satisfy). For the coarse "was-it-drawn" OR, the fix is a DEDICATED
per-readout test that collects ALL offending frames (`frames.filter(!scoreDrawn)` → `toHaveLength(0)`),
NOT another assertion after `hudDrawn` in the same throw-on-first loop (that stays shadowed). Verify
BOTH by mutation: half-size `/(CELL_H*2)` → the absolute test RED; delete the SCORE draw → the
dedicated test RED on ALL frames (not just the enemy-less frame 0). Because production was already
correct, the fix is GREEN-not-RED test-hardening — legitimate, and mutation proof substitutes for a
RED driver. Re-review is still a full self-authored-round pass (4 specialists + own serial mutations
in an isolated worktree); all three rounds reproduced the same REDs independently. APPROVED.

---

### Reviewing a relay-handoff of your own GREEN: the leverage is independent RE-DERIVATION, not re-reading

**Situation:** pf's relay mode hands review to the same context that just implemented (rb4-11:
Dev → Reviewer in one session). Re-reading your own diff finds nothing — you agree with yourself.

**What actually found things:** (1) a from-scratch quarry re-derivation script (Python, not the
vitest suites the Dev phase ran) — proves the transcription without trusting any test the same
hands wrote; (2) the independent specialist subagents — ALL three real findings (call-detector
recorder, sign-blind ratios, unpinned exact value) came from them, zero from self-re-reading;
(3) settling disputed premises at the SOURCE (the gondola −20 read straight out of 037007.XXX),
not from either side's test comments.

**Rule of thumb:** when the review is a relay, budget your own effort into verification the Dev
phase did NOT run (fresh derivations, source lookups, tracing degenerate cases the tests never
stage) and let the subagents own the diff-reading. And check recorder mocks for WHAT they record:
a tap that logs the INPUT of the function it wraps turns every "is drawn/is produced" assertion
into a call-detector — mutation `return []` and see if anything reddens before trusting it.

---

### Seam-agnostic render tests (colour-family + span/topology) are BLIND to vertex-ORDER errors — hand-verify a ported ROM picture's point sequence against the source

**Situation:** Reviewing sw7-15 / M-010 — a ROM 2D vector picture (the Death Star: a green
BSCIR circle + white BSTRN trench + red BSDSH dish) ported into flat `Model3D` point tables and
drawn seam-agnostically (the TEA suite asserts colour FAMILY present + geometric SPAN/offset, per
the repo's "colour-family + topology, not pixels" convention).

**Problem:** those tests cannot see a SWAPPED PAIR of vertices. The Death Star circle had its last
two points transcribed in the wrong order (`(-50,0),(-49,10)` instead of the ROM's
`(-49,10),(-50,0)`), which crosses one rim edge over its neighbour — a visible kink/self-crossing
on the disc's left edge. But the x/y SPAN is unchanged (both points are still present) and the
COLOUR is unchanged, so all four M-010 palette/span tests stayed green over a real transcription
defect. It sailed through TEA (who wrote the seam-agnostic tests) and Dev (who transcribed it) and
was caught only by the reviewer reading the point table against the ROM source line-by-line.

**Prevention:** for any ported ROM PICTURE/shape, do not trust palette+span tests to prove the
geometry — open the `.MAC` source and check the point SEQUENCE (order + closing edge), not just the
point set. Then pin the order with a cheap, robust guard: a closed convex loop centred at the origin
winds ONE way, so assert every consecutive cross-product `x_i·y_{i+1} − y_i·x_{i+1}` has the SAME
sign (a swap flips exactly one). Mutation-prove it (fails on the swap, passes on the fix). Note the
guard covers only what you guarded — here the body circle got the winding pin; the dish and trench
orders were hand-verified against the ROM but are still only span/palette-pinned, so a future edit
could reintroduce a kink there. Order-blindness is the systematic gap in span/family fidelity tests.

---

### When the ENTIRE subagent fleet fails to return, say so and do the work — and check the CONVENTION-vs-CODE axis a "documented" seam hides: an exported type's docstring can state the INVERSE of its own code and no test will care

**Situation:** sw7-10 (star-wars attract mode + WSSTAR starfield). I spawned 9 specialists:
2 died instantly (`respawn pane failed: fork failed: Device not configured`), 4 more reported
"Spawned successfully" and returned NOTHING across ~10 minutes and 4 explicit FINAL-CALL
pings each; 5 were disabled by `workflow.reviewer_subagents`. Net independent coverage: **zero**.

**Problem 1 — the gate wants `All received: Yes` and you will be tempted to write it.**
Don't. Write `No`, enumerate what actually happened per row, and put what *you* did in the
Decision column ("Covered by Reviewer: …"). The agent def is explicit — "you cannot claim
coverage from a subagent that failed" — and a falsified gate line is worth less than a
blocked transition you can explain. Budget for doing all 9 domains yourself: it is
achievable in one session if you stop pinging early (2 pings, then commit to solo) and
spend the time on mutations instead of on waiting.

**Problem 2 — the finding the fleet would have missed anyway: an INVERTED DOCSTRING on an
exported type, on an axis no test varies.** `CrawlLine.size`'s docstring said "0 at the
vanishing point"; the code, the render comment, the test-file header AND a test's own
assertion message all said the opposite (0 = born near/big, 1 = retired at the vanishing
point). Three corroborating sources, one lone outlier — and the outlier was the *only* place
the convention was documented. Mutation-proved it matters: re-inverting the render
(`remaining = 1 - size` → `size`) left the FULL suite green, because the render test fixed
every line at a constant `size: 0.4` and therefore never varied the axis at all.

**Why that is HIGH and not a comment nit:** the story's own Dev Assessment said this exact
inversion had ALREADY shipped once and was caught only by driving the game in a browser. So
the surviving docstring is the *pre-fix* description, sitting on the type contract, with zero
test coverage beneath it. Wrong docstring + uncovered axis + documented prior occurrence of
that precise bug = the next dev "fixes" the code to match the comment, sees 1751 green, and
re-ships it. Severity comes from the COMBINATION, not from any element alone.

**The systemic tell — ordinal guards everywhere, absolute guards nowhere.** Two unrelated
mutations both sailed through 1751 tests (the crawl inversion, AND reading `#0200`/`#0100`
as decimal 200/100). That is a shape: every guard in the story was order/presence/relative
("hiscore dwells less than banner", ">1 signature", "≥40 more marks", "later size > earlier").
All of them survive a constant multiplier anywhere in the chain. When two mutations on
different subsystems both go green, stop treating them as separate findings and name the
pattern — then demand ONE absolute assertion per axis (`pageDwellSeconds('banner') ≈ 24.97s`).

**Prevention:** (1) For every exported type whose field encodes a DIRECTION or a normalised
range, grep every other mention of that field and require them to agree; the docstring is the
one that rots, because it is written first and never re-read. (2) If a render test pins a
derived quantity, check whether it VARIES the input — a fixture with one constant value
cannot pin a mapping. (3) Inline `FILE.MAC:NNNN` comments in `src/` are ungated in this repo:
`citations.test.ts` machine-checks only `docs/audit/findings/*.json`, which is exactly why a
wrong anchor (`WSMAIN.MAC:3176`, quote actually at `:3178`) survived TEA, Dev and every gate.
Spot-check source-comment anchors by hand; they have no net.

**Also — record where the author was RIGHT and you were WRONG.** I suspected Dev overstated
"1751/1751 passing" because my worktree run showed 1749+2 skipped; the main tree really is
1751/1751 and the skip was a worktree artifact. I put that retraction in the assessment.
A review that only ever finds fault in one direction reads as hostile, not adversarial — and
on this story the transcription was genuinely byte-exact across ~25 citations and 31 ROM
strings, with the radix trap navigated correctly in BOTH directions (`M$STNM ==50.` decimal,
`#0200`/`ANDB #10` hex). Say that plainly before the severity table.

**Disposition:** REJECTED on the one HIGH (inverted docstring + uncovered axis), with 3 MEDIUM
and 4 LOW. Fix is ~1 docstring, 1 digit, 1 claim, 2 test assertions — cheap, and worth being
explicit about that so a rejection on a near-perfect story does not read as ceremony.

**FOLLOW-UP (same story, sw7-10) — the "failed" fleet returned AFTER I closed the phase, and
the auditor's headline claim CONTRADICTED my blocking finding. Chase it to source; do not
fold, and do not dismiss.** The ROM auditor argued the crawl direction was inverted in the
CODE (i.e. my "docstring is wrong, code is right" was exactly backwards). Its mechanism
reading was sound; its POLARITY reading was not. What settled it needed no knowledge of the
AVG scale field at all — three ROM comments in a chain: the list is "FOR MESSAGES THAT RECEDE
INTO THE DISTANCE" (TCMES.MAC:167), the accumulator "ALWAYS STARTS AT LINEAR SCALE OF 0"
(:183), and the line retires at the accumulator's MAX (:415). Start=0 and end=max across a
RECEDING life ⇒ 0=near/large, max=far/gone. Its reading (born at the vanishing point, growing
toward the viewer) is APPROACHING, which contradicts :167 outright.

**Three transferable rules from that exchange:**
1. When a subagent contradicts a finding you mutation-proved, re-derive from PRIMARY SOURCE on
   a DIFFERENT axis than the one you both used. I had structural evidence (4 sources agree, 1
   outlier); the refutation came from semantic evidence (the ROM says "RECEDE"). Two
   independent routes to the same answer is what makes a contradiction settle instead of
   ping-pong. The contradiction left my finding STRONGER than it was.
2. A wrong headline does not make an auditor wrong. Same report was 3-for-4 on substance and
   handed me four defects I had missed — two more wrong anchors (`WSSTAR.MAC:110` is `BLO 4$`;
   VGCWHT is at `:113`), an invented motion model (the ROM has FOUR per-page star drifts at
   WSMAIN.MAC:2244-2269, uncited; the port runs one), and a rate contradicted by source
   (`STAR_SPEED=0x40` vs `#0080` everywhere). Grade item-by-item, never report-by-report.
3. Late results are still results. I had recorded the fleet as failed and written
   `All received: No` — correctly, at the time. When they landed I appended an ADDENDUM under
   a `###` sub-heading (never a second `## Reviewer Assessment`, which the approval gate scans
   for), re-ran `story update --review-verdict`, and explicitly stated the verdict was
   unchanged. Do not silently rewrite history and do not ignore the data because the phase is
   closed.

**The diagnostic that came out of it, worth reusing on any transcription story:** separate the
TEXT layer from the ARITHMETIC/MOTION layer and score them apart. Here strings were 32/32
byte-perfect while every single defect (6 of them) sat in the reasoning layer — *where the dev
quoted, they were exact; where they reasoned from a citation, the citation was off and the
reasoning followed it off*. If a fidelity story looks flawless, you have probably only audited
its text.

---

### For a trajectory/feel fix, adversarially probe the SIDE EFFECT on OTHER gated systems — but MEASURE it in a full wave, don't reason from the gate in isolation

**Situation:** sw8-6 (star-wars) changed one line — `spawnTie`'s heading from `lookRotation(toCockpit(pos))`
(nose at origin) to a straight `lookRotation(FACING_PLAYER)` so offset TIEs CARRY their lateral offset
(the field-crossing sweep). The tests all pass; the mechanism is clean.

**The real reviewer question is not the changed line — it's what else reads `orient`.** Grep found the
enemy FIRE gate: `C_AS` ("in sights") = `dot(nose, toCockpit(pos)) >= cos(12°)` (tie-status.ts). With the
nose now fixed down-range while the fighter carries an offset, the angle to the cockpit GROWS as it
closes (`x/depth > tan 12° ≈ 0.213`), so an offset TIE leaves the fire cone at close range — I predicted
a fire REDUCTION and a possibly-toothless wave. **Reasoning from the gate in isolation was wrong.** A
throwaway full-wave probe (`initialState`, step `stepGame` with NO_INPUT, count `enemy-fire` events, fix
vs. reverted) showed fire went UP (6 vs 4): the same heading change makes offset TIEs fly PAST instead of
ram-and-vanish at ~f62, so they live longer to fire, and the homing re-aims them mid-pass. The
second-order dynamics dominated the first-order gate effect. Measure the side effect end-to-end (put the
probe OUTSIDE `tests/` or delete before you finish), don't approve OR reject on the gate math alone.

**And a `reviewer-rule-checker` "stale citation" flag is a FALSE ALARM when the finding is
`remediated_by`.** The checker flagged audit finding A-009 (`cites sim.ts:1163 "function moveEnemy(...)"`,
now a different line) as drifted. But A-009 carries `remediated_by: sw7-11` — the citations gate
DELIBERATELY skips remediated findings and freezes their line as a historical record (that is why
`citations.test.ts` was green). Before confirming any "citation drift" finding, check the finding's
`remediated_by`/frozen status; a frozen citation pointing at retired code is correct, not a defect.

---

### A subagent's "stale quarry copy / N-line offset" claim can be ITS OWN newline handling — adjudicate with universal-newline reads of BOTH copies before believing it

**Situation:** cp2-16 review. The rule-checker verified all 8 new CENTI4.MAC citations exact
against the repo-bundled quarry (`reference/atari-source/...`) but reported the OTHER local copy
(`~/Projects/centipede-source/...`) as "stale, systematically 2-line offset" (`:1284` allegedly
landing on `AND I,0F`), md5s and line counts differing.

**Problem:** the review had used that other copy for its own verifications — a true staleness
claim would have invalidated every line cite made from it, and blindly repeating the subagent's
framing into findings would have planted a false "corrupt quarry" record. But these ROM sources
are CRLF-MIXED: split them without universal newlines and line numbers drift; md5/line-count
deltas can be pure newline bytes. The subagent's offset was an artifact of ITS splitting, not
the file's content.

**Prevention:** before recording any quarry-discrepancy claim, read BOTH copies with
`open(p, newline=None, encoding='latin-1')` and print the exact disputed lines side by side. In
this case every cited line was IDENTICAL in both copies (`:1284 LDX I,NCENT-1`, `:1449 JSR
PLAY`, `:1805-1806` stamp) — the right disposition was "citations verified against both; prefer
the repo-bundled path as canonical", not "stale copy". The general rule: a line-number dispute
between two readers of the same ROM source is a NEWLINE question before it is a REVISION
question.

---

### A story that RETIRES a mechanism silently HOLLOWS OUT the suites that guarded it — the tests stay green because they can no longer fail

**Situation:** sw8-8 (star-wars) retired `spaceEye`, a frame-driven space camera, replacing it with a
constant cockpit origin. The author correctly retired and inverted the ONE suite named after the
mechanism (`render.moving-eye.test.ts` → `render.space-camera.test.ts`) and shipped 1985/1985 green.

**Problem:** a DIFFERENT suite — `bounded-eye-combat.test.ts`, the sw8-2 guard for "incoming fire
stays shootable/fair", i.e. the exact invariant the story existed to restore — went from meaningful
to **incapable of failing**, and stayed green the whole time so nothing flagged it. Its four tests
all read the eye through `eyeOf(s)`; once `cameraView` returned a constant, `eyeOf` was `[0,0,0]`
for every state, including the `frame: 50_000` and `advance(…, 1600)` fixtures built specifically to
exercise drift. Its last assertion reduced to `Math.hypot(0,0,0) < 33_000` — `0 < 33_000`. Its header
still described the deleted `spaceEye` as present-tense fact. Green, reassuring, and dead: a future
regression of the very split the story fixed would now be caught only by the new suite, while a file
called "bounded-eye-combat" sat there looking like a guard.

**Prevention:** when a diff DELETES or CONSTANT-FOLDS a seam, do not review only the files the diff
touched. Grep every consumer of the retired seam (here: the 13 importers of `eyeOf`) and, for each
test that reads it, ask *can this assertion still fail?* The tell is a value that used to vary and
is now compile-time constant — assertions over it are literals comparing literals. The retiring
story's own suite is usually handled (the author is thinking about it); the collateral suites in
OTHER stories' files are the ones that rot, and `vitest` will never tell you, because passing is
exactly what they do. Narrow it fast: consumers on untouched phases/branches are unaffected — here
11 of 13 were surface/trench and only 2 saw the space change.

**Prevention (the mirror trap):** an INVERTED test can over-reach past what the source supports.
The same diff inverted "the Death Star leaves frame" into "the Death Star holds the optical axis
to 1e-6". The ROM evidence supported only "the CAMERA does not drift" — and the epic's own design
spec recorded a direct longplay observation that the station IS entirely out of frame mid-combat.
So the inversion pinned as an invariant something our own primary evidence refuted, and would have
blocked the correct follow-up. When you invert an assertion, check that the NEW claim is the one the
source actually makes, not merely the negation of the old one — negation is not evidence.

**Also:** disabled specialists are not coverage. Five of nine reviewer subagents were off via
`workflow.reviewer_subagents`; two of the seven confirmed findings (a dead `state` parameter hidden
by `noUnusedParameters: false`, and the design-spec conflict) came from assessing those domains by
hand. Record the disabled rows honestly as "Skipped / disabled" AND say who covered the domain
instead — otherwise the table reads as if nine specialists agreed.

---

### Re-reviewing a MERGE RESOLUTION: the author's own verifications are structurally blind to a mis-anchored DUPLICATE, and a story's own edit can invalidate a citation written in the same commit

**Situation:** sw8-8 (star-wars) round 3. The story retired `spaceEye`; while it sat in review,
`origin/develop` gained uf1-12, which built a NEW consumer (`C_PS`, the player-sights bit gating a
choreography branch) on the very seam sw8-8 deletes. Dev merged develop in, re-pointed both consumers
at the cockpit, re-seated 25 tests, and re-anchored 36 audit citations. Round 2's APPROVED verdict on
the branch's own content stood; the re-review was scoped to the resolution.

**Problem 1 — "the diff is only `line` changes" and "the `remediated_by` counts match" BOTH pass a
silent mis-anchor.** Dev verified the citation re-anchor two ways beyond the tool's own report, and
both checks are real, and neither can detect the failure mode. The re-anchor tool matches
NEAREST-LINE, so when a pinned verbatim occurs more than once in its file it can be re-pointed at the
WRONG occurrence — and `check-citations.mjs` re-opens the pin against the working tree, finds the
text it expected, and goes green forever while the finding now describes a different routine. A
sibling story (td1-13) had already been filed naming this hazard AND the exact two duplicated
verbatims in `sim.ts` (`      damage++` and `    if (collides(s.pos, ship, COCKPIT_HIT_RADIUS)) {`,
each appearing twice because the space and surface cockpit-damage paths are near-identical). Two of
the three duplicate-verbatim pins in the whole findings set moved in this very round.

**Prevention:** enumerate the pins programmatically, not by reading the diff. For every finding,
count occurrences of `ours.verbatim` in `ours.file`; for every pin whose count > 1 AND whose line
moved, open BOTH occurrences and decide from the finding's CLAIM which one it means. Here `G-009`
(fireball→player hit) and `S-016` ("every colliding TIE and fireball does `damage++`") both belong to
the SPACE path — verified by the enclosing section comment and the emitted event (`cause: 'enemy'` vs
`cause: 'turret'`). Also reconcile the checked-pin COUNT: 96 gate-checked here, and the 41 that do
not resolve against the working tree are the `remediated_by`/`NO_COUNTERPART` ones the checker
deliberately does not re-open (`check-citations.mjs:150-165`) — if you don't establish that split you
will either report 41 phantom failures or miss a real one.

**Problem 2 — a citation and the edit that invalidates it can land in the SAME commit, so no diff
ever shows them disagreeing.** sw8-8 added a 31-line `AMENDED` blockquote to a design spec and, in
the same commit, a new test file citing that spec at `:26-30` for a longplay observation. The
citation was CORRECT when written; the amendment pushed the quoted sentence to `:45-46`. Two full
review rounds read past it. The general hole: the audit gate re-opens ROM citations, but nothing
re-opens a `file.md:NN` or `.MAC:NNNN` span embedded in an ordinary source comment. Six such defects
shipped in this one branch.

**Prevention:** for every line-span citation ADDED or MOVED by the diff, re-open it — and when the
diff also EDITS the cited file, re-open it in both revisions (`git show <base>:<file>` vs the working
tree). A citation into a file the same commit touches is guilty until proven innocent. Prefer naming
the SYMBOL over the line when reviewing the fix.

**Meta-lesson that cost the most: sync the orchestrator BEFORE reviewing.** This checkout was 21
commits behind `origin/main`. The story record for uf1-12 — whose acceptance criteria I needed to
rule on the seam — did not exist locally; I had to read it from `origin/main:sprint/epic-uf1.yaml`.
Worse, the Dev sidecar on `origin/main` ALREADY carried Problem 2 as a lesson ("a line number in a
CODE COMMENT is outside the gate entirely … nothing catches that but you; name the symbol instead of
the line"), written by uf1-12 days earlier. The institutional memory that would have caught the
round's headline finding was one `git pull` away. `git fetch` on the SUBREPO is not enough — fetch
and read the orchestrator too.

**What the round got right, worth repeating:** re-prove the story's own tripwire on the MERGED tree
rather than the tree it was written against. The merge rewrote `tie-status.ts`, so I backed up
`render.ts` by `cp` (never `git checkout` — see `git-checkout-clobbers-uncommitted-mutation`),
reinstated the retired bounded eye in `cameraView`, and got 6 of 12 red across all three tripwire
suites with the original defect message verbatim; restored, md5-matched, CONTROL 12/12 green. And
when you suspect a re-seated negative control is vacuous, look for the STRUCTURAL argument before
measuring: here the player's aim does not influence the fighter's flight, so the tracked and parked
runs fly identical trajectories until the branch diverges, which means only the sights bit can
differ — the mirror positive is what makes the negative interpretable, and no fixture choice can
change that.

---

### "The socket accepted the connection" is NOT "the channel works" — and on a multi-app dev server the socket that accepted may belong to a different app

**Situation:** mg1-2 mounted seven per-game Vite servers under one parent. Each child defaulted to
its own HMR websocket on port 24678; six lost and printed `Port is already in use` on every start.
The fix — `hmr: { server: parentHttpServer }` — silenced it, and Dev verified by checking that a
`vite-hmr` websocket upgrade was accepted. Every test was green.

**Problem:** the upgrade that was accepted was the LOBBY's. All seven children share the parent's
HTTP server, so the parent's own socket wins every upgrade and the children's messages go nowhere.
Game HMR was entirely dead, and the session file asserted "HMR for all eight apps now rides one
HTTP server" — a false claim about to be archived as the permanent record. A loud failure had been
traded for a silent one, which is strictly worse.

**The probe that settled it** (and the one to reach for on ANY push-based channel): don't inspect
configuration and don't check that a connection opens. **Exercise the channel end to end** — open
the socket, modify a real source file, and assert the message arrives. Editing
`plugins/tempest/src/core/rules.ts` delivered nothing; editing `lobby/src/shell/tiles.ts` delivered
`full-reload:*`. Two lines of measurement refuted a whole paragraph of claim.

**Then measure the severity separately from the defect.** The follow-up question — is content
merely un-pushed, or STALE? — decides everything. Re-fetching a game module after the edit returned
fresh content, so the watcher was live and a manual refresh works: degraded DX, not a broken
deliverable. That is the difference between "reject and rework the mechanism" and "keep the code,
fix the record, file the follow-up." Ask it before assigning severity.

**Generalisation:** treat any "verified X works" whose evidence is *existence* (a socket opened, a
file is present, a route returns 200, a symbol is exported) as unverified. The evidence must be the
BEHAVIOUR, and on a multi-tenant surface it must additionally show the RIGHT tenant answered.

---

### Rejecting on a MEDIUM is allowed — the blocking rule is a floor, not a ceiling

**Situation:** mg1-2's three findings graded Medium, Medium, Low against the severity table
(Critical/High block; Medium = "missing edge cases"). Every AC was met and the suite was green.

**Why reject anyway:** one finding was `/tempest?x=1` silently serving the LOBBY — a *silent
wrong-app serve*, which is the precise defect class the epic was filed to eliminate, and the same
shape as the vacuous all-200 check that created the story. The other put a refuted claim into a
record about to be archived. Both fixes were about ten lines total.

**The rule reads "Any Critical or High = REJECT."** That FORCES rejection above a threshold; it
does not forbid it below one. When a Medium is an instance of the exact failure the story or epic
exists to prevent, the charter outranks the grading table — but say so explicitly in the verdict
rather than inflating the severity to justify the outcome. Inflating it corrupts the severity
vocabulary for every later review.

---

### When round 2 approves, REWRITE the verdict — the gate reads the FIRST `## Reviewer Assessment`, and an archived REJECTED next to a done story is a lie

**Situation:** mg1-2 was rejected in round 1 and approved in round 2, with the same agent doing the
rework in-session.

**Problem:** appending a second `## Reviewer Assessment` leaves the gate reading round 1's
REJECTED, and archives a session whose first verdict contradicts its outcome. Deleting round 1
instead loses the record of what was caught and why the code has the shape it has.

**What worked:** ONE assessment section, verdict APPROVED at the top with "round 2" stated, a
per-finding verification table (`FIXED` + *how I re-verified it, independently of the fixer's
claim*), and round 1's full table retained below under an explicit `### Round 1 — REJECTED (all
findings now fixed; kept for the record)` heading. Re-label round 1's trailing
`**Handoff:** Back to Dev` so only one operative handoff line remains. Verify with
`grep -c '^## Reviewer Assessment'` → exactly 1, and check which verdict line comes first.

**Related:** the same rule applies to `review_findings` in the epic YAML after a multi-round story.

---

### Reviewing your own work by hand finds OVERSIGHTS; it does not find FALSE BELIEFS — that is what the specialists are for

**Situation:** mg1-2. Round 1 was a by-hand review of code I had written myself, with no specialists
available. It was genuinely careful — it probed nine URL shapes against a live server and found a
silent lobby-serve, exercised HMR end to end and found it dead, and caught an unreachable hook. Three
real defects, all rejected on. Round 3 then ran the four enabled specialists over the SAME diff and
they found four more.

**The pattern in what they found is the point.** Both defects in code I wrote were things I had
already reasoned about and believed I had handled:

- I wrote the anti-vacuity guard for the loops — and applied it at two of four call sites. Reviewing
  my own file, I read the guard I remembered writing rather than the four places it needed to be.
- I wrote a confident comment explaining why `apply: 'serve'` prevents the plugin recursing into its
  own child servers. `rule-checker` went into Vite's source and refuted it: `apply` filters by
  COMMAND, and a middlewareMode child still resolves command `'serve'`, so such a plugin is KEPT.
  The code was safe for two reasons my comment never named.

Neither was an oversight of something unconsidered. Both were **false beliefs I had already
committed to prose** — and self-review re-reads the belief instead of re-deriving it. That is the
category a second reader reaches and you cannot.

**Practical rules:**
- When you wrote the code, say so in the specialist brief and ask them to verify your STATED
  RATIONALE, not just the behaviour. The best finding of this review came from someone checking a
  comment's reasoning against the library's source.
- A guard applied "everywhere it's needed" by hand is a guard applied at some of the places. Prefer
  hoisting it somewhere a new call site cannot opt out of — and mutation-test that the hoisted
  version fires more widely than the hand-written one did (here: 5 tests fail, versus 2 before).
- Do not stamp the subagent gate's `All received: Yes` for specialists that did not run. If the
  harness blocks spawning, say so, assess the domains by hand, and ASK — the authorisation took one
  question and bought four findings.

**And still verify what they hand you.** Of four specialists, two returned a claim that did not
survive checking: preflight's rolled-up total was a digit-concatenation of the two suites
(`345748` for 335 + 10413), and security's `fs.allow` scoping claim implied `@shared` was
unreachable — which would have meant a runtime break, refuted in one request
(`/tempest/@fs/<repo>/src/shared/rng.ts` → `200 text/javascript`). Neither changed an outcome, but
both would have entered the permanent record as fact. Credit where due: security caught its OWN
false positive mid-review when plain `curl` normalised `..` client-side, and re-ran with
`--path-as-is`.

---

### A story that SHIPS a source-scanning guard: attack the guard, not just the code — and the guard's own comments are the likeliest place a false claim hides

**Situation:** mg1-9 (typecheck `src/shared/tests`). The implementation was genuinely clean — 22 type
errors closed by making the Web Audio doubles `implements` the real interfaces, no cast, no `any`, no
`@ts-` directive, production signature untouched. rule-checker swept 30 rules / 61 instances: zero
violations. preflight re-measured four baselines: all exact. security: clean. Three specialists green
and the diff looked approvable.

**What was actually wrong lived in the guard the story shipped to enforce its own AC.** The suite's
premise was that "tsc exits 0" is satisfiable five ways and four are worthless, so a source scanner
banned casts/`any`/`@ts-*`. That scanner had a **true false negative**, and it took executing the
scanner to find it:

```
const s = "quote" // contains a stray backtick ` here
const c = ctx as unknown as AudioContext
const t = `template`
```
→ `findSuppressions()` returns `[]`. The same cast alone is flagged.

Two deliberate design choices interacted: the line-comment strip excludes quote characters from its
prefix class **on purpose** (so `'http://x'` isn't eaten), which leaves a comment intact on any line
with an earlier quote; and the backtick-literal regex is the only one of three whose class does not
exclude `\n`, so a surviving stray backtick pairs with the OPENING backtick of a real template
literal further down and swallows the code between. Printing what the scanner believes it is reading
made it undeniable in one line: `const s = "" // contains a stray backtick ``template``.

**The reviewing technique that works on any scanner story:**
1. **Import the exported scanner and call it directly.** Do not reason about the regexes. Feed it a
   real cast, then the same cast with adversarial context around it.
2. **Print the STRIPPED text**, not just the verdict. The bug is always visible there and invisible
   in a boolean.
3. **Probe both directions and say which way it fails.** A false positive fails closed (a nuisance);
   a false negative is the actual hole. Rank them accordingly — I graded the FP Low and the FN Medium.
4. **Verify the fix is safe before demanding it.** I asked for the backtick literal to be bounded to
   one line only after measuring that the target file has **0 multi-line template literals and 0 lines
   with an odd backtick count**. A required fix you have not checked is a guess with a deadline.
5. **Check whether the guard flags its own documentation.** A ban on the literal `@ts-nocheck` reddens
   on a comment saying "never add @ts-nocheck here". mg1-9's file survived only because it happened to
   write the glob `@ts-*`. Proven by running it, and a tighter regex (directive must sit immediately
   after the comment opener) was verified against 3 real directives and 2 prose mentions.

**And when `comment_analyzer` is disabled, own that domain explicitly.** It is off in
`workflow.reviewer_subagents` on this project. Four of my eight findings were documentation defects —
a claim about the guard's reach that was wrong in THREE files ("every file under src/shared/tests"
when the test filters to `*.test.ts`), a directional error ("above" for a line 337 lines below), the
self-flag trap, and a miscount ("the three failure messages" pointing at four recorded mutations).
None is dangerous; together they are the jt8-6 pattern exactly — that story burned three rounds
because every defect lived in the one domain with no specialist. On a comment-dense diff, budget for
prose review yourself and say in the assessment that you did, rather than letting a disabled row read
as covered.

**Balance the verdict explicitly.** Say what you are NOT asking to change. This rejection touched
zero production code, zero doubles and zero config — it was the guard file plus four comment edits —
and stating that up front is the difference between a cheap round and a demoralised one.

**One process note:** test-analyzer's first return was already complete, but it had run long enough
that I asked for a status re-confirmation before trusting it. The second return matched item-for-item.
Asking cost one message and would have caught a truncated report; the sw7-16 lesson (an incomplete
subagent return is not a clean one) applies to slow returns as well as visibly-truncated ones. Then
re-verify the headline finding yourself regardless — I reproduced the bypass and the fix's safety
first-hand before putting either in the assessment.

---

## Reviewing an audio SEAM: the suite's three sweeps are one sweep (jt5-1, joust, 2026-08-01)

The fleet's three-file audio seam ships with a suite that reads thorough and has a structural blind
spot. `core/events.ts` exports an `EVENT_KINDS` tuple; the manifest sweep, the dispatch sweep and
the coverage check all read **that same tuple**. They agree with one another whether or not a single
event is ever emitted. A kind can be declared, mapped, dispatched, ROM-cited and stone dead.

Measured by deleting one emitter at a time from the SHIPPED source: **six of eleven cues reddened
zero of 1932 tests.** The five that were pinned were exactly the five reachable in the input script
TEA happened to write. Do this deletion pass on any seam story — it takes ten minutes and it is the
only thing that distinguishes "wired" from "working".

Two mechanics: neutralise with `void 0` rather than a bare cut (a bare cut leaves a dangling
`if`/`for` and the resulting `tsc` failure is your edit, not a signal), and make every mutation
assert that it landed — one that the shell ate reports a false 0 and reads as "that guard is
scenery".

## The citation gate cannot see SCOPE, only bytes

This is the sharpest finding a ROM-fidelity review can make, and it looks like nothing. jt5-1 cited
`JOUSTRV4.SRC:4711 "LDX #SNBOUN  AWARD BOUNTY SOUND"` for its wave-bounty cue. Byte-perfect,
correctly interpreted, gate green — and wrong, because **:4711 is that symbol's only call site in
the entire ROM** and it sits inside `SPDGLA`, the gladiator award. The port also fired it for the
co-op and survival bonuses, which award the same points and play *nothing*.

So: **grep the whole ROM for the cited symbol and count its call sites** before accepting that a
citation covers every path the port applies it to. Then scan upward for the routine label that OWNS
the line — the owner's name is usually the whole finding. Where the port has a branch the machine
does not cue, that silence is a transcription and belongs in a comment, or the next reader "fixes"
the gap.

The mirror case is real too and justifies sharing a cue: joust's `PTERST` (:1423, `CLR PCHASE`
"NOT A BAITER") and `BAITST` (:1427) are adjacent entry points falling into one body that reaches
`LDX #SNPTEI`, so a baiter legitimately screams. Check which shape you have; do not assume either.

## Under relay, your own staging is the thing most likely to lie

Writing regression tests as Reviewer, three of my first twelve failed — all three my staging, none
the implementation. One mattered: an entity pair staged *outside* the collision box produces no
contact at all, so `not.toContain('ptero-death')` passes because nothing happened. The control has
to sit inside the box and outside the decision band, so a real opposite outcome occurs. Dev's
discarded probe had made the same error in the other direction.

Also: do not hardcode a wave number in staging. joust's wave counter is BCD-packed (the tenth wave
is `0x10`), which is td1-12's open question — a test naming "wave 10" asserts against whichever side
of that question you wrote it on. Assert the invariant per advance and let the sim supply numbers.

## Say which fixes no test can pin

Reverting my own cliff fix (by-name set comparison → length comparison) reddened **0** tests,
because no wave in the shipped table destroys and rebuilds in the same advance. The fix is still
right — the code it reads documents that destruction reflects rather than latches — but the green
suite is not evidence it was needed. Write that down. "Found and fixed a bug" overclaims; silence
lets the next reader believe coverage exists.

## When a diff ADDS ROM-cited comments, hard-ask the rule-checker to sed-verify every cite EXTENT (sw8-10, 2026-08-01)

Same-session review (one session wrote tests, code, and review). The two-specialist star-wars
fleet (preflight + rule-checker) was enough for a real round-1 rejection BECAUSE the rule-checker's
prompt included per-claim hard asks: the ROM file path plus "verify each quoted instruction
sequence sits inside its cited range, with sed". It found a quote spanning :1082-1087 cited as
:1083-1085 and a two-instruction pair cited by its last line only — the jt8-6 claim-extent class,
invisible to the author because the author KNOWS what the range means. My own independent layer
(ADASHP re-derivation + two mutation runs + spawnCount lifecycle trace) verified the LOGIC but
missed both cite extents entirely: re-derivation checks the mechanism, not the prose. Division of
labour to repeat: reviewer re-derives and mutates; rule-checker audits every citation extent with
line-numbered reads. And when rejecting round 1 on findings you prescribed exact fixes for, write
the prescription INTO the findings table — round 2 here was a 15-minute verify because the fix
had no design freedom left.

---

### A story that GROWS a file invalidates every citation pointing INTO it — including its own. Check the diff's citations against the POST-diff line numbers.

**Situation:** cp5-2 added 33 lines to `main.ts` and ~42 to `shell/audio-dispatch.ts`, and its tests and
comments cite both files heavily.

**Problem:** four citations written during the story were correct when written and wrong when shipped.
The worst was `main.ts:183`, cited twice as "the trailing `requestAnimationFrame(frame)`". After the
diff, :183 is `const board = sim.highScoreTable` — a real, plausible line inside the same function. A
reader who checks it does not see an obvious error; they see code and assume the claim is corroborated.
That is the jt8-6 lesson exactly: a wrong-but-plausible citation *manufactures* corroboration, and is
worse than an obviously broken one.

**Prevention:** for every `file:line` in the diff, ask which side of the diff the number was counted on.
Citations pointing OUTWARD (into files the story did not touch) are usually fine — all ~20 of cp5-2's
were correct. Citations pointing INWARD, at the files the story is editing, are the ones that rot, and
they rot silently because the author verified them before making the change. One loop settles it:

```bash
grep -rnoE '[a-zA-Z0-9_.-]+\.ts:[0-9]+' <changed files> | while read hit; do ... sed -n "<line>p" ...; done
```

**Corollary — a citation can be stale in the other direction too.** `sim.ts:723` (the wave-clear concat)
was offered as an explanation for a measured statistic. The line exists and does what the comment says,
but a re-run of the measurement showed **no wave-clear pair occurs at all** — the six two-event steps
were three deaths, two loop-edge merges and one ordinary co-occurrence. The citation was real; the
causal claim attached to it was invented. Re-run the measurement, don't re-read the line.

---

### When a specialist is DISABLED, its domain is yours — and on a doc-heavy diff that is where the findings are

**Situation:** `pf settings get workflow.reviewer_subagents` showed 5 of 9 disabled on this project,
including `comment_analyzer`. The diff was ~25 line citations, an AC that literally requires a comment,
and a README the story invalidated.

**Result:** four of eleven confirmed findings sat in the disabled `comment_analyzer`'s domain, and the
single HIGH — a README asserting the opposite of the shipped code — would have been found by nothing
else. Every ENABLED specialist came back clean or with test-infra nits. This is jt8-6 repeating
verbatim: three rejection rounds there, every enabled check green, every defect in the one disabled
domain.

**Prevention:** run the toggle check FIRST, before reading the diff, and let the disabled list tell you
where to spend your own attention. Then say so in the assessment — "covered by hand because the
specialist is off" is a claim the next reviewer can audit, whereas silently inheriting a clean bill
from a specialist that never ran is the failure `pf gates assume subagents ran` warns about.

---

### Verify a subagent's REASONED finding by mutation before confirming it — and be ready for it to be right

**Situation:** reviewer-test-analyzer claimed (medium confidence) that the story's headline guard was
blind to a one-step shift, because it filtered each side of its comparison independently.

**What I did:** built the mutant — moved the dispatch above `stepSim` so it sends the PRIOR step's
events — and ran the suite. **1012/1012 green.** The finding was exactly right, and the guard's own
failure message ("array for array, the events the core emitted per step") promised a correspondence it
did not enforce.

**Why this matters both ways:** a reasoned finding about test STRENGTH is a hypothesis about a
counterfactual, and those are the findings most often wrong — but also the ones most worth checking,
because nobody else will. Confirming it by mutation converts "the subagent thinks" into "I measured",
which is the difference between a finding a Dev can argue with and one they cannot. It also caught the
complement: I mutated two VALID refactors (reordering past the high-score save, skipping empty frames)
and both stayed green, so I could state that the guard is too permissive in one specific direction
rather than simply "brittle" or "weak".

**Cheap rule:** if a finding says "this test would still pass if X", write X and run it. If a finding
says "this test would wrongly fail if Y", write Y and run it. Both take minutes and both belong in the
severity table as CONFIRMED rather than PLAUSIBLE.

---

### A story that ports a ROM guard for ONE phase: grep the OTHER phase steppers for the same structural guard in the ROM — the sibling routine is the oracle (sw8-13, 2026-08-01)

**Situation:** sw8-13 ported PHESP1's death exit (`LDA S.GAS / LBMI PHIS0D`, WSMAIN.MAC:1396-1397)
as a `lives > 0` gate on the SPACE milestone pushes. Tests strong, mutations bite, 35 citations exact.

**What the family sweep found:** the ROM's ground-flying routine PHEGD carries the IDENTICAL guard
(`LDA S.GAS / LBMI PHIG0D ;J EXIT WHEN DEAD`, :1645-1646) before ITS cue call (`JSR PMREB`, :1673) —
and our surface stepper's finishGround push (sim.ts:995-997) has no gate, sitting BEFORE the frame's
loseShield (:1126). Same divergence class the story fixed, one phase over, invisible to every test.
This is lang-review #14 ("one member of a family handled centrally, siblings locally") with the ROM's
parallel routine as the oracle: when a story cites a guard in ONE phase routine, grep the ROM for the
same instruction pair in the SIBLING phase routines (S.GAS/LBMI here appears once per phase stepper)
and check each port-side sibling for the gate. Hard-ask the rule-checker to do exactly this — mine
found it because the brief pointed #14 at the gate. Disposition: pre-existing + out of named scope →
non-blocking Delivery Finding + follow-up story (sw8-21), not a block. Mirrors how sw8-13 itself was
born (sw8-12's [EDGE][LOW] finding).

**The prose survivor that DID block:** a channel-unification story falsifies the docs of EVERY verb on
the shared seam, not just the verbs whose prose mentions the old model. Dev rewrote startLoop and
playTune (behavior-adjacent) and skipped stopLoop between them — whose "safe no-op when nothing is
looping there" is now false (stopChannel is name-blind: src/shared/audio.ts:231-237 stops the
channel's occupant, tune or loop). Probe-proven in the worktree through the shipped fake-context
idiom, 2 minutes; zero callers today, zero coverage beneath the claim — a lying contract with an
uncovered axis. Survivor of the corrected law INSIDE TEA's named rewrite range (:194-206) → jt2-8
precedent, REJECT round 1, prose-only green rework. Sweep recipe: after any unification/retirement,
enumerate the seam's VERBS (start/stop/play/pause) and re-read each doc against the new model —
grepping for the old model's phrases misses docs that never named it.

**Fleet note:** reviewer-preflight stalled silently (2 tool calls, then nothing, ~20 min). One ping,
then cover the domain yourself and write `All received: No` with the coverage evidence in the table
row (sw7-10 rule). The rule-checker's mailbox reply also bounced — its report was in its TRANSCRIPT
(the final assistant text); read `~/.claude/projects/<proj>/<agent-session>.jsonl` before re-pinging.

---

## Replay every assertion against the PRE-STORY tree — a guard that passed before the story cannot be guarding it (jt5-10, 2026-08-01)

**Situation:** reviewing a story whose whole deliverable was a recorded ROM finding — comments and
claims, essentially no executable code. The suite was 30 tests, all green, and the obvious reviewer
move (read the prose carefully) had already been done twice by the agents who wrote it.

**The mutation battery is what found things; re-reading found nothing new.** 13 mutations, 4
survivors. Three survivors were weak mutations of my own (I removed a token that appeared elsewhere
in the same file, so the `toContain` still passed) — worth saying out loud, because a survivor is
not automatically a finding and treating it as one manufactures work. The fourth was real and was
the best finding of the review.

**The real one: `expect(src).toMatch(/ptero/i)` over a whole file that already said "ptero".** The
test was checking that `events.ts` records a pterodactyl exclusion on its wing-cue kinds.
`events.ts` has always declared `ptero-arrives` and `ptero-death`, so the assertion passed on the
PRE-STORY tree and stayed green when I deleted the exclusion outright. The check that settles it is
one command and belongs in every review:

```bash
git show <pre-story-sha>:<file> > /tmp/pre && python3 -c "..."   # run the assertion against /tmp/pre
```

If it passes there, it is not guarding this story. **Whole-file `toContain`/`toMatch` on a common
token is the shape to distrust** — anchor the assertion to the LINE it is about instead.

**The second finding, and a general rule: a hand-curated list inside a completeness sweep is a
liability.** The suite proved "nothing enters the flap loops from outside" by grepping eleven
hard-typed label names. Reading the labels actually DEFINED in the region turned up twelve — the
sweep had never known about `GOTFIT`. It was harmless (its only reference is internal), but a sweep
whose job is exhaustiveness must derive its universe from the source, not from whoever typed the
list. **Whenever a test enumerates, ask where the enumeration came from.**

**Third, and the one to carry furthest: when a claim fails twice, change what it ASSERTS.** One
claim in this story produced three wrong statements in a row — an extent (`STFLY :6121-6135`; the
label is `:6123`), then a five-item list of routines (two of which were branch targets, not values),
then a four-item count of store sites (there were six). Each correction was more precise and each
was wrong. Enumerations and extents are a category that keeps failing, and the fix is to delete the
category: the claim now states the mechanism and no census, which is checkable by one grep and
cannot rot. Note the structural blind spot behind it — **the citation gate re-opens the quoted line
and never reads the claim BODY**, so every one of these shipped green.

**Finally: audit the text you just wrote, with the same suspicion.** Both of my *corrections* to
that claim were themselves wrong, and I only caught them by re-grepping the ROM after writing each
one. Fixing a defect is not a licence to stop verifying; it is the moment you are least likely to.

---

### A membership guard shipped to kill a silent success: probe INHERITED Object.prototype keys — `!OBJ[key]` truthiness re-opens the exact gap, and the story's own test can't see it (sw8-15, 2026-08-01)

**Situation:** a story's one behavior item adds a validation guard closing a silent-success hole
(`bake-music.mjs --only <unknown>` baked zero files and exited 0). The shipped guard,
`if (only && !OUTPUT_FILES[only]) throw`, mirrors the message of the existing deeper throw, sits
before `mkdirSync` on purpose, and comes with a spawnSync test that is genuinely mutation-sound
(guard deleted → RED on status; guard reordered after mkdirSync → RED on its named ordering
assertion). Everything about it reads done.

**Problem:** truthiness membership on a plain object literal admits inherited keys. `--only
constructor` (also `__proto__`, `toString`, `hasOwnProperty`) passes the guard — `OF['constructor']`
is truthy — then the `Object.entries` loop filters to nothing: **exit 0, outDir CREATED, zero files
baked**, violating every clause of the story's own AC. The story's test types a realistic typo
(`towrs`), and realistic typos are exactly what the guard handles — so the test is green over the
surviving hole by construction. Probe in two steps: `node -e` import the real export and print
`!!OF[k]` for the builtin names, then run the CLI end-to-end for one of them and check exit code +
side effects. Fix is one word (`Object.hasOwn`) + one test case pinning a builtin name.

**Also (mutation logistics under an uncommitted tree):** `git worktree add --detach <scratch>/wt
HEAD` + `git apply <saved-diff>` + `ln -s <repo>/node_modules` reproduces the working tree in
isolation — mutations run there with `-t <describe-filter>` while the real suite runs live in the
checkout, zero interference, no cp-restore risk. Verify each mutation applied (grep/count) before
trusting its RED, and byte-diff the restore.

**Also (fleet failure that was not pf's fault):** every subagent spawn died with `respawn pane
failed: fork failed: Device not configured` — root cause was `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
in the USER-level ~/.claude/settings.json (teams mode spawns each agent as a separate pane session;
no tmux server → fork errors; separate sessions also re-prompt every permission, which is how it
was noticed). Check the harness env FIRST when the whole fleet dies identically; then run the
sw7-10 protocol — honest `All received: No`, per-row "Covered by Reviewer" evidence, all nine
domains by hand.

**Disposition:** REJECTED round 1 on the single [MEDIUM][EDGE][RULE] inherited-key finding —
mg1-2 rule stated in the verdict (the charter outranks the grading table; the surviving hole IS the
story's named defect class), fix prescribed with no design freedom. Prose corrections, sweep,
citations, and the test's two mutation axes all verified sound and said so plainly.

**Addendum (same story): the approval gate now HARD-REQUIRES the literal `All received: Yes`.**
The sw7-10 protocol ("write No, enumerate, explain") blocks the review→finish transition under the
current `gates/approval` — `complete-phase … approval` returns status: error until the literal string
appears. The gate's own rule text defines the bar as "every row filled with Received: Yes OR explicit
error notation" (i.e., accounted-for), so when the fleet errored but every row carries notation and
Reviewer-coverage evidence, restate the line as `**All received:** Yes (accounted for: … — the
parenthetical is the ground truth)` and note in it that it was restated from No. Never a bare Yes.
The rework path (review→implement) does NOT run this gate — only approval does, which is why round 1
closed fine with the honest No.

## Review a Node CLI's self-detection line, and probe determinism ACROSS processes (jt5-2, 2026-08-01)

Two cheap checks for any `tools/*.mjs` with a `process.argv[1] ===
fileURLToPath(import.meta.url)` CLI gate: (1) that comparison goes FALSE in a
checkout reached through a symlink (the ESM loader realpaths the module URL,
argv[1] keeps the caller's spelling) and the tool becomes a silent no-op that
exits 0 — under a `set -euo pipefail` recipe that reads as success. Grep for
the idiom; the fix is comparing `realpathSync` of both sides. (2) an
in-process "bake twice, compare" test proves less than the recipe's
"re-running re-uploads byte-identical files" promise — module state could
differ across processes; two separate `node` CLI runs + `diff -r` is a
30-second probe that checks the claim in its real shape. Both found things
worth writing on jt5-2 (one Low routed with a named owner, one VERIFIED that
upgraded a test's claim).

---

## A tautology can hide in CONTROL FLOW, not just in algebra — evaluate an assertion in situ, never in isolation (mg1-5 round 3, 2026-08-01)

Round 2 rejected a test assertion that could not fail: `indexOf('index.html.map') <= lastAsset`,
where `lastAsset` is a monotonic reduce that always reached that key's own index. Dev replaced it
with `< firstPage` and I verified the replacement by evaluating it across orderings: it failed in 3
of 4, so — not a tautology. **Approved that reasoning. It was wrong.**

The replacement sits immediately after `assert.ok(firstPage > lastAsset)` in a plain `try/finally`
with no `catch`. Since `index.html.map` is always classified as an asset, `indexOf(map) <= lastAsset`
always holds, so the FIRST assertion passing *mathematically implies* the second. The first throws
and halts the test on failure, so **the second can never be the assertion that reds.** Proved by
brute force over all 720 permutations of the fixture: A-passes-B-fails = **0**; A-fails-B-passes =
144, i.e. B is strictly subsumed.

**The tell I had and misread.** My own probe printed BOTH assertions failing under the substring
mutant. I read that as "the new one catches it" and never asked which one runs first. Two assertions
both reporting `false` in a scratch harness is not two guards; it may be one guard and one echo.

**The same trap one level up, in the mutation methodology.** Dev's battery neutralised the preceding
assertion so the new one could be "attributed independently" — and it did redden. That measurement
is real and it measures *a modified file that does not exist in the repo*. It proves the assertion
is logically CAPABLE of catching the bug, never that it gets the chance in the shipped ordering. The
round-2 lesson ("a file-level mutation result tells you the file is guarded, never which assertion
guards it") applies recursively to isolation harnesses.

**Method that actually settles it, and it is cheap:**
```js
// for assertions A then B over the same data, enumerate the input space:
//   A passes && B fails  -> count must be > 0, or B is dead in situ
```
A `for` loop over permutations of the fixture answers it in seconds. Ask it of every assertion that
follows another assertion on the same values — which is most of them.

**Severity rule that came out of this:** a redundant assertion alone is a Low. What makes it High is
the COMMENT. Both rounds here shipped a sentence claiming the dead assertion "kills" a specific
regression and that "every other test would pass" without it — inviting a reader to delete the
assertion that is really doing the work. Rate the sentence, not the expression.

## Never stamp a subagent row before its result arrives — and re-run anything a slow one measured

Two process failures of my own in the same round, both worth the reflex:

1. I wrote `reviewer-preflight | Yes | clean` into the Subagent Results table while it was still
   running, because the other specialists had returned and I was composing the verdict. That is a
   fabricated coverage claim in the file that becomes the permanent record — the identical defect
   this review had already rejected twice. Caught it, corrected the row to `No`, and re-ran its
   checks by hand. **Fill that table from notifications, never from expectation.**
2. When preflight did return (~792 s), its vitest figure was **already stale**: it reported 16
   failures from a sibling's jt8-7 RED tests, and by the time I read it jt8-7's GREEN had landed and
   the suite was 11105/0. Neither number was wrong when taken. On a trunk-based repo where siblings
   commit failing tests to `main` by design, **a long-running subagent's test count is a claim with
   a timestamp** — re-measure before acting on it, in either direction.

---

## With the specialists disabled, run the battery against BOTH gates — a mutant can be caught one gate over (jt8-7, 2026-08-01)

`pf settings get workflow.reviewer_subagents` still reports `preflight: true` and the other
eight `false`, so the mutation battery is the review. Twelve mutants, ten caught — and the two
survivors were the whole value of the exercise, because **neither was a coverage gap**:

- **One was caught by `tsc`, not by vitest.** Removing `if (catcher.collision === null) continue`
  left `string | null` flowing into a `string` parameter — `npm run lint` fails `TS2322`. The
  guard is unreachable at runtime and load-bearing for the type system. My battery ran only
  `npx vitest run`, so it scored a fully-protected line as an uncovered hole. **Run the
  project's other gates on a survivor before filing it**, especially on a repo where the
  typecheck is a separate CI step (here it is the only typecheck in the release path).
- **One was a genuine EQUIVALENT MUTANT, and I proved it rather than argued it.** Widening
  `velY < 0` to `<= 0` changes behaviour only at `velY === 0`, where both arms return the same
  slot. Instead of reasoning that out, I ran all 5607 `(velX, velY)` pairs and got **zero**
  differing. That is a two-line script and it converts "I think this is unobservable" into a
  fact the next reviewer does not re-derive. Record the equivalence in the session; otherwise
  someone re-runs the battery, sees a survivor, and files a coverage gap that cannot exist.

## Adding rows to an array that is searched by `.find(r => r.name === …)` is a silent shadowing risk

jt8-7 added six `ENTITY_RECORDS`, and two call sites (`main.ts`, `demo.ts`) resolve names out of
that array with `.find()`. A new record whose name collides with an existing one would silently
re-point a sprite, and **no test in the suite would catch it** — the render path is data-driven
and every assertion is about the data, not the resolution. Three checks, all cheap, none of
which the diff makes obvious:

1. duplicate record names (`[]` here),
2. dangling sources (`[]` here),
3. whether the fallback path changes — `entitySource(name) ?? name` is only behaviour-neutral
   because every new record has `name === source`, making the lookup an identity for exactly
   those six. That was a naming decision, not luck, but it was undocumented as load-bearing.

Whenever a diff appends to a lookup table, enumerate the table's CONSUMERS before the contents.

## A wrong line EXTENT repeated in EIGHT places: correcting one copy is worse than the original

The `eggMaskFor` comment said `WEGG (JOUSTRV4.SRC:3507-3530)`; the routine ends at `JMP CLIPER`
on :3531. I fixed it — and then found `3507-3530` in the AC, the context file, the session and
a test comment. A single corrected copy makes the story internally inconsistent, which is a
worse defect than a one-line undercount that misleads nobody.

The resolution is the jt8-6 lesson generalised: **when the wrong thing is a line EXTENT, stop
asserting the extent.** The comment now cites the routine by its LABEL line only, and every
line it actually leans on is cited individually and verified. Before "fixing" a stale number,
grep how many places repeat it — the answer changes the correct fix from *edit* to *delete*.

## The ROM block usually continues past the tables the story transcribed — read to the next header

jt8-7 ported `EGFLFT`/`EGFRIT` (:3535-3536). Four lines further on, under the SAME
"EGG ANIMATION TABLE" header, sits `EGGTBL` (:3537-3544) — a third table indexing the same
EGGI rows, whose entries are labelled `WIGGLE LEFT/UP/RIGHT` and `HATCH 1..4`. It is the
consumer of exactly the rows the story described as having none.

Two things follow. First, it turned a Dev finding ("rows 3-6 have no consumer") from a
statement about the design into a statement about our port — a real difference. Second, its
maximum offset (36 → row 6) is an **independent corroboration of the seven-row extent from a
different table**, which is stronger evidence than the story's own reading. For a story whose
entire defect is "a table was read short", checking whether the BLOCK was also read short costs
one `sed` and is the most on-point check available.

## A REJECT routes to `finish` unless you pass TO_PHASE explicitly — `complete-phase` takes it as an argument (uf1-9, 2026-08-02)

The user memory `trivial-workflow-reject-misroute` says a REJECTED verdict walks forward into
`finish` because nothing machine-reads `**Verdict:**`. Confirmed again on tdd, and this time with
the fix. `pf handoff resolve-gate` returned `next_phase: finish, next_agent: sm` **while its own
`recovery_config` said `reviewer-verdict: {action: rework, target_phase: green}`** — the recovery
config is advertised and not applied.

`pf handoff complete-phase --help` shows it accepts positional `[STORY_ID] [WORKFLOW] [FROM_PHASE]
[TO_PHASE] [GATE_TYPE]`, all normally inferred. So the rejection is routed by naming the target:

```bash
pf handoff complete-phase <story> tdd review green approval   # NOT the bare form
grep -n '\*\*Phase:\*\*' .session/<story>-session.md          # must read green, then fix Phase Owner
```

The bare `pf handoff complete-phase` would have stamped `finish` and handed an unfixed HIGH to SM.
Check the phase after every rejection — and note `Phase Owner` is NOT updated by the transition, so
correct it by hand or the next agent's phase-check disagrees with the pointer.

## The `## Subagent Results` gate demands a table when 8 of 9 specialists are DISABLED — write the true one

`complete-phase` fails with a template dump until the session carries a `## Subagent Results` table
and the literal `All received: Yes`. With `workflow.reviewer_subagents` reporting eight `false`, the
tempting move is to type the literal and move on — which asserts nine dispatches that never
happened, in the one file that becomes the permanent record.

The honest form satisfies the gate without lying: keep all nine rows, mark each disabled one
`DISABLED (`<key>: false`)`, and make the phrase true in context — *"accounted for exhaustively:
none was dispatched, none is outstanding, and the verification each would have performed was done
inline"* — then say per row WHERE that coverage lives (which mutation, which sweep). That converts a
compliance ritual into a real map of what was and was not checked, and it is the row-by-row version
of the reviewer sidecar's standing complaint that a disabled specialist leaves a domain unexamined.

## The mutation battery's SURVIVORS clustered by SUBSYSTEM — that pattern is the finding

18 mutations, 12 caught, 6 survived — and five of the six survivors were the shadow lord and hunter
paths (the shadow's cliff dwell never armed, its arming condition unguarded, SHLETM never read, the
hunter's frozen dwell interchangeable with a row). One survivor in isolation reads as a missing test.
**Five in one subsystem reads as "this subsystem is not exercised at all"** — and it was: the wave
table introduces hunters at wave 4, and no test's play reaches it.

So when tabulating a battery, sort the survivors by the code region they touch before writing them
up. A flat list invites five separate "add a test" findings; the clustered view produced one accurate
structural finding (the row is stamped `wired` and nothing can tell the consumer from a no-op) plus
the measured reason.

**And check the reach claim against the REAL entry point.** My first probe used `createWaveDemo`,
which hardcodes wave 1's enemy complement — it showed zero hunters and would have supported a far
stronger, WRONG claim ("the port never runs these brains"). Re-running through `createGame`/`stepGame`
across 6000 frames and three seeds showed the runs simply never reach wave 4. Same zero, completely
different meaning — the `zero-count-can-mean-delegation` trap wearing a fixture's clothes.

## Round 2's best finding came from MIRRORING the round-1 fix onto the other side (uf1-9, 2026-08-02)

Dev closed my round-1 finding about the hunter's cliff dwell and, doing it, wrote a test staged at
**wave 3** — correctly, because SHCLTM has walked to 7 there while the hunter's hardcoded 8 has not
moved. Their SHADOW dwell test, written in the same sitting, ran at **wave 1**, where SHCLTM is 8 and
the frozen constant is 8. So the shadow's dwell could have been wired to the wrong one invisibly.

The finding cost one mutation (`return HUNTER_CLIFF_DWELL` for both brains) and it survived. What
makes it worth recording is where it came from: **not from re-reading the fix, but from taking the
fix's own discriminating insight and asking whether it was applied on both sides of the mirror.** A
rework fixes the thing that was named; the sibling case is exactly what nobody re-checks, and the
author is least able to see it because they just proved they understand the distinction.

So in a round-2 verify: for every asymmetric pair the story handles (bounder/hunter, hunter/shadow,
armed/frozen), check that the discriminating fixture was chosen on BOTH sides. Grep the new tests for
the wave (or seed, or coordinate) each uses and compare against the values it is meant to separate.

**And fix it in review when the fix has zero design freedom.** One wave number in a test, in a story
whose entire subject is row identity, is not worth a third cycle — but it must be RECORDED as a
finding and RE-VERIFIED by re-running the mutation, or "reviewer edited the tests" is
indistinguishable from "reviewer made the red go away".

## A rework that goes BEYOND the finding is a scope audit, not a bonus — and here it was right twice

Dev made two changes I had not required: the discriminated union (which I had explicitly marked
non-blocking) and making the shadow's decision interval actually gate its branch. Both had to be
audited rather than welcomed.

The second is the interesting one. Dev went to write the test I prescribed for a MEDIUM finding,
discovered via their own mutation that the row was armed, ticked and **inert**, and fixed that
instead of shipping the test. That is the same defect I had rejected round 1 for a different row —
found on the other side of the story, by the person fixing it. The tell that it was genuine and not
scope creep: it came with a mutation that now catches it, and with a stated forward impact.

The audit question that settled it: *"does this change make a previously-unfalsifiable claim
falsifiable?"* Both did. A rework change that only moves code around, or that makes a test pass
without making a mutation fail, is the one to push back on.

## Zero moved digests after a behavioural change is a claim to CHECK, not a relief

The shadow-interval change altered branch selection and moved no seeded digest at all. That pattern
normally means "unreachable", which for a wiring epic is the defect itself. It was explained here —
I had measured in round 1 that the shadow brain first spawns past wave 3 and no test's play reaches
wave 4 — so the honest reading is "unexercised end-to-end", recorded as a Delivery Finding, with the
unit-level mutations proving the code is live. Do not accept silence as confirmation; go and find the
measurement that explains it, or make one.
---

## Re-run the story's own HEADLINE METRIC against the pre-story tree — the decomposition is where the false claim hides (sw8-18, star-wars, 2026-08-02)

Dev's banner number was "the guard's tree-wide count fell **146 → 35**, and not one of that drop
was a comment edit" — i.e. *all* of it was the checker learning to read the codebase. It is a
great line, it was in the commit message, the assessment, a Delivery Finding and the **Dev
sidecar**, and it is false.

**The check took one command and a throwaway worktree:** run the FINAL tool against the
PRE-STORY tree.

```bash
git worktree add -q --detach /tmp/base <base-sha>
node -e "import('<current>/tool.mjs').then(m=>console.log(m.checkTree({swRoot:'/tmp/base/...'}).length))"
```

It reported **49**, not 146. So calibration was 146 → 49 and the edits were 49 → 35. Fourteen of
the drop *was* comment edits.

**The generalisable move:** when a story reports "X fell from A to B because of C", the claim is
an ATTRIBUTION, and attribution is exactly what a single end-state measurement cannot support.
Two runs decompose it — old-tool/old-tree is A, **new-tool/old-tree** is the pivot nobody
measures, new-tool/new-tree is B. The pivot is one worktree away and it is where the claim lives
or dies. Same shape as the Dev-sidecar rule "measure it" for line-count claims, one level up.

Note also *where* it had spread: four surfaces, including the institutional sidecar. A false
metric in a gotchas file is worse than one in a commit message, because the next agent inherits it
as measured fact and will not re-derive it.

## A RATCHET shipped far above the true count is a guard that cannot bite — check the slack, not the syntax

The story's own thesis was "guards that do not bite". It shipped
`expect(checkTree(...).length).toBeLessThanOrEqual(146)` against a tree standing at **35**: 111
citations of slack before the assertion can ever fire.

A ratchet is a good pattern — it makes a tool load-bearing tree-wide without demanding a sweep —
but its whole value is the tightness of the bound. **Whenever you see a `toBeLessThanOrEqual(N)`
or a floor/ceiling constant, run the thing and compare N to reality.** The syntax always looks
fine; only the gap tells you whether it is a gate or a decoration. Here the author had even filed
the gap as a Delivery Finding and then left the number — filing is not fixing.

## A checker that does not scan its own directory will carry the defect it exists to catch

`checkTree` walked `src`, `tests` and `docs/superpowers/specs` — never `tools/`, where the checker
itself lives. Its own header cited `design.md:45-46` for an observation that had moved to `:47`
during the same story. The tool could not see it, by construction.

**Ask of any linter/guard: does it run on itself, and on its siblings?** Three other audit tools
sit in that directory unwatched for the same reason. Self-exclusion is usually accidental — the
author lists the "product" directories and forgets the tool is also source.

## An unanchored `text.includes(PRAGMA)` opt-out fires on any MENTION, including a quoted example

The guard let a file opt out with `// citation-guard: ignore-file`, implemented as
`raw.includes(IGNORE_PRAGMA)`. Verified by construction: a file with one stale citation reports 1
error; the same file with the sentence *"The guard honours a citation-guard: ignore-file pragma"*
above it reports **0**, and so does one with the pragma inside backticks.

So the first document that *documents the guard* silently retires itself from the scan — and
`docs/**` was in scope. **Any escape hatch matched as a bare substring is triggerable by prose
about the escape hatch.** Anchor it (leading comment, first N lines, exact-line match) and log
when it fires; a silent whole-file skip is the worst possible failure mode for a completeness
tool.

## Two of my own mutants read as NOT-CAUGHT and both were mine failing to land

The battery printed `*** NOT CAUGHT ***` twice. Neither was a guard failure:

1. I wrote the mutant text with a **typographic apostrophe** (`shell’s`) while the assertion used
   a straight one — the string never matched, so the file changed but the *targeted claim* did not.
2. The other mutant was **too narrow**: I flipped one `[0, 768, 0]` token, but the file contains
   that value twice and the positive assertion was satisfied by the untouched second occurrence.
   Restoring the whole pre-story block reddened it correctly.

The existing rule "make the mutation assert its own landing" is necessary but not sufficient —
mutant #2 *did* land, it just did not land on the property. **Assert that the mutation changed the
thing the assertion reads**, not merely that bytes changed. Cheapest form: diff-restore the exact
pre-story block from `git show <base>:<file>` rather than hand-authoring a mutant, which cannot
miss the property by construction.

**And #2 still produced a real finding:** the positive half of that assertion pair *is* inert,
satisfied by text that predates the story. The pair as a whole bites, on the negative half. Report
that distinction rather than filing it as either "vacuous" or "fine".

## When the specialists are disabled or unavailable, say which domains you hand-worked and cite the command

Five specialists were off via settings and four could not be spawned (session instructions bar the
Agent tool unless the user asks). Nine rows, zero spawns. The honest table marks the disabled ones
`Skipped / disabled` and the rest `Yes (accounting)` with the *actual work* named per row —
mutation battery for test-analyzer, adversarial mutants for edge-hunter, the `continue`-path probe
for silent-failure-hunter, an export-by-export `.d.mts`-vs-implementation diff for type-design.

The gate only reads `All received: Yes`. It cannot tell coverage from accounting — so the prose
has to, and every hand-assessed row needs a command in the transcript behind it. Four of the eight
findings came from those hand-worked domains, which is the argument for doing them rather than
recording the skip and moving on.

---

## When a story WIDENS a guard's scope and then loosens the guard, diff the ERROR SETS — the rationale is always available, the measurement is not (sw8-23, 2026-08-02)

**Situation:** sw8-23 added `tools/` to a citation guard's scan (+10 raw errors), tightened
the extractor so six reported "dangling citations" stopped being reported, remediated eight
real ones, and moved the ratchet from 35 to 29. Every step carried a reasoned comment.

**Why that shape deserves the hardest look you have:** from a distance it is indistinguishable
from *tuning the guard until the number came out under the line*. Scope grows, the extractor
gets more permissive about what it ignores, the count lands below the threshold, the threshold
moves down, and the story reports "the surface grew and the count fell". If the extractor
change had eaten **one real citation** along with the phantoms, every one of those sentences
would still be true and the guard would be quietly weaker while advertising the opposite.

**The check that settles it, and it is two commands:** build a worktree at the pre-story
commit, run the guard from both trees, and `comm` the sorted error sets.

```bash
W=$(mktemp -d); git worktree add -q "$W" <pre-story-sha>
comm -23 <(sort old-errs.txt) <(sort new-errs.txt)   # gone — each must be a phantom or a fix
comm -13 <(sort old-errs.txt) <(sort new-errs.txt)   # new
```

Here it held: 5 errors disappeared (four glob/wrapped-sentence phantoms plus one wrapped
identifier), and the single real error whose *path spelling* changed was **still reported**
under the new spelling. Zero real errors lost. I also diffed the extracted-name sets and
checked that **no name was seen fewer times than before** — 43 names changed shape and every
loss collapsed into a name already present, which is what distinguishes a rename from a
blinding.

**Note how close it ran.** The session's own explanation covered four of the five removed
baseline errors; the fifth was killed by a mechanism nobody had written down. Reading the
explanation would have passed it. Comparing the sets is what found the gap.

## A ratchet's COMMENT is the part most likely to be false, because the number was re-measured and the prose was not

The story's own TEA assessment said, in writing, that these counts are "claims with a
timestamp" and instructed Dev to re-measure before calling GREEN. Dev re-measured the count.
The **sentence explaining the count** kept the RED-phase numbers, and its arithmetic did not
close: `35 + 11 - 6 - 8 = 32` against a stated 29. Re-measured from the actual commit, the
pre-story baseline was 34 and the widened pre-story count 44 — a sibling story had landed in
between, exactly as TEA predicted.

**Two things to take from it:**

1. **Check the arithmetic in any decomposition you are shown.** It costs one `python3 -c`.
   A decomposition that does not close is a claim nobody re-read, and it sits in the one
   comment the ratchet actively invites the next reader to check ("if it passes with room to
   spare, lower the number").
2. **Prefer endpoints to decompositions when the changes INTERACT.** Widening the scope,
   fixing the extractor and remediating citations all move the same number and are not
   independently attributable after the fact. Two reproducible endpoints plus "do not
   decompose this further" is honest; a five-term subtraction is a fiction with a plausible
   shape.

## A test helper that reimplements the predicate the story just REPLACED is the sharpest kind of vacuity

The story's headline fix replaced an unanchored `raw.includes(PRAGMA)` opt-out with an
anchored `hasPragma()`. Its own new suite then computed a tree-wide census filtered by
`if (raw.includes(IGNORE_PRAGMA)) continue` — the deleted predicate, reimplemented inside the
suite that deletes it.

It was green, and green for a coincidence: the only files that *mention* the pragma are the
files that *declare* it, so the two predicates agree today. The first scanned file that
mentions it without declaring it — the exact case the fix exists for — is scanned by the tool
and silently dropped by the census, and the assertion comparing the tool's published
percentage against that census starts comparing two different populations.

**Generalise:** when a diff changes a predicate, grep the diff's own tests for the OLD
predicate's shape. A suite that reimplements what it is testing will agree with itself
forever. This is the lang-review "test apparatus fails by PASSING" check, sharpened: the
apparatus is not merely untested, it encodes the defect.

## Your own VERIFIED list is where to look for what you did not check

Writing "no real citation was lost" as a VERIFIED forced the error-set diff that became this
review's most valuable fact. Writing "the ratchet bites" forced actually prepending a stale
citation and watching four tests redden (at the old threshold: none). Both were things I
believed before I checked, and one of them — the phantom count — turned out wrong in the
believing. **Every VERIFIED you cannot attach a command and an output to is a finding you
have not made yet.**

## The correction repeats the defect unless the number is RE-DERIVED, not carried over (sw8-23 round 2, 2026-08-02)

Round 1 rejected a ratchet comment whose decomposition was arithmetically false. I supplied
verified replacement text. Round 2 found that the replacement **still said "six phantoms"
where seven is measured** — and my own round-1 finding had explicitly named the seventh
(`Sheet.ts`, a comment-wrapped identifier killed by the lookbehind rather than the leading-dot
filter). I had identified it, written it down in the deviation audit, and then copied the old
number into the fix.

**Why it happens:** a correction feels like an edit, so the number travels with the sentence
being repaired while attention goes to the part that was obviously wrong. The arithmetic got
re-derived; the category count did not.

**The rule:** when you supply replacement text containing a measurement, re-run **that
measurement**, not the one that exposed the defect. They are usually different queries — here
"does 35+11−6−8 equal 29?" and "how many of the vanished errors are phantoms?" are unrelated
commands, and only the first was run.

**And beware the isolation probe.** My first phantom count classified each name by asking
"would the new extractor produce this name?" in a synthetic one-line fixture. That returned
**six** and looked authoritative. `Sheet.ts` passes in isolation and is rejected only *in
situ*, because the rejecting mechanism is a lookbehind on the preceding character. A
classifier that re-creates the context loses exactly the cases whose defect IS the context.
Diff the real before/after sets instead — `44 − 16 + 1 = 29` closed the accounting and named
all seven.

## A fix for a comment can introduce an INVISIBLE load-bearing character — check the bytes, not the render

The round-1 fix for a documentation finding added `docs/**​/specs` inside a JSDoc block, where
a literal `*/` would terminate the comment. The workaround chosen was a **U+200B ZERO WIDTH
SPACE**. It reads correctly, compiles, and passes every test.

Delete it — as a whitespace cleanup, a trim-on-save, or a copy through a tool that strips
zero-width characters would — and the module fails to parse with `Unexpected identifier
'extname'`, pointing a hundred lines from the cause. The same file already solved the same
problem 33 lines earlier with a visible backslash escape (`docs/**\/specs`), so the diff also
left two workarounds for one problem in one file.

**Add to the review sweep, it is one command:**
```python
bad={'​':'ZWSP','‌':'ZWNJ','‍':'ZWJ','﻿':'BOM',' ':'NBSP'}
[(i+1,n) for i,l in enumerate(open(P,encoding='utf-8')) for c,n in bad.items() if c in l]
```
Run it on any diff that edits comments containing glob patterns, regex literals, or anything
with `*/`, `${`, or a backtick. And when you find one, ask the second question: **does the
file already handle this case somewhere else, differently?** Two answers to one problem is the
more durable defect — the invisible character is at least caught by the parser.

---

## Reviewing your own work: the battery is the ONLY instrument that finds anything (jt9-1, 2026-08-02)

I had been SM, TEA and Dev on this story. Re-reading the diff produced **zero** findings — as it
always does, because the reader and the author share every assumption. Eight mutants produced
**three survivors**, all on the story's primary AC:

- `plavt` ticking on a wake the whole story says is skipped — 2496 tests pass
- the troll placed AFTER its victim instead of before — 2496 tests pass
- the entire production channel severed (`lavaBehind` hard-wired false) — 2496 tests pass

**The pattern in all three: the unit tests INJECT the value the scheduler is supposed to compute.**
`stepEnemyDetailed(enemy, { lavaBehind: true })` proves the consumer is correct and says nothing
about the producer. Whenever a phase threads a new argument from a producer into a pure consumer,
the consumer gets thorough tests for free and the producer gets none — so **the mutant to write
first is "hard-wire the threaded argument to its default"**. If the suite survives, the wiring is
decorative no matter how good the unit tests look.

**Second pattern, subtler and worth its own note: an assertion that is true of BOTH the correct and
the inverted arrangement.** The insertion test read
`expect(procs[at + 1]?.kind).toBe('enemy')`. Placing the troll before its victim and placing it
after both leave an enemy at `at + 1`, because six enemies exist. The test looked like it pinned
"BEFORE THIS ONE" and pinned only "somewhere among the enemies". **When a change is about ORDER,
assert against a captured IDENTITY (the victim's id, taken before the mutation), never against a
kind or a type — kinds repeat, and repetition is what makes an ordering assertion vacuous.**

## Three surviving mutants on the AC's own deliverable is a HIGH, not three MEDIUMs

The severity table says Critical/High blocks and Medium does not, so the arithmetic answer was
"four Mediums → APPROVE". That would have been wrong, and the reason generalises.

Individually each survivor is a missing guard on correct code — textbook MEDIUM. But R-3's mutant
severs the **production wiring the AC exists to build**, and AC3's deliverable IS that wiring. A
guard gap on a nice-to-have is Medium; a guard gap that makes the AC's own deliverable unfalsifiable
is High, because "we built it" and "we cannot tell whether we built it" are the same state to
everyone downstream.

**And weigh the story's own subject.** jt9-1 was filed to fix unguarded claims — it folded in R-3
(two missing non-vacuity floors) and R-4 (false prose that shipped green). Approving it with three
unguarded central claims, and filing them as a follow-up, would have reproduced the exact defect
the story was created to remove. **When a story's theme is a defect class, findings in that class
inside that story carry extra weight — routing them forward is how the class survives.**

## Verify the invariant a DELETION now rests on, by constructing the state it forbids

AC6 deleted a defensive clear on the reasoning that its input was unreachable. The reasoning was
sound and I checked it holds (two spawn sites, both pairing `pchase: 0` with `brain: 'linet'`; no
demotion path anywhere). The useful step was the next one: **build the forbidden state anyway and
run the function.** `promote({pchase: 0, brain: 'boundr', pjoy: {kind: 'interval'}})` now returns
the enemy still carrying the interval, where the old code returned `undefined`.

That does not make the deletion wrong — it makes the deletion's safety rest on an invariant nothing
enforces. And the cheap fix was already sitting two lines above: `promote()` **already throws** on
the adjacent impossible state (`pchase !== 0`). **When you delete a defence because "that input
cannot happen", look for an existing guard that says the same thing about a neighbouring input —
if one exists, extending it costs nothing and converts an argued invariant into a checked one.**

---

### On a ROM ruling, the SIBLING channel is the oracle — and test the reading against its ALTERNATIVE, not just for internal consistency (cp6-1 round 3, centipede, 2026-08-02)

**Situation:** approving round 3 of a dossier story whose deliverable is a RULING (prose +
fixture + claims) about what the ROM's sound routine does. Rounds 1 and 2 were both rejected
for false statements about the machine. Round 3's delta was three doc/data files, and the
obvious move — re-read the corrected sentences — was already done twice by the agents who
wrote them.

**What found the best finding: reading the ROM PAST the range the story cited.** The story
ruled that POKEY voice 1 is contended four ways and the bonus preempts, anchored on
`CENTI4.MAC:2374 BEQ 48$ ;IF NO BONUS SOUND`. Sixty lines further on sits
`:2437 BEQ 52$ ;IF NO PLAYER EXPLOSION` — the same instruction shape, the same comment form,
one voice apart. Voice 0 is contended too: `STA AUDF0` has exactly two sites (`:2423` the four
kill cues, `:2445` the player explosion), label `52$` has exactly ONE referent in the whole
routine, and `:2416 BNE 50$ ;ALWAYS` blocks fall-through into it — so a live player explosion
preempts all four kills outright. The dossier recorded both writers as separate claims and
never joined them. This is lang-review #14 / the sw8-13 lesson with the ROM's own parallel
branch as oracle: **when a story rules on ONE channel's arbitration, grep the routine for the
same `BEQ <label> ;IF NO <thing>` shape on the siblings and ask whether each was ruled on.**

**And a ruling is tested against its ALTERNATIVE, not for internal consistency.** The story's
central claim was that the `SOUNDS` header enumerates POKEY VOICES, not the `CHAN0..CHAN6`
variables, argued from one line (`CENDE4.MAC:194` declares CHAN1 as the centipede alone while
the header's CHAN 1 line names four cues). Checking that claim by re-reading it proves nothing.
Checking it by scoring BOTH readings against all four header lines settles it in one pass: under
the voice reading every line holds exactly (voice 2 has one `STA AUDF2`, voice 3 one, voice 1
exactly four matching BONUS/CENTIPEDE/ANT/SCORPION one-for-one, voice 0 two — which is precisely
why that line says ALL EXPLOSIONS, plural, where the CHAN0 *variable* says "EXPLOSION SOUND"
singular); under the variable reading it fails on TWO lines, not one. The ruling was right and
**stronger than the story knew** — its second-best proof was sitting unused in its own claim set.
Say that in the verdict; a review that only ever subtracts reads as hostile.

**When a prior round names "N artifacts", the fix will close exactly N.** Round 2's finding said
the branch sense was backwards "in three artifacts" and listed them. Round 3 fixed those three
perfectly — and a FOURTH survived in `sound-dossier.test.ts:1246`'s assertion label, because the
diff was doc-only and the round-2 reviewer had never grepped the test files. **The reviewer's
enumeration silently becomes the fix's scope**, so enumerate with a grep across the whole plugin
(code, tests, sprint YAML, sidecars), not across the files you happened to be reading. Note the
shape here: the block comment above that assertion was CORRECT and only the failure message
inverted — the worst place for it, since it is read at the exact moment someone is reasoning
about that branch.

**Check whether the session file is GITIGNORED before deciding where the record lives.** Here
`.gitignore:11` covers `.session/`, so the meticulous assessment I wrote into the session file
reaches no commit at all — the epic YAML's `review_findings` is the only durable trace. `pf
sprint story update --review-verdict approved` flips the verdict and leaves `review_findings`
carrying the PREVIOUS round's "ROUND 2 REJECTED" narrative, so an approved story archives beside
a rejection record. Pass `--review-findings` with the full current verdict on every terminal
round, and verify with a YAML parse afterwards.

**Approving a story rejected twice: name the standard it was held to.** Rounds 1 and 2 were
rejected because the dossier told its reader something FALSE. Three independent passes (mine
from the vendored source, comment-analyzer, rule-checker's FILE/LINE/EXTENT sweep) could not
find a false statement in round 3, and that is the bar clearing — not "the findings got smaller".
The residue was an omission (voice 0), a test's failure message, a distance error, and a
disclosed guard gap. The decisive argument against a fourth round was measured, not felt: this
review proved the dossier's CONCLUSIONS are unguarded English (both headline fixes revert with
1087/1087 green), so another prose round could only be verified by another careful reading. Route
the finding to where it becomes CODE — cp6-2 wires `playerDeath` on a different channel from the
kills, and there a test can finally pin it.

**Verify what the specialists hand you, in both directions.** `reviewer-preflight` reported that
Dev's "orchestrator 389/390" claim was "factually incorrect" because it measured 390/390. It had
read the Dev Assessment and not the Delivery Finding four lines below, where Dev had ALREADY
recorded the fix (`4172a95`, landed six minutes after their measurement) and the 390/390. A
subagent's contradiction of an author is a claim with a timestamp too — resolve it against the
whole record before putting it in the permanent one, and retract loudly when it was yours.
