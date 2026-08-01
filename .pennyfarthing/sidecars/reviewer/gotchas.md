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
